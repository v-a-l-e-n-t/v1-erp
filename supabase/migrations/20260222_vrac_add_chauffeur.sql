-- Migration: Ajout colonne nom_chauffeur aux demandes de chargement VRAC

ALTER TABLE vrac_demandes_chargement ADD COLUMN IF NOT EXISTS nom_chauffeur TEXT;

-- Index pour recherche par chauffeur
CREATE INDEX IF NOT EXISTS idx_vrac_demandes_chauffeur
  ON vrac_demandes_chargement(nom_chauffeur) WHERE nom_chauffeur IS NOT NULL;
