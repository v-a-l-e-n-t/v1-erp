-- Rotation manuelle des codes admin (alternative au script Node).
-- A executer dans Supabase SQL Editor.
--
-- Avant de lancer :
--   1. Remplacer 'NOUVEAU_CODE_JEAN', 'NOUVEAU_CODE_VAL', 'NOUVEAU_CODE_BAB' par
--      3 codes longs et aleatoires (>= 12 caracteres, alphanumeriques).
--   2. Lancer le bloc ci-dessous.
--   3. Communiquer les codes hors-bande puis effacer cet onglet du SQL editor
--      (les requetes sont conservees dans l'historique du navigateur).
--
-- ATTENTION : les anciens codes (@k@2626, VAL@2026, bab@2626) restent valides
-- TANT QUE cette migration n'a pas ete executee.

BEGIN;

UPDATE public.app_users
   SET code_hash = extensions.crypt('NOUVEAU_CODE_JEAN', extensions.gen_salt('bf', 10)),
       updated_at = now()
 WHERE full_name = 'JEAN PASCAL TANO';

UPDATE public.app_users
   SET code_hash = extensions.crypt('NOUVEAU_CODE_VAL', extensions.gen_salt('bf', 10)),
       updated_at = now()
 WHERE full_name = 'VALENT SANLE';

UPDATE public.app_users
   SET code_hash = extensions.crypt('NOUVEAU_CODE_BAB', extensions.gen_salt('bf', 10)),
       updated_at = now()
 WHERE full_name = 'BABA JACQUES';

-- Verification : doit retourner 3 lignes avec updated_at = maintenant
SELECT full_name, updated_at FROM public.app_users WHERE is_active ORDER BY full_name;

COMMIT;
