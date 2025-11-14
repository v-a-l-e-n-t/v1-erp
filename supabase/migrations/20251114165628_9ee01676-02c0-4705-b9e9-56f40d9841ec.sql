-- Ajouter la colonne ordre_intervention manquante dans arrets_production
ALTER TABLE public.arrets_production 
ADD COLUMN IF NOT EXISTS ordre_intervention text;