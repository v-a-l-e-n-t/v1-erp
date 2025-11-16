-- Add nombre_agents column to lignes_production table
ALTER TABLE public.lignes_production 
ADD COLUMN nombre_agents integer DEFAULT 0;