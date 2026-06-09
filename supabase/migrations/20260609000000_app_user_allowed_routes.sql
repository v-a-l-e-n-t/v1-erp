-- =============================================================================
-- Permissions par route pour les utilisateurs admin (app_users).
--   - allowed_routes NULL/vide  -> accès complet (comportement historique).
--   - allowed_routes = ARRAY[...] -> utilisateur cloisonné à ces routes.
-- verify_login renvoie désormais allowed_routes, transporté dans la session
-- côté front (cf src/lib/routeAccess.ts + ProtectedRoute).
--
-- NB : ce fichier ne contient AUCUN code d'accès en clair. La création d'un
-- utilisateur (avec son code) se fait à part, hors dépôt (SQL editor).
-- =============================================================================

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS allowed_routes text[];

-- Le type de retour change -> on doit DROP avant de recréer.
DROP FUNCTION IF EXISTS public.verify_login(text);

CREATE FUNCTION public.verify_login(p_code text)
RETURNS TABLE (user_id uuid, full_name text, logged_at timestamptz, allowed_routes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_user public.app_users%ROWTYPE;
BEGIN
    -- Rate limit (cf migration 20260523000001)
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
       SET last_login_at = now(), updated_at = now()
     WHERE id = v_user.id;

    INSERT INTO public.app_login_events (user_id, user_name)
    VALUES (v_user.id, v_user.full_name);

    PERFORM public.log_login_attempt('admin', true);

    user_id        := v_user.id;
    full_name      := v_user.full_name;
    logged_at      := now();
    allowed_routes := v_user.allowed_routes;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_login(text) TO anon, authenticated;
