-- Rapport header
CREATE TABLE rapports_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_rapport TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes (une par équipement)
CREATE TABLE rapport_maintenance_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports_maintenance(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  equipement TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  disponible INT,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anomalies persistantes (indépendantes des rapports)
CREATE TABLE maintenance_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  equipement TEXT NOT NULL,
  description TEXT DEFAULT '',
  numero_di TEXT DEFAULT '',
  numero_permis TEXT DEFAULT '',
  date_constatation DATE NOT NULL DEFAULT CURRENT_DATE,
  date_resolution DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rapports_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapport_maintenance_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "full_access" ON rapports_maintenance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON rapport_maintenance_lignes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access" ON maintenance_anomalies FOR ALL USING (true) WITH CHECK (true);
