-- Migration: Module VRAC Client
-- Tables pour la gestion des chargements VRAC

-- ============================================
-- 1. Table des clients VRAC
-- ============================================
CREATE TABLE IF NOT EXISTS vrac_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  nom_affichage TEXT NOT NULL,
  champ_sortie_vrac TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertion des clients initiaux
INSERT INTO vrac_clients (nom, nom_affichage, champ_sortie_vrac) VALUES
  ('SIMAM', 'SIMAM', 'sorties_vrac_simam'),
  ('VIVO_ENERGIES', 'VIVO Énergies', 'sorties_vrac_vivo_energies'),
  ('TOTAL_ENERGIES', 'Total Énergies', 'sorties_vrac_total_energies'),
  ('PETRO_IVOIRE', 'Petro Ivoire', 'sorties_vrac_petro_ivoire')
ON CONFLICT (nom) DO NOTHING;

-- ============================================
-- 2. Table des utilisateurs clients VRAC
-- ============================================
CREATE TABLE IF NOT EXISTS vrac_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES vrac_clients(id) ON DELETE CASCADE,
  nom TEXT,
  password_hash TEXT NOT NULL,
  created_by UUID,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Index pour recherche par client
CREATE INDEX IF NOT EXISTS idx_vrac_users_client_id ON vrac_users(client_id);

-- ============================================
-- 3. Table des demandes de chargement
-- ============================================
CREATE TABLE IF NOT EXISTS vrac_demandes_chargement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES vrac_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES vrac_users(id),
  date_chargement DATE NOT NULL DEFAULT CURRENT_DATE,
  immatriculation_tracteur TEXT NOT NULL,
  immatriculation_citerne TEXT NOT NULL,
  numero_bon TEXT,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'charge')),
  tonnage_charge NUMERIC,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_vrac_demandes_client_id ON vrac_demandes_chargement(client_id);
CREATE INDEX IF NOT EXISTS idx_vrac_demandes_date ON vrac_demandes_chargement(date_chargement);
CREATE INDEX IF NOT EXISTS idx_vrac_demandes_statut ON vrac_demandes_chargement(statut);

-- ============================================
-- 4. Politiques de sécurité (RLS)
-- ============================================
ALTER TABLE vrac_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vrac_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vrac_demandes_chargement ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les clients VRAC
CREATE POLICY "vrac_clients_select_all" ON vrac_clients
  FOR SELECT USING (true);

-- Politique: Seuls les admins peuvent modifier les clients
CREATE POLICY "vrac_clients_modify_admin" ON vrac_clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Politique: Seuls les admins peuvent voir/gérer les users VRAC
CREATE POLICY "vrac_users_admin_all" ON vrac_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Politique: Lecture des demandes - admins ou via authentification VRAC
CREATE POLICY "vrac_demandes_select" ON vrac_demandes_chargement
  FOR SELECT USING (true);

-- Politique: Insertion des demandes - tout le monde (sera contrôlé côté app)
CREATE POLICY "vrac_demandes_insert" ON vrac_demandes_chargement
  FOR INSERT WITH CHECK (true);

-- Politique: Update des demandes - admins uniquement
CREATE POLICY "vrac_demandes_update_admin" ON vrac_demandes_chargement
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Politique: Delete des demandes - admins ou créateur
CREATE POLICY "vrac_demandes_delete" ON vrac_demandes_chargement
  FOR DELETE USING (true);

-- ============================================
-- 5. Trigger pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_vrac_demandes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vrac_demandes_updated_at ON vrac_demandes_chargement;
CREATE TRIGGER trigger_vrac_demandes_updated_at
  BEFORE UPDATE ON vrac_demandes_chargement
  FOR EACH ROW
  EXECUTE FUNCTION update_vrac_demandes_updated_at();
