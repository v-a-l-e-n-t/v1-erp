-- FIX: Allow anonymous users (Custom Auth) to access audit logs

-- 1. Allow INSERT for everyone (since authentication is handled by the Frontend App)
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow public insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- 2. Allow SELECT for everyone (to view history)
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Allow public view audit logs" ON public.audit_logs
    FOR SELECT USING (true);

-- 3. Ensure 'agents' table is also accessible if not already
-- (Optional, if you faced issues updating agents too)
-- CREATE POLICY "Allow public all agents" ON public.agents
--     FOR ALL USING (true) WITH CHECK (true);
