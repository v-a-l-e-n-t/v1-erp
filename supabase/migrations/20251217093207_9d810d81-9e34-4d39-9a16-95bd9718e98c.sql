-- Autoriser la gestion des utilisateurs VRAC

DROP POLICY IF EXISTS "vrac_users_admin_all" ON vrac_users;
DROP POLICY IF EXISTS "Allow admin write on vrac_users" ON vrac_users;
DROP POLICY IF EXISTS "Allow public read on vrac_users" ON vrac_users;

CREATE POLICY "vrac_users_insert_public" ON vrac_users FOR INSERT WITH CHECK (true);

CREATE POLICY "vrac_users_select_public" ON vrac_users FOR SELECT USING (true);

CREATE POLICY "vrac_users_update_public" ON vrac_users FOR UPDATE USING (true);

CREATE POLICY "vrac_users_delete_public" ON vrac_users FOR DELETE USING (true);