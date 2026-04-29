-- =============================================================================
-- App authentication (3 admin users), login tracking, sphere stock history
-- Generated 2026-04-29
-- =============================================================================

-- pgcrypto provides crypt() / gen_salt('bf') for bcrypt hashing.
-- On Supabase pgcrypto lives in the "extensions" schema, not in public.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. app_users : the 3 internal operators (later N) authenticated by a code.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name    text NOT NULL,
    code_hash    text NOT NULL,           -- bcrypt hash, NEVER the cleartext code
    is_active    boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- The table is intentionally NOT readable from the anon role.
-- All login traffic goes through the verify_login() SECURITY DEFINER function.
DROP POLICY IF EXISTS app_users_no_select ON public.app_users;
-- (no SELECT policy => no row visible from PostgREST)

-- -----------------------------------------------------------------------------
-- 2. app_login_events : timestamp + user for every successful login.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_login_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    user_name   text NOT NULL,            -- snapshot for historical traceability
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_login_events_occurred_at_idx
    ON public.app_login_events (occurred_at DESC);

ALTER TABLE public.app_login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_login_events_read_anon ON public.app_login_events;
CREATE POLICY app_login_events_read_anon ON public.app_login_events
    FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- 3. stock_sphere_sessions : one row per "Enregistrer" click.
--    Contains the inputs of the 3 spheres + the computed global summary.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_sphere_sessions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    user_name           text NOT NULL,
    spheres             jsonb NOT NULL,   -- { S01: {...inputs, ...result}, S02: ..., S03: ... }
    stock_jour_kg       numeric,
    stock_exploitable_kg numeric,
    creux_total_kg      numeric,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_sphere_sessions_created_at_idx
    ON public.stock_sphere_sessions (created_at DESC);

ALTER TABLE public.stock_sphere_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_sphere_sessions_read_anon ON public.stock_sphere_sessions;
CREATE POLICY stock_sphere_sessions_read_anon ON public.stock_sphere_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS stock_sphere_sessions_insert_anon ON public.stock_sphere_sessions;
CREATE POLICY stock_sphere_sessions_insert_anon ON public.stock_sphere_sessions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS stock_sphere_sessions_update_anon ON public.stock_sphere_sessions;
CREATE POLICY stock_sphere_sessions_update_anon ON public.stock_sphere_sessions
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS stock_sphere_sessions_delete_anon ON public.stock_sphere_sessions;
CREATE POLICY stock_sphere_sessions_delete_anon ON public.stock_sphere_sessions
    FOR DELETE USING (true);
-- NOTE: insert is open because the front-end signs in via verify_login() and
-- carries the user_id/user_name explicitly. RLS hardening can come later when
-- we move to Supabase Auth proper.

-- -----------------------------------------------------------------------------
-- 4. verify_login(code) : RPC used by the front to authenticate.
--    Returns one row with the user data if the code matches an active user,
--    inserts a row in app_login_events, updates last_login_at. Otherwise no row.
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
    IF p_code IS NULL OR length(p_code) = 0 THEN
        RETURN;
    END IF;

    SELECT *
      INTO v_user
      FROM public.app_users u
     WHERE u.is_active
       AND u.code_hash = extensions.crypt(p_code, u.code_hash)
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.app_users
       SET last_login_at = now(),
           updated_at    = now()
     WHERE id = v_user.id;

    INSERT INTO public.app_login_events (user_id, user_name)
    VALUES (v_user.id, v_user.full_name);

    user_id   := v_user.id;
    full_name := v_user.full_name;
    logged_at := now();
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Seed the 3 existing operators with bcrypt-hashed codes.
--    Codes lifted verbatim from the previous hardcoded constants:
--      @k@2626  -> JEAN PASCAL TANO
--      VAL@2026 -> VALENT SANLE
--      bab@2626 -> BABA JACQUES
--    Idempotent : noop if a row with the same full_name already exists.
-- -----------------------------------------------------------------------------
INSERT INTO public.app_users (full_name, code_hash)
SELECT 'JEAN PASCAL TANO', extensions.crypt('@k@2626',  extensions.gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE full_name = 'JEAN PASCAL TANO');

INSERT INTO public.app_users (full_name, code_hash)
SELECT 'VALENT SANLE',     extensions.crypt('VAL@2026', extensions.gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE full_name = 'VALENT SANLE');

INSERT INTO public.app_users (full_name, code_hash)
SELECT 'BABA JACQUES',     extensions.crypt('bab@2626', extensions.gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE full_name = 'BABA JACQUES');

-- =============================================================================
-- End of migration
-- =============================================================================
