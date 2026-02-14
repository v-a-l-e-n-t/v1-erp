-- ============================================
-- SEED DATA — Inspection Hebdomadaire
-- Executez ce script dans le SQL Editor de Supabase
-- Il supprime les donnees existantes et les recree
-- ============================================

-- Nettoyage (ordre inverse des FK)
DELETE FROM inspection_lignes_ronde;
DELETE FROM inspection_rondes;
DELETE FROM inspection_anomalies;
DELETE FROM inspection_equipements;
DELETE FROM inspection_sous_zones;
DELETE FROM inspection_zones;
DELETE FROM inspection_destinataires_mail;

-- ============================================
-- ZONES (3)
-- ============================================
INSERT INTO inspection_zones (nom, libelle, ordre, poids_kpi) VALUES
  ('STOCKAGE', 'Zone Stockage GPL', 1, 3.0),
  ('PONT_BASCULE', 'Salle Supervision & Annexes', 2, 1.0),
  ('PCC', 'Poste Chargement Camion', 3, 1.0);

-- ============================================
-- SOUS-ZONES : 3 spheres pour STOCKAGE
-- ============================================
INSERT INTO inspection_sous_zones (zone_id, nom, libelle, ordre)
SELECT z.id, s.nom, s.libelle, s.ordre
FROM inspection_zones z
CROSS JOIN (VALUES
  ('S1', 'Sphère S1', 1),
  ('S2', 'Sphère S2', 2),
  ('S3', 'Sphère S3', 3)
) AS s(nom, libelle, ordre)
WHERE z.nom = 'STOCKAGE';

-- ============================================
-- EQUIPEMENTS STOCKAGE : 7 points x 3 spheres = 21
-- ============================================
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

-- ============================================
-- EQUIPEMENTS PONT BASCULE : 5 points
-- ============================================
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

-- ============================================
-- EQUIPEMENTS PCC : 5 points
-- ============================================
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

-- ============================================
-- DESTINATAIRES PAR DEFAUT
-- ============================================
INSERT INTO inspection_destinataires_mail (nom, email) VALUES
  ('Chef de dépôt', 'chef.depot@saepp.ci'),
  ('Responsable HSE', 'hse@saepp.ci');

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Zones' AS table_name, count(*) AS nb FROM inspection_zones
UNION ALL
SELECT 'Sous-zones', count(*) FROM inspection_sous_zones
UNION ALL
SELECT 'Equipements', count(*) FROM inspection_equipements
UNION ALL
SELECT 'Destinataires', count(*) FROM inspection_destinataires_mail;
