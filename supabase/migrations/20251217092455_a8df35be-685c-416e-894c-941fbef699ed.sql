-- Fix vrac_clients table: ensure all columns exist and are correct
DO $$ 
BEGIN
  -- Add any missing columns to vrac_clients if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vrac_clients' AND column_name = 'nom') THEN
    ALTER TABLE public.vrac_clients ADD COLUMN nom text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vrac_clients' AND column_name = 'nom_affichage') THEN
    ALTER TABLE public.vrac_clients ADD COLUMN nom_affichage text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vrac_clients' AND column_name = 'champ_sortie_vrac') THEN
    ALTER TABLE public.vrac_clients ADD COLUMN champ_sortie_vrac text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vrac_clients' AND column_name = 'actif') THEN
    ALTER TABLE public.vrac_clients ADD COLUMN actif boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.vrac_clients ENABLE ROW LEVEL SECURITY;

-- Recreate policies (drop if exists, then create)
DROP POLICY IF EXISTS "Allow public read on vrac_clients" ON public.vrac_clients;
DROP POLICY IF EXISTS "Allow admin write on vrac_clients" ON public.vrac_clients;

CREATE POLICY "Allow public read on vrac_clients" 
ON public.vrac_clients 
FOR SELECT 
USING (true);

CREATE POLICY "Allow admin write on vrac_clients" 
ON public.vrac_clients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));