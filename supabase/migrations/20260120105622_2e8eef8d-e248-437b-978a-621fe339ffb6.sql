-- Migration: Update sigma_stock table structure
-- Description: Simplifier sigma_stock sans bottle_origin, UNIQUE(client, bottle_type)

-- 1. Drop existing sigma_stock table and recreate with new structure
DROP TABLE IF EXISTS public.sigma_stock CASCADE;

-- 2. Recréer la table sigma_stock avec la nouvelle structure
CREATE TABLE public.sigma_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client text NOT NULL CHECK (client IN ('PI', 'TOTAL', 'VIVO')),
  bottle_type text NOT NULL CHECK (bottle_type IN ('B6', 'B12', 'B28', 'B38')),
  initial_stock integer NOT NULL DEFAULT 0 CHECK (initial_stock >= 0),
  current_stock integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_modified_by text,
  UNIQUE(client, bottle_type)
);

-- 3. Activer RLS sur sigma_stock
ALTER TABLE public.sigma_stock ENABLE ROW LEVEL SECURITY;

-- 4. Politique permissive pour sigma_stock
CREATE POLICY "Enable all access for all users" ON public.sigma_stock
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Index pour sigma_stock
CREATE INDEX IF NOT EXISTS idx_sigma_stock_client ON public.sigma_stock(client);
CREATE INDEX IF NOT EXISTS idx_sigma_stock_bottle_type ON public.sigma_stock(bottle_type);

-- 6. Trigger pour updated_at sur sigma_stock
CREATE OR REPLACE FUNCTION update_sigma_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sigma_stock_updated_at ON public.sigma_stock;
CREATE TRIGGER update_sigma_stock_updated_at
  BEFORE UPDATE ON public.sigma_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_sigma_stock_updated_at();