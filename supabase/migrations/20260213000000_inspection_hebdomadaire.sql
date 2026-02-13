-- ============================================
-- Module Inspection Hebdomadaire du Depot GPL
-- Migration : tables, enums, indexes, RLS, triggers, seed data
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE statut_equipement AS ENUM ('OPERATIONNEL', 'DEGRADE', 'HORS_SERVICE');
CREATE TYPE statut_ronde AS ENUM ('EN_COURS', 'EN_ATTENTE_VALIDATION', 'VALIDEE');

-- ============================================
-- 1. Table: inspection_zones
-- ============================================
CREATE TABLE inspection_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  poids_kpi NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Table: inspection_sous_zones
-- ============================================
CREATE TABLE inspection_sous_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES inspection_zones(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  libelle TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, nom)
);

-- ============================================
-- 3. Table: inspection_equipements
-- ============================================
CREATE TABLE inspection_equipements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES inspection_zones(id) ON DELETE CASCADE,
  sous_zone_id UUID REFERENCES inspection_sous_zones(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Table: inspection_rondes
-- ============================================
CREATE TABLE inspection_rondes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semaine_iso TEXT NOT NULL UNIQUE,
  statut statut_ronde NOT NULL DEFAULT 'EN_COURS',
  date_debut TIMESTAMPTZ DEFAULT now(),
  date_soumission TIMESTAMPTZ,
  date_validation TIMESTAMPTZ,
  soumis_par TEXT,
  valide_par TEXT,
  commentaire_global TEXT,
  nb_points_remplis INT DEFAULT 0,
  nb_points_total INT DEFAULT 0,
  disponibilite_globale NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Table: inspection_lignes_ronde
-- ============================================
CREATE TABLE inspection_lignes_ronde (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ronde_id UUID NOT NULL REFERENCES inspection_rondes(id) ON DELETE CASCADE,
  equipement_id UUID NOT NULL REFERENCES inspection_equipements(id) ON DELETE CASCADE,
  statut statut_equipement,
  commentaire TEXT CHECK (char_length(commentaire) <= 300),
  urgent BOOLEAN DEFAULT false,
  rempli_par TEXT,
  rempli_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ronde_id, equipement_id)
);

-- ============================================
-- 6. Table: inspection_destinataires_mail
-- ============================================
CREATE TABLE inspection_destinataires_mail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_insp_equipements_zone ON inspection_equipements(zone_id);
CREATE INDEX idx_insp_equipements_sous_zone ON inspection_equipements(sous_zone_id);
CREATE INDEX idx_insp_lignes_ronde ON inspection_lignes_ronde(ronde_id);
CREATE INDEX idx_insp_lignes_equipement ON inspection_lignes_ronde(equipement_id);
CREATE INDEX idx_insp_rondes_semaine ON inspection_rondes(semaine_iso);
CREATE INDEX idx_insp_rondes_statut ON inspection_rondes(statut);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE inspection_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_sous_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_equipements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_rondes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_lignes_ronde ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_destinataires_mail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_zones_all" ON inspection_zones FOR ALL USING (true);
CREATE POLICY "inspection_sous_zones_all" ON inspection_sous_zones FOR ALL USING (true);
CREATE POLICY "inspection_equipements_all" ON inspection_equipements FOR ALL USING (true);
CREATE POLICY "inspection_rondes_all" ON inspection_rondes FOR ALL USING (true);
CREATE POLICY "inspection_lignes_all" ON inspection_lignes_ronde FOR ALL USING (true);
CREATE POLICY "inspection_dest_all" ON inspection_destinataires_mail FOR ALL USING (true);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE TRIGGER trig_insp_zones_updated
  BEFORE UPDATE ON inspection_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_insp_sous_zones_updated
  BEFORE UPDATE ON inspection_sous_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_insp_equipements_updated
  BEFORE UPDATE ON inspection_equipements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_insp_rondes_updated
  BEFORE UPDATE ON inspection_rondes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_insp_lignes_updated
  BEFORE UPDATE ON inspection_lignes_ronde
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Zones
INSERT INTO inspection_zones (nom, libelle, ordre, poids_kpi) VALUES
  ('STOCKAGE', 'Zone Stockage GPL', 1, 3.0),
  ('PONT_BASCULE', 'Salle Supervision & Annexes', 2, 1.0),
  ('PCC', 'Poste Chargement Camion', 3, 1.0);

-- Sous-zones pour STOCKAGE (3 spheres)
INSERT INTO inspection_sous_zones (zone_id, nom, libelle, ordre)
SELECT z.id, s.nom, s.libelle, s.ordre
FROM inspection_zones z
CROSS JOIN (VALUES
  ('S1', 'Sphère S1', 1),
  ('S2', 'Sphère S2', 2),
  ('S3', 'Sphère S3', 3)
) AS s(nom, libelle, ordre)
WHERE z.nom = 'STOCKAGE';

-- Equipements STOCKAGE : 7 points x 3 spheres = 21
INSERT INTO inspection_equipements (zone_id, sous_zone_id, nom, description, ordre)
SELECT z.id, sz.id, e.nom, e.description, e.ordre
FROM inspection_zones z
JOIN inspection_sous_zones sz ON sz.zone_id = z.id
CROSS JOIN (VALUES
  ('État de rouille', 'Corps sphérique, soudures, supports', 1),
  ('Chemin de câble', 'Intégrité physique, fixations, pénétrations étanchées', 2),
  ('Vannes Automatiques', 'État mécanique, position repos, test de commande', 3),
  ('Vannes Manuelles', 'État, manœuvrabilité, étanchéité, signalisation', 4),
  ('Détecteur Flamme', 'Fixation, signal actif, date du dernier test', 5),
  ('Détecteur Gaz', 'Fixation, signal actif, date étalonnage, test alarme', 6),
  ('Fin de course', 'État physique, calage, réponse à la commande', 7)
) AS e(nom, description, ordre)
WHERE z.nom = 'STOCKAGE';

-- Equipements PONT BASCULE : 5 points (pas de sous-zone)
INSERT INTO inspection_equipements (zone_id, sous_zone_id, nom, description, ordre)
SELECT z.id, NULL, e.nom, e.description, e.ordre
FROM inspection_zones z
CROSS JOIN (VALUES
  ('Prise à la terre', 'Câble, picot, mesure de résistance (objectif < 10 Ω)', 1),
  ('Afficheur de poids', 'Lisibilité, remise à zéro, étalonnage, rétroéclairage', 2),
  ('Logiciel PIC (pesée)', 'Démarrage, connexion balance, impression ticket', 3),
  ('Connectique', 'Câbles USB/série, boîtier de raccordement, connexions', 4),
  ('Climatisation', 'Fonctionnement, filtres, température cabine', 5)
) AS e(nom, description, ordre)
WHERE z.nom = 'PONT_BASCULE';

-- Equipements PCC : 5 points (pas de sous-zone)
INSERT INTO inspection_equipements (zone_id, sous_zone_id, nom, description, ordre)
SELECT z.id, NULL, e.nom, e.description, e.ordre
FROM inspection_zones z
CROSS JOIN (VALUES
  ('Intégrité Flexible', 'Absence de fissure, craquelure, déformation, trace de fuite', 1),
  ('Prise de terre', 'Câble, pince, résistance de contact', 2),
  ('Détecteur Gaz / Flamme', 'Fixation, signal actif, date étalonnage', 3),
  ('Manomètre', 'Lisibilité cadran, valeur cohérente, absence de fuite', 4),
  ('Éclairage', 'Fonctionnement lampes, intégrité protection ATEX', 5)
) AS e(nom, description, ordre)
WHERE z.nom = 'PCC';

-- Destinataires par defaut
INSERT INTO inspection_destinataires_mail (nom, email) VALUES
  ('Chef de dépôt', 'chef.depot@saepp.ci'),
  ('Responsable HSE', 'hse@saepp.ci');
