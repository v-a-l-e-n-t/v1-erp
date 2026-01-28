-- Table pour les bilans matière GPL - Site de Bouaké
CREATE TABLE bilan_bke_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  
  -- Stock initial (Bac stockage au lieu de Sphères, pas de Réservoirs)
  bac_stockage_initial NUMERIC(20, 3) NOT NULL DEFAULT 0,
  bouteilles_initial NUMERIC(20, 3) NOT NULL DEFAULT 0,
  stock_initial NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  -- Réceptions (client au lieu de navire)
  receptions JSONB DEFAULT '[]'::jsonb,
  reception_gpl NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  -- PAS de sorties vrac à Bouaké
  
  -- Sorties conditionnées
  sorties_conditionnees_petro_ivoire NUMERIC(20, 3) NOT NULL DEFAULT 0,
  sorties_conditionnees_vivo_energies NUMERIC(20, 3) NOT NULL DEFAULT 0,
  sorties_conditionnees_total_energies NUMERIC(20, 3) NOT NULL DEFAULT 0,
  sorties_conditionnees NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  -- Retour marché
  fuyardes_petro_ivoire NUMERIC(20, 3) NOT NULL DEFAULT 0,
  fuyardes_vivo_energies NUMERIC(20, 3) NOT NULL DEFAULT 0,
  fuyardes_total_energies NUMERIC(20, 3) NOT NULL DEFAULT 0,
  fuyardes NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  cumul_sorties NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  -- Stock final (Bac stockage au lieu de Sphères, pas de Réservoirs)
  bac_stockage_final NUMERIC(20, 3) NOT NULL DEFAULT 0,
  bouteilles_final NUMERIC(20, 3) NOT NULL DEFAULT 0,
  stock_final NUMERIC(20, 3) NOT NULL DEFAULT 0,
  
  -- Calculs
  stock_theorique NUMERIC(20, 3) NOT NULL DEFAULT 0,
  bilan NUMERIC(20, 3) NOT NULL DEFAULT 0,
  nature VARCHAR(10) NOT NULL DEFAULT 'Neutre',
  
  -- PAS d'agents à Bouaké
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by VARCHAR(255),
  last_modified_at TIMESTAMPTZ
);

-- Index pour les recherches par date
CREATE INDEX idx_bilan_bke_entries_date ON bilan_bke_entries(date DESC);

-- RLS (Row Level Security)
ALTER TABLE bilan_bke_entries ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on bilan_bke_entries" ON bilan_bke_entries
  FOR ALL USING (true) WITH CHECK (true);