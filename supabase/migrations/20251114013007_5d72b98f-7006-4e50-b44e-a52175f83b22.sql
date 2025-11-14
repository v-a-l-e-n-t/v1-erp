-- Rendre user_id nullable dans production_shifts
ALTER TABLE public.production_shifts 
ALTER COLUMN user_id DROP NOT NULL;