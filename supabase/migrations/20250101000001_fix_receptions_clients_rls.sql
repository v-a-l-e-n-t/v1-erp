-- Migration: Fix RLS pour receptions_clients
-- Date: 2025-01-01
-- Description: Autoriser l'insertion publique sur receptions_clients pour permettre l'import CSV

-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Allow admin write on receptions_clients" ON receptions_clients;

-- Créer une policy permissive pour l'insertion
CREATE POLICY "receptions_clients_insert_public" 
ON receptions_clients 
FOR INSERT 
WITH CHECK (true);

-- Créer une policy permissive pour la mise à jour (si nécessaire)
CREATE POLICY "receptions_clients_update_public" 
ON receptions_clients 
FOR UPDATE 
USING (true);

-- Créer une policy permissive pour la suppression (si nécessaire)
CREATE POLICY "receptions_clients_delete_public" 
ON receptions_clients 
FOR DELETE 
USING (true);
