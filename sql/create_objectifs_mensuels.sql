-- Table pour stocker les objectifs mensuels de réceptions
CREATE TABLE IF NOT EXISTS objectifs_mensuels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mois TEXT NOT NULL UNIQUE, -- Format: "2024-12"
  objectif_receptions NUMERIC NOT NULL, -- Objectif en Kg
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par mois
CREATE INDEX IF NOT EXISTS idx_objectifs_mensuels_mois ON objectifs_mensuels(mois);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_objectifs_mensuels_updated_at ON objectifs_mensuels;
CREATE TRIGGER update_objectifs_mensuels_updated_at
    BEFORE UPDATE ON objectifs_mensuels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE objectifs_mensuels ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre toutes les opérations (à ajuster selon vos besoins de sécurité)
CREATE POLICY "Enable all access for authenticated users" ON objectifs_mensuels
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
