-- Migration: Ajouter le rôle chef_equipe_atelier
-- Date: 2025-01-13

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_role_check;

-- Recréer la contrainte avec le nouveau rôle
ALTER TABLE agents ADD CONSTRAINT agents_role_check 
  CHECK (role IN ('chef_ligne', 'chef_quart', 'chef_equipe_atelier', 'agent_exploitation', 'agent_mouvement'));