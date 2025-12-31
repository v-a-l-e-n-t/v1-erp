-- Migration: Table des réceptions par client
-- Date: 2025-01-01

CREATE TABLE IF NOT EXISTS receptions_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  client TEXT NOT NULL,
  poids_kg NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_receptions_clients_date ON receptions_clients(date);
CREATE INDEX IF NOT EXISTS idx_receptions_clients_client ON receptions_clients(client);
CREATE INDEX IF NOT EXISTS idx_receptions_clients_date_client ON receptions_clients(date, client);

-- RLS (Row Level Security)
ALTER TABLE receptions_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique
CREATE POLICY "Allow public read on receptions_clients"
ON receptions_clients FOR SELECT
USING (true);

-- Policy: Insertion/Modification pour les admins
CREATE POLICY "Allow admin write on receptions_clients"
ON receptions_clients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));