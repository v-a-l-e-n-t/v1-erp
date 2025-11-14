-- Supprimer toutes les policies d'authentification sur production_shifts
DROP POLICY IF EXISTS "Admins can view all shifts" ON public.production_shifts;
DROP POLICY IF EXISTS "Chef depot can insert shifts" ON public.production_shifts;
DROP POLICY IF EXISTS "Chef depot can update their shifts" ON public.production_shifts;
DROP POLICY IF EXISTS "Chef depot can view their shifts" ON public.production_shifts;

-- Créer une policy publique pour toutes les opérations sur production_shifts
CREATE POLICY "Allow all operations on production_shifts"
ON public.production_shifts
FOR ALL
USING (true)
WITH CHECK (true);

-- Supprimer toutes les policies d'authentification sur arrets_production
DROP POLICY IF EXISTS "Admins can view all arrets" ON public.arrets_production;
DROP POLICY IF EXISTS "Chef depot can manage arrets" ON public.arrets_production;

-- Créer une policy publique pour toutes les opérations sur arrets_production
CREATE POLICY "Allow all operations on arrets_production"
ON public.arrets_production
FOR ALL
USING (true)
WITH CHECK (true);