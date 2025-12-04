-- Table pour stocker les objectifs mensuels de réceptions
CREATE TABLE IF NOT EXISTS objectifs_mensuels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mois TEXT NOT NULL UNIQUE,
  objectif_receptions NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par mois
CREATE INDEX IF NOT EXISTS idx_objectifs_mensuels_mois ON objectifs_mensuels(mois);

-- Trigger pour updated_at
CREATE TRIGGER update_objectifs_mensuels_updated_at
    BEFORE UPDATE ON objectifs_mensuels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE objectifs_mensuels ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre toutes les opérations aux utilisateurs authentifiés
CREATE POLICY "Enable all access for authenticated users" ON objectifs_mensuels
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);