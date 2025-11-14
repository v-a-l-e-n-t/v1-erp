-- Supprimer la colonne equipement de arrets_production
ALTER TABLE public.arrets_production 
DROP COLUMN IF EXISTS equipement;

-- Ajouter les colonnes calculées dans lignes_production
ALTER TABLE public.lignes_production
ADD COLUMN cumul_recharges_b6 integer DEFAULT 0,
ADD COLUMN cumul_recharges_b12 integer DEFAULT 0,
ADD COLUMN cumul_consignes_b6 integer DEFAULT 0,
ADD COLUMN cumul_consignes_b12 integer DEFAULT 0,
ADD COLUMN tonnage_ligne numeric(10,3) DEFAULT 0;

-- Ajouter les colonnes calculées dans production_shifts
ALTER TABLE public.production_shifts
ADD COLUMN tonnage_total numeric(10,3) DEFAULT 0,
ADD COLUMN cumul_recharges_total integer DEFAULT 0,
ADD COLUMN cumul_consignes_total integer DEFAULT 0,
ADD COLUMN temps_arret_total_minutes integer DEFAULT 0;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b6 IS 'Cumul des recharges B6 de toutes les marques';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b12 IS 'Cumul des recharges B12 de toutes les marques';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b6 IS 'Cumul des consignes B6 de toutes les marques';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b12 IS 'Cumul des consignes B12 de toutes les marques';
COMMENT ON COLUMN public.lignes_production.tonnage_ligne IS 'Tonnage total de la ligne en tonnes (B6=6kg, B12=12.5kg)';

COMMENT ON COLUMN public.production_shifts.tonnage_total IS 'Tonnage total produit durant le shift (somme de toutes les lignes)';
COMMENT ON COLUMN public.production_shifts.cumul_recharges_total IS 'Cumul total des recharges (toutes lignes confondues)';
COMMENT ON COLUMN public.production_shifts.cumul_consignes_total IS 'Cumul total des consignes (toutes lignes confondues)';
COMMENT ON COLUMN public.production_shifts.temps_arret_total_minutes IS 'Temps d''arrêt total en minutes pour ce shift';