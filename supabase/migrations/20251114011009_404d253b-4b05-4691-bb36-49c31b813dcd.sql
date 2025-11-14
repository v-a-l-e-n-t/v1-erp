-- Supprimer les anciennes politiques restrictives et créer des politiques publiques pour la lecture
-- Pour chefs_ligne
DROP POLICY IF EXISTS "Authenticated users can view chefs de ligne" ON public.chefs_ligne;

CREATE POLICY "Public can view chefs de ligne"
ON public.chefs_ligne FOR SELECT
TO anon, authenticated
USING (true);

-- Pour chefs_quart  
DROP POLICY IF EXISTS "Authenticated users can view chefs de quart" ON public.chefs_quart;

CREATE POLICY "Public can view chefs de quart"
ON public.chefs_quart FOR SELECT
TO anon, authenticated
USING (true);