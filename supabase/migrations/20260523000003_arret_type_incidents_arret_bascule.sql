-- =============================================================================
-- Ajoute deux nouveaux motifs d'arret :
--   - 'incidents'    (categorie Securite, COMPTABILISE dans temps d'arret)
--   - 'arret_bascule' (categorie Pannes, INDICATEUR SEUL, non additionne aux
--                      temps d'arret. Le front exclut ce motif de la somme
--                      temps_arret_ligne_minutes.)
--
-- Note PostgreSQL : ALTER TYPE ... ADD VALUE ne peut pas etre execute dans une
-- transaction. Les statements ci-dessous doivent etre joues en mode autocommit
-- (ce qui est le cas par defaut depuis le SQL editor Supabase).
-- =============================================================================

ALTER TYPE public.arret_type ADD VALUE IF NOT EXISTS 'incidents';
ALTER TYPE public.arret_type ADD VALUE IF NOT EXISTS 'arret_bascule';

-- Verification :
-- SELECT enumlabel FROM pg_enum
--   JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
--  WHERE pg_type.typname = 'arret_type'
--  ORDER BY enumsortorder;
