-- Create lignes_production table to store detailed production line data
CREATE TABLE public.lignes_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.production_shifts(id) ON DELETE CASCADE,
  numero_ligne integer NOT NULL,
  chef_ligne_id uuid REFERENCES public.chefs_ligne(id),
  
  -- Recharges par client (B6 et B12)
  recharges_petro_b6 integer DEFAULT 0,
  recharges_petro_b12 integer DEFAULT 0,
  recharges_total_b6 integer DEFAULT 0,
  recharges_total_b12 integer DEFAULT 0,
  recharges_vivo_b6 integer DEFAULT 0,
  recharges_vivo_b12 integer DEFAULT 0,
  
  -- Consignes par client (B6 et B12)
  consignes_petro_b6 integer DEFAULT 0,
  consignes_petro_b12 integer DEFAULT 0,
  consignes_total_b6 integer DEFAULT 0,
  consignes_total_b12 integer DEFAULT 0,
  consignes_vivo_b6 integer DEFAULT 0,
  consignes_vivo_b12 integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lignes_production ENABLE ROW LEVEL SECURITY;

-- RLS Policy for public access
CREATE POLICY "Allow all operations on lignes_production"
  ON public.lignes_production
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_lignes_production_shift_id ON public.lignes_production(shift_id);
CREATE INDEX idx_lignes_production_chef_ligne_id ON public.lignes_production(chef_ligne_id);

-- Trigger for updated_at
CREATE TRIGGER update_lignes_production_updated_at
  BEFORE UPDATE ON public.lignes_production
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();