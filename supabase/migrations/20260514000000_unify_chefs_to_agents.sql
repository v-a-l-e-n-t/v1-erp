-- Unification des chefs vers la table agents.
-- Avant cette migration :
--  - production_shifts.chef_quart_id pointait déjà vers agents(id) (migrations
--    20251218 et 20251230).
--  - lignes_production.chef_ligne_id pointait encore vers la table legacy
--    chefs_ligne(id), alors que la page /agents écrit uniquement dans agents.
--    → Les agents créés sur /agents n'apparaissaient pas dans le dropdown
--      "Chef de ligne" de /production-entry (et inversement, le form échouait
--      si on tentait d'enregistrer avec un agents.id).
--
-- Cette migration :
--  1. Réaligne les chef_ligne_id existants en mappant chefs_ligne (legacy) sur
--     agents (cible) par couple (nom, prenom) — la migration 20251217114303
--     avait déjà copié les chefs_ligne dans agents avec un nouvel uuid.
--  2. Remplace la FK pour pointer vers agents(id).

-- 1. Drop d'abord la FK pour pouvoir remapper sans violer la contrainte.
ALTER TABLE public.lignes_production
  DROP CONSTRAINT IF EXISTS lignes_production_chef_ligne_id_fkey;

-- 2. Remap des chef_ligne_id existants (legacy chefs_ligne → agents)
UPDATE public.lignes_production lp
SET chef_ligne_id = a.id
FROM public.chefs_ligne cl
JOIN public.agents a
  ON a.nom = cl.nom
 AND a.prenom = cl.prenom
 AND a.role = 'chef_ligne'
WHERE lp.chef_ligne_id = cl.id;

-- 3. Nettoyer les orphelins éventuels (sinon ADD CONSTRAINT échoue)
UPDATE public.lignes_production
SET chef_ligne_id = NULL
WHERE chef_ligne_id IS NOT NULL
  AND chef_ligne_id NOT IN (SELECT id FROM public.agents);

-- 4. Recréer la FK pointant désormais vers agents
ALTER TABLE public.lignes_production
  ADD CONSTRAINT lignes_production_chef_ligne_id_fkey
  FOREIGN KEY (chef_ligne_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- 5. Même remap pour production_shifts.chef_quart_id (la FK n'existe pas sur
--    cette table, mais les UUID historiques pointaient vers chefs_quart.id).
UPDATE public.production_shifts ps
SET chef_quart_id = a.id
FROM public.chefs_quart cq
JOIN public.agents a
  ON a.nom = cq.nom
 AND a.prenom = cq.prenom
 AND a.role = 'chef_quart'
WHERE ps.chef_quart_id = cq.id;
