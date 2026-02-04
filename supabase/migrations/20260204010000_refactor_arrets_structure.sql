-- Ajouter la colonne arret_shift_cumul dans production_shifts
ALTER TABLE public.production_shifts
ADD COLUMN arret_shift_cumul integer DEFAULT 0;

COMMENT ON COLUMN public.production_shifts.arret_shift_cumul IS 'Temps d''arrêt cumulé total du shift en minutes (somme de tous les temps d''arrêt des lignes)';

-- Modifier la table arrets_production pour ne garder que les informations descriptives
-- 1. Ajouter la nouvelle colonne numero_ligne
ALTER TABLE public.arrets_production
ADD COLUMN numero_ligne integer;

COMMENT ON COLUMN public.arrets_production.numero_ligne IS 'Numéro de la ligne concernée par cet arrêt (1-5)';

-- 2. Supprimer les colonnes de durée (maintenant stockées dans lignes_production)
ALTER TABLE public.arrets_production
DROP COLUMN IF EXISTS heure_debut,
DROP COLUMN IF EXISTS heure_fin,
DROP COLUMN IF EXISTS duree_minutes,
DROP COLUMN IF EXISTS lignes_concernees;

-- 3. Rendre type_arret obligatoire si ce n'est pas déjà le cas
ALTER TABLE public.arrets_production
ALTER COLUMN type_arret SET NOT NULL;
