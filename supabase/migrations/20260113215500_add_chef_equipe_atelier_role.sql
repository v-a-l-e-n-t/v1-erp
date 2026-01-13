-- Mise à jour de la contrainte de rôle pour inclure chef_equipe_atelier
-- D'abord supprimer l'ancienne contrainte
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_role_check;

-- Recréer la contrainte avec le nouveau rôle
ALTER TABLE agents ADD CONSTRAINT agents_role_check 
  CHECK (role IN ('chef_ligne', 'chef_quart', 'chef_equipe_atelier', 'agent_exploitation', 'agent_mouvement'));
