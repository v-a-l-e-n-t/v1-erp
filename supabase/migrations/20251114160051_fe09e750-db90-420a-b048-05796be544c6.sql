-- Supprimer la colonne ligne obsolète de production_shifts
ALTER TABLE public.production_shifts 
DROP COLUMN ligne;