-- ============================================
-- Module Form-Chariot : Rapport sur l'état des chariots
-- ============================================

-- Référentiel des chariots (saisie libre + mémoire)
CREATE TABLE chariots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT UNIQUE NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chariots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chariots_all" ON chariots FOR ALL USING (true);

-- En-tête de rapport (un par date/heure)
CREATE TABLE rapports_chariots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_rapport TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rapports_chariots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rapports_chariots_all" ON rapports_chariots FOR ALL USING (true);

-- Lignes du rapport (une par chariot)
CREATE TABLE rapport_chariot_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports_chariots(id) ON DELETE CASCADE,
  chariot_id UUID NOT NULL REFERENCES chariots(id),
  etat TEXT CHECK (etat IN ('marche', 'arret')),
  compteur_horaire NUMERIC,
  horaire_prochaine_vidange NUMERIC,
  ecart NUMERIC GENERATED ALWAYS AS (horaire_prochaine_vidange - compteur_horaire) STORED,
  numero_di TEXT,
  gasoil NUMERIC,
  temps_arret NUMERIC,
  numero_permis TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rapport_chariot_lignes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rapport_chariot_lignes_all" ON rapport_chariot_lignes FOR ALL USING (true);

-- Anomalies par ligne (0 à N par ligne)
CREATE TABLE rapport_chariot_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_id UUID NOT NULL REFERENCES rapport_chariot_lignes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rapport_chariot_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rapport_chariot_anomalies_all" ON rapport_chariot_anomalies FOR ALL USING (true);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_rapport_chariot_lignes_rapport ON rapport_chariot_lignes(rapport_id);
CREATE INDEX idx_rapport_chariot_anomalies_ligne ON rapport_chariot_anomalies(ligne_id);
CREATE INDEX idx_rapports_chariots_date ON rapports_chariots(date_rapport DESC);
