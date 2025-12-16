-- Migration: Fix Clients VRAC et Droits
-- Date: 2025-12-17

-- 1. Autoriser l'insertion publique sur vrac_clients (nécessaire car l'app admin n'utilise pas l'auth Supabase Admin)
DROP POLICY IF EXISTS "vrac_clients_insert_public" ON vrac_clients;
CREATE POLICY "vrac_clients_insert_public" ON vrac_clients FOR INSERT WITH CHECK (true);

-- 2. Peuplement initial des clients demandés
INSERT INTO vrac_clients (nom, nom_affichage, champ_sortie_vrac) VALUES
  ('SIMAM', 'SIMAM CI', 'sorties_vrac_simam'),
  ('VIVO', 'VIVO ENERGY', 'sorties_vrac_vivo'),
  ('TOTAL', 'TOTAL ENERGIES', 'sorties_vrac_total'),
  ('PETRO IVOIRE', 'PETRO IVOIRE', 'sorties_vrac_petro_ivoire')
ON CONFLICT (nom) DO UPDATE SET
  nom_affichage = EXCLUDED.nom_affichage,
  champ_sortie_vrac = EXCLUDED.champ_sortie_vrac;
