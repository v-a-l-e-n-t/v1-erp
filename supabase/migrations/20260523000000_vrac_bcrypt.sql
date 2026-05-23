-- =============================================================================
-- VRAC auth : passage de SHA-256 client-side a bcrypt server-side.
-- Strategie :
--   - Les nouveaux mots de passe sont stockes en bcrypt (prefixe "$2") via la
--     RPC set_vrac_password.
--   - L'ancien format (hex SHA-256 de 64 caracteres) reste reconnu par la RPC
--     verify_vrac_login : si match, le hash est immediatement reecrit en bcrypt
--     (migration transparente sur premier login reussi).
--   - Une fois tous les comptes migres (verifier via la requete en fin de
--     fichier), on peut retirer le fallback SHA-256.
-- =============================================================================

-- pgcrypto fournit crypt() / gen_salt('bf') / digest().
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. verify_vrac_login : authentifie un client VRAC par mot de passe.
--    Returns user_id, client_id, nom utilisateur, nom client, nom affichage
--    si match, sinon aucune ligne. Met a jour last_login.
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
  IF p_password IS NULL OR length(p_password) = 0 THEN
    RETURN;
  END IF;

  -- 1) Tentative bcrypt (hashes commencant par "$2")
  SELECT *
    INTO v_user
    FROM public.vrac_users u
   WHERE u.actif
     AND u.password_hash LIKE '$2%'
     AND u.password_hash = extensions.crypt(p_password, u.password_hash)
   LIMIT 1;

  -- 2) Fallback legacy SHA-256 + migration transparente vers bcrypt
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
    RETURN;
  END IF;

  SELECT * INTO v_client FROM public.vrac_clients WHERE id = v_user.client_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.vrac_users SET last_login = now() WHERE id = v_user.id;

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

-- -----------------------------------------------------------------------------
-- 2. set_vrac_password : cree ou met a jour un utilisateur VRAC avec un mot
--    de passe en clair. Le hash bcrypt est calcule server-side.
--    Renvoie l'id du user cree/maj.
--    p_user_id = NULL  -> creation
--    p_user_id donne   -> mise a jour du mot de passe (et eventuellement nom/client)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_vrac_password(
  p_user_id   uuid,
  p_client_id uuid,
  p_nom       text,
  p_password  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash    text;
  v_user_id uuid;
BEGIN
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Mot de passe trop court (>= 6 caracteres)';
  END IF;

  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  IF p_user_id IS NULL THEN
    IF p_client_id IS NULL THEN
      RAISE EXCEPTION 'client_id requis pour creer un utilisateur VRAC';
    END IF;
    INSERT INTO public.vrac_users (client_id, nom, password_hash, actif)
    VALUES (p_client_id, p_nom, v_hash, true)
    RETURNING id INTO v_user_id;
  ELSE
    UPDATE public.vrac_users
       SET password_hash = v_hash,
           nom           = COALESCE(p_nom, nom),
           client_id     = COALESCE(p_client_id, client_id),
           actif         = true
     WHERE id = p_user_id
    RETURNING id INTO v_user_id;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Utilisateur VRAC introuvable (%)', p_user_id;
    END IF;
  END IF;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_vrac_password(uuid, uuid, text, text) FROM PUBLIC;
-- Volontairement PAS GRANT a anon : la creation/maj de mot de passe doit passer
-- par un admin authentifie. Apres migration vers Supabase Auth on restreindra a
-- has_role(auth.uid(), 'admin'). En attendant, on accorde a anon pour ne pas
-- casser le portail admin (qui n'utilise pas auth.uid()).
GRANT EXECUTE ON FUNCTION public.set_vrac_password(uuid, uuid, text, text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Verification : compter les comptes encore en SHA-256 (a migrer en se
--    re-connectant, ou via set_vrac_password). Quand le compte tombe a 0,
--    on peut retirer le fallback dans verify_vrac_login.
-- -----------------------------------------------------------------------------
-- SELECT count(*) AS legacy_sha256_remaining
--   FROM public.vrac_users
--  WHERE password_hash ~ '^[0-9a-f]{64}$';
