-- Migration: Add SIGMA warehouse, linked movements, bottle_origin and sigma_stock table
-- Description: Ajouter le magasin SIGMA, les colonnes pour les mouvements inter-magasins,
--              l'origine des bouteilles et la table de stock SIGMA configurable

-- 1. Mettre à jour les catégories autorisées (supprimer peinture, renommer stock_outils_vivo, ajouter sigma)
ALTER TABLE public.stock_movements 
DROP CONSTRAINT IF EXISTS stock_movements_category_check;

ALTER TABLE public.stock_movements 
ADD CONSTRAINT stock_movements_category_check 
CHECK (category IN (
  'bouteilles_neuves',
  'consignes',
  'stock_outils',
  'bouteilles_hs',
  'reconfiguration',
  'sigma',
  'parc_ce'
));

-- 2. Migrer les anciennes données stock_outils_vivo vers stock_outils
UPDATE public.stock_movements 
SET category = 'stock_outils' 
WHERE category = 'stock_outils_vivo';

-- 3. Ajouter colonne pour lier les mouvements inter-magasins
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS linked_movement_id uuid;

-- 4. Ajouter colonnes pour identifier le magasin source/destination
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS source_warehouse text;

ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS destination_warehouse text;

-- 5. Ajouter colonne pour l'origine des bouteilles (Fabriqué/Requalifié)
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS bottle_origin text CHECK (bottle_origin IN ('fabrique', 'requalifie'));

-- 6. Index pour les mouvements liés (améliore les performances de recherche)
CREATE INDEX IF NOT EXISTS idx_stock_movements_linked 
ON public.stock_movements(linked_movement_id) 
WHERE linked_movement_id IS NOT NULL;

-- 7. Index pour les magasins source/destination
CREATE INDEX IF NOT EXISTS idx_stock_movements_source_warehouse 
ON public.stock_movements(source_warehouse) 
WHERE source_warehouse IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_destination_warehouse 
ON public.stock_movements(destination_warehouse) 
WHERE destination_warehouse IS NOT NULL;

-- 8. Créer la table sigma_stock pour le stock SIGMA configurable par client
CREATE TABLE IF NOT EXISTS public.sigma_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client text NOT NULL CHECK (client IN ('PI', 'TOTAL', 'VIVO')),
  bottle_type text NOT NULL CHECK (bottle_type IN ('B6', 'B12', 'B28', 'B38')),
  initial_stock integer NOT NULL DEFAULT 0 CHECK (initial_stock >= 0),
  current_stock integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_modified_by text,
  UNIQUE(client, bottle_type)
);

-- 9. Activer RLS sur sigma_stock
ALTER TABLE public.sigma_stock ENABLE ROW LEVEL SECURITY;

-- 10. Politique permissive pour sigma_stock
CREATE POLICY "Enable all access for all users" ON public.sigma_stock
  FOR ALL USING (true) WITH CHECK (true);

-- 11. Index pour sigma_stock
CREATE INDEX IF NOT EXISTS idx_sigma_stock_client ON public.sigma_stock(client);
CREATE INDEX IF NOT EXISTS idx_sigma_stock_bottle_type ON public.sigma_stock(bottle_type);

-- 12. Trigger pour updated_at sur sigma_stock
CREATE OR REPLACE FUNCTION update_sigma_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sigma_stock_updated_at
  BEFORE UPDATE ON public.sigma_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_sigma_stock_updated_at();

-- Note: Pas de contrainte FK sur linked_movement_id pour éviter les problèmes de cascade circulaire
-- La gestion de la suppression cascade sera faite au niveau applicatif
