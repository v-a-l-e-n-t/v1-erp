-- Ajouter le champ chef_quart_id dans la table production_shifts
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS chef_quart_id uuid REFERENCES public.chefs_quart(id);