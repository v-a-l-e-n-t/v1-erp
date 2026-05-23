-- =============================================================================
-- Rate limiting sur verify_login (admin) et verify_vrac_login (VRAC).
--
-- Strategie :
--   - Table login_attempts journalise chaque tentative (IP + scope + succes/echec).
--   - check_rate_limit() compte les echecs des 15 dernieres minutes pour
--     l'IP courante et le scope. Au-dela de MAX_FAILED_ATTEMPTS, RAISE EXCEPTION
--     avec message generique (pas d'info leak).
--   - Les RPC verify_login et verify_vrac_login appellent check_rate_limit en
--     tete, puis journalisent leur tentative.
--   - Cleanup automatique des entrees > 1h au passage (best-effort).
--
-- IP : recuperee via request.headers postgrest. Fallback sur "unknown" si absente
-- (suffisant pour ne pas vide-bypasser, mais limite les bots tres distribues).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id          bigserial PRIMARY KEY,
    scope       text        NOT NULL CHECK (scope IN ('admin', 'vrac')),
    ip_hash     text        NOT NULL,  -- SHA-256 hex de l'IP (RGPD-friendly)
    succeeded   boolean     NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_lookup_idx
    ON public.login_attempts (scope, ip_hash, occurred_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- Pas de policy SELECT/INSERT/UPDATE/DELETE pour anon : table inaccessible
-- depuis PostgREST. Seules les RPC SECURITY DEFINER ci-dessous y ecrivent.

-- -----------------------------------------------------------------------------
-- get_request_ip_hash() : extrait l'IP de la requete PostgREST et la hash.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_request_ip_hash()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_headers    jsonb;
    v_ip         text;
BEGIN
    BEGIN
        v_headers := current_setting('request.headers', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
    END;

    IF v_headers IS NULL THEN
        RETURN encode(extensions.digest('unknown', 'sha256'), 'hex');
    END IF;

    -- Ordre de preference : cf-connecting-ip > x-real-ip > x-forwarded-for > x-client-ip
    v_ip := COALESCE(
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-real-ip',
        split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1),
        v_headers->>'x-client-ip',
        'unknown'
    );

    v_ip := trim(v_ip);
    IF v_ip = '' THEN
        v_ip := 'unknown';
    END IF;

    RETURN encode(extensions.digest(v_ip, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.get_request_ip_hash() FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- check_rate_limit(scope) : leve une exception si > MAX_FAILED_ATTEMPTS echecs
-- pour cette IP et ce scope dans les WINDOW_MINUTES dernieres minutes.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_scope text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    MAX_FAILED_ATTEMPTS constant int := 8;
    WINDOW_MINUTES      constant int := 15;
    v_ip_hash text;
    v_count   int;
BEGIN
    v_ip_hash := public.get_request_ip_hash();

    SELECT count(*)
      INTO v_count
      FROM public.login_attempts
     WHERE scope       = p_scope
       AND ip_hash     = v_ip_hash
       AND succeeded   = false
       AND occurred_at > now() - make_interval(mins => WINDOW_MINUTES);

    IF v_count >= MAX_FAILED_ATTEMPTS THEN
        -- Message generique : pas d'info sur le nombre de tentatives restantes
        -- ou la duree du blocage (evite de calibrer une attaque).
        RAISE EXCEPTION 'Trop de tentatives. Reessayez plus tard.'
            USING ERRCODE = '42501';  -- insufficient_privilege
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- log_login_attempt(scope, succeeded) : insere la tentative + best-effort
-- cleanup des entrees > 1h pour ce scope/ip.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_scope text, p_succeeded boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_ip_hash text;
BEGIN
    v_ip_hash := public.get_request_ip_hash();

    INSERT INTO public.login_attempts (scope, ip_hash, succeeded)
    VALUES (p_scope, v_ip_hash, p_succeeded);

    -- Cleanup probabiliste (1 fois sur 50) pour eviter la croissance illimitee
    -- sans pourrir chaque login avec un DELETE plein.
    IF (random() < 0.02) THEN
        DELETE FROM public.login_attempts
         WHERE occurred_at < now() - interval '1 hour';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_login_attempt(text, boolean) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- Patch verify_login : rate limit + journalisation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_login(p_code text)
RETURNS TABLE (user_id uuid, full_name text, logged_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user public.app_users%ROWTYPE;
BEGIN
    -- 1) Rate limit (leve une exception si trop d'echecs recents)
    PERFORM public.check_rate_limit('admin');

    IF p_code IS NULL OR length(p_code) = 0 THEN
        PERFORM public.log_login_attempt('admin', false);
        RETURN;
    END IF;

    SELECT *
      INTO v_user
      FROM public.app_users u
     WHERE u.is_active
       AND u.code_hash = extensions.crypt(p_code, u.code_hash)
     LIMIT 1;

    IF NOT FOUND THEN
        PERFORM public.log_login_attempt('admin', false);
        RETURN;
    END IF;

    UPDATE public.app_users
       SET last_login_at = now(),
           updated_at    = now()
     WHERE id = v_user.id;

    INSERT INTO public.app_login_events (user_id, user_name)
    VALUES (v_user.id, v_user.full_name);

    PERFORM public.log_login_attempt('admin', true);

    user_id   := v_user.id;
    full_name := v_user.full_name;
    logged_at := now();
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Patch verify_vrac_login : rate limit + journalisation.
-- (Replique de la version livree dans 20260523000000_vrac_bcrypt.sql + le RL.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_vrac_login(p_password text)
RETURNS TABLE (
  user_id              uuid,
  client_id            uuid,
  user_nom             text,
  client_nom           text,
  client_nom_affichage text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user      public.vrac_users%ROWTYPE;
  v_client    public.vrac_clients%ROWTYPE;
  v_sha256    text;
  v_legacy_re text := '^[0-9a-f]{64}$';
BEGIN
  -- 1) Rate limit
  PERFORM public.check_rate_limit('vrac');

  IF p_password IS NULL OR length(p_password) = 0 THEN
    PERFORM public.log_login_attempt('vrac', false);
    RETURN;
  END IF;

  -- 2) Tentative bcrypt
  SELECT *
    INTO v_user
    FROM public.vrac_users u
   WHERE u.actif
     AND u.password_hash LIKE '$2%'
     AND u.password_hash = extensions.crypt(p_password, u.password_hash)
   LIMIT 1;

  -- 3) Fallback legacy SHA-256 + auto-migration
  IF NOT FOUND THEN
    v_sha256 := encode(extensions.digest(p_password, 'sha256'), 'hex');

    SELECT *
      INTO v_user
      FROM public.vrac_users u
     WHERE u.actif
       AND u.password_hash ~ v_legacy_re
       AND u.password_hash = v_sha256
     LIMIT 1;

    IF FOUND THEN
      UPDATE public.vrac_users
         SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10))
       WHERE id = v_user.id;
    END IF;
  END IF;

  IF NOT FOUND THEN
    PERFORM public.log_login_attempt('vrac', false);
    RETURN;
  END IF;

  SELECT * INTO v_client FROM public.vrac_clients WHERE id = v_user.client_id;
  IF NOT FOUND THEN
    PERFORM public.log_login_attempt('vrac', false);
    RETURN;
  END IF;

  UPDATE public.vrac_users SET last_login = now() WHERE id = v_user.id;
  PERFORM public.log_login_attempt('vrac', true);

  user_id              := v_user.id;
  client_id            := v_user.client_id;
  user_nom             := v_user.nom;
  client_nom           := v_client.nom;
  client_nom_affichage := v_client.nom_affichage;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_vrac_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_vrac_login(text) TO anon, authenticated;

-- =============================================================================
-- Verification post-migration :
--   SELECT scope, count(*) FROM public.login_attempts GROUP BY scope;
--   SELECT * FROM public.login_attempts ORDER BY occurred_at DESC LIMIT 20;
-- =============================================================================
