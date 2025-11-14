-- Supprimer la contrainte de clé étrangère pour permettre de sélectionner
-- à la fois des chefs de quart et des chefs de ligne comme chef de quart
ALTER TABLE public.production_shifts 
DROP CONSTRAINT IF EXISTS production_shifts_chef_quart_id_fkey;

-- Rendre la colonne nullable pour plus de flexibilité
ALTER TABLE public.production_shifts 
ALTER COLUMN chef_quart_id DROP NOT NULL;