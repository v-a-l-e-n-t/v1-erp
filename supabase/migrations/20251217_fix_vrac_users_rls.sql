-- Migration: Fix Permissions VRAC Users
-- Date: 2025-12-17
-- Description: Autoriser l'insertion publique sur vrac_users pour permettre la génération de mots de passe
-- depuis l'application admin actuelle (qui n'utilise pas l'auth admin Supabase complète).

-- 1. Supprimer l'ancienne politique restrictive sur vrac_users
DROP POLICY IF EXISTS "vrac_users_admin_all" ON vrac_users;

-- 2. Créer une politique permissive pour l'insertion
CREATE POLICY "vrac_users_insert_public" ON vrac_users FOR INSERT WITH CHECK (true);

-- 3. Créer une politique permissive pour la lecture (nécessaire pour voir la liste après création)
CREATE POLICY "vrac_users_select_public" ON vrac_users FOR SELECT USING (true);

-- 4. Créer une politique permissive pour la mise à jour (activer/désactiver)
CREATE POLICY "vrac_users_update_public" ON vrac_users FOR UPDATE USING (true);

-- 5. Créer une politique permissive pour la suppression
CREATE POLICY "vrac_users_delete_public" ON vrac_users FOR DELETE USING (true);
