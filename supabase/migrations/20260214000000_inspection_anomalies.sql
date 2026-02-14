-- ============================================
-- Table de suivi des anomalies
-- Ouverte quand un equipement est DEGRADE/HORS_SERVICE
-- Fermee quand il redevient OPERATIONNEL
-- ============================================

CREATE TYPE statut_anomalie AS ENUM ('OUVERTE', 'RESOLUE');

CREATE TABLE inspection_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipement_id UUID NOT NULL REFERENCES inspection_equipements(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES inspection_zones(id) ON DELETE CASCADE,
  sous_zone_id UUID REFERENCES inspection_sous_zones(id) ON DELETE CASCADE,

  -- Ouverture
  ronde_ouverture_id UUID NOT NULL REFERENCES inspection_rondes(id) ON DELETE CASCADE,
  semaine_ouverture TEXT NOT NULL,
  date_ouverture TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut_equipement_initial statut_equipement NOT NULL,
  commentaire_initial TEXT,
  urgent BOOLEAN DEFAULT false,

  -- Cloture (nullable = encore ouverte)
  ronde_cloture_id UUID REFERENCES inspection_rondes(id) ON DELETE SET NULL,
  semaine_cloture TEXT,
  date_cloture TIMESTAMPTZ,

  -- Suivi
  statut statut_anomalie NOT NULL DEFAULT 'OUVERTE',
  duree_jours INT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_insp_anomalies_equipement ON inspection_anomalies(equipement_id);
CREATE INDEX idx_insp_anomalies_statut ON inspection_anomalies(statut);
CREATE INDEX idx_insp_anomalies_ouverture ON inspection_anomalies(ronde_ouverture_id);
CREATE INDEX idx_insp_anomalies_zone ON inspection_anomalies(zone_id);

-- RLS
ALTER TABLE inspection_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inspection_anomalies_all" ON inspection_anomalies FOR ALL USING (true);

-- Trigger updated_at
CREATE TRIGGER trig_insp_anomalies_updated
  BEFORE UPDATE ON inspection_anomalies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
