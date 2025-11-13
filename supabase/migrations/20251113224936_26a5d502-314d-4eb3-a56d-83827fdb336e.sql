-- Permettre à tous les utilisateurs authentifiés de voir les chefs de ligne
CREATE POLICY "Authenticated users can view chefs de ligne"
ON public.chefs_ligne
FOR SELECT
TO authenticated
USING (true);

-- Permettre à tous les utilisateurs authentifiés de voir les chefs de quart
CREATE POLICY "Authenticated users can view chefs de quart"
ON public.chefs_quart
FOR SELECT
TO authenticated
USING (true);