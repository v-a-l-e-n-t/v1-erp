-- Migration: Refonte VRAC - Ajout statut refusee et motif

-- 1. Ajouter 'refusee' au CHECK constraint
ALTER TABLE vrac_demandes_chargement DROP CONSTRAINT IF EXISTS vrac_demandes_chargement_statut_check;
ALTER TABLE vrac_demandes_chargement ADD CONSTRAINT vrac_demandes_chargement_statut_check
  CHECK (statut IN ('en_attente', 'charge', 'refusee'));

-- 2. Colonnes pour le refus
ALTER TABLE vrac_demandes_chargement ADD COLUMN IF NOT EXISTS motif_refus TEXT;
ALTER TABLE vrac_demandes_chargement ADD COLUMN IF NOT EXISTS refused_by TEXT;
ALTER TABLE vrac_demandes_chargement ADD COLUMN IF NOT EXISTS refused_at TIMESTAMPTZ;

-- 3. Index pour les requêtes sur le nouveau statut
CREATE INDEX IF NOT EXISTS idx_vrac_demandes_refusee
  ON vrac_demandes_chargement(statut) WHERE statut = 'refusee';
