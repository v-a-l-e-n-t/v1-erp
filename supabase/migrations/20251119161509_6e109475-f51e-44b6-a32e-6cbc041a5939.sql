-- Comprehensive Production Database Schema Organization
-- This migration ensures all production data from /production-entry is properly stored

-- ============================================================================
-- PART 1: Update production_shifts table
-- ============================================================================
-- Add personnel fields if they don't exist (from the form)
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS chariste integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chariot integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_quai integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_saisie integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_atelier integer DEFAULT 0;

-- Ensure all calculated KPI fields exist
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS tonnage_total numeric(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS temps_arret_total_minutes integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.production_shifts.heure_debut_theorique IS 'Heure de début prévue selon le type de shift (10h ou 20h)';
COMMENT ON COLUMN public.production_shifts.heure_fin_theorique IS 'Heure de fin prévue selon le type de shift (19h ou 5h)';
COMMENT ON COLUMN public.production_shifts.heure_debut_reelle IS 'Heure de début réelle saisie par l''utilisateur - utilisée pour calcul TRS';
COMMENT ON COLUMN public.production_shifts.heure_fin_reelle IS 'Heure de fin réelle saisie par l''utilisateur - utilisée pour calcul TRS';
COMMENT ON COLUMN public.production_shifts.chariste IS 'Nombre de charistes présents durant le shift';
COMMENT ON COLUMN public.production_shifts.chariot IS 'Nombre de chariots utilisés durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_quai IS 'Nombre d''agents de quai présents durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_saisie IS 'Nombre d''agents de saisie présents durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_atelier IS 'Nombre d''agents d''atelier présents durant le shift';
COMMENT ON COLUMN public.production_shifts.tonnage_total IS 'Tonnage total produit (calculé) - somme des tonnages de toutes les lignes';
COMMENT ON COLUMN public.production_shifts.bouteilles_produites IS 'Nombre total de bouteilles produites (calculé) - tous types confondus';
COMMENT ON COLUMN public.production_shifts.cumul_recharges_total IS 'Cumul total des recharges (calculé) - toutes lignes et types de bouteilles';
COMMENT ON COLUMN public.production_shifts.cumul_consignes_total IS 'Cumul total des consignes (calculé) - toutes lignes et types de bouteilles';
COMMENT ON COLUMN public.production_shifts.temps_arret_total_minutes IS 'Temps d''arrêt total en minutes (calculé) - somme de tous les arrêts du shift';

-- ============================================================================
-- PART 2: Update lignes_production table
-- ============================================================================
-- Add B28 and B38 fields for all bottle types (Ligne 5 only uses these)
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS recharges_petro_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_petro_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_total_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_total_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_vivo_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_vivo_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_petro_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_petro_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_total_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_total_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_vivo_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_vivo_b38 integer DEFAULT 0;

-- Add cumulative fields for B28 and B38
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS cumul_recharges_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b38 integer DEFAULT 0;

-- Ensure nombre_agents exists
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS nombre_agents integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.lignes_production.numero_ligne IS 'Numéro de ligne (1-5). Lignes 1-4: B6 uniquement. Ligne 5: B12, B28, B38';
COMMENT ON COLUMN public.lignes_production.nombre_agents IS 'Nombre d''agents sur la ligne. Max: L1-2=8, L3-4=14, L5=10';
COMMENT ON COLUMN public.lignes_production.tonnage_ligne IS 'Tonnage total de la ligne (calculé). B6=6kg, B12=12.5kg, B28=28kg, B38=38kg';

-- Recharges comments
COMMENT ON COLUMN public.lignes_production.recharges_petro_b6 IS 'Recharges PETRO IVOIRE - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b12 IS 'Recharges PETRO IVOIRE - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b28 IS 'Recharges PETRO IVOIRE - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b38 IS 'Recharges PETRO IVOIRE - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.recharges_total_b6 IS 'Recharges TOTAL ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_total_b12 IS 'Recharges TOTAL ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_total_b28 IS 'Recharges TOTAL ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_total_b38 IS 'Recharges TOTAL ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.recharges_vivo_b6 IS 'Recharges VIVO ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b12 IS 'Recharges VIVO ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b28 IS 'Recharges VIVO ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b38 IS 'Recharges VIVO ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

-- Consignes comments
COMMENT ON COLUMN public.lignes_production.consignes_petro_b6 IS 'Consignes PETRO IVOIRE - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b12 IS 'Consignes PETRO IVOIRE - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b28 IS 'Consignes PETRO IVOIRE - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b38 IS 'Consignes PETRO IVOIRE - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.consignes_total_b6 IS 'Consignes TOTAL ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_total_b12 IS 'Consignes TOTAL ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_total_b28 IS 'Consignes TOTAL ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_total_b38 IS 'Consignes TOTAL ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.consignes_vivo_b6 IS 'Consignes VIVO ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b12 IS 'Consignes VIVO ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b28 IS 'Consignes VIVO ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b38 IS 'Consignes VIVO ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

-- Cumulative totals comments
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b6 IS 'Cumul recharges B6 (calculé) - Petro + Total + Vivo';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b12 IS 'Cumul recharges B12 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b28 IS 'Cumul recharges B28 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b38 IS 'Cumul recharges B38 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.cumul_consignes_b6 IS 'Cumul consignes B6 (calculé) - Petro + Total + Vivo';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b12 IS 'Cumul consignes B12 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b28 IS 'Cumul consignes B28 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b38 IS 'Cumul consignes B38 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';

-- ============================================================================
-- PART 3: Update arrets_production table
-- ============================================================================
-- Ensure all required fields exist
ALTER TABLE public.arrets_production
ADD COLUMN IF NOT EXISTS lignes_concernees integer[],
ADD COLUMN IF NOT EXISTS ordre_intervention text;

-- Add comments
COMMENT ON COLUMN public.arrets_production.shift_id IS 'Lien vers le shift - les arrêts appartiennent au shift global';
COMMENT ON COLUMN public.arrets_production.lignes_concernees IS 'Tableau des numéros de lignes concernées par cet arrêt (ex: {1,2} pour lignes 1 et 2)';
COMMENT ON COLUMN public.arrets_production.heure_debut IS 'Heure de début de l''arrêt';
COMMENT ON COLUMN public.arrets_production.heure_fin IS 'Heure de fin de l''arrêt';
COMMENT ON COLUMN public.arrets_production.type_arret IS 'Type d''arrêt: maintenance_corrective, manque_personnel, probleme_approvisionnement, panne_ligne, autre';
COMMENT ON COLUMN public.arrets_production.etape_ligne IS 'Étape de la ligne concernée (si type_arret = panne_ligne): BASCULES, PURGE, CONTROLE, etc.';
COMMENT ON COLUMN public.arrets_production.description IS 'Description détaillée de l''arrêt';
COMMENT ON COLUMN public.arrets_production.action_corrective IS 'Action corrective mise en place';
COMMENT ON COLUMN public.arrets_production.ordre_intervention IS 'Numéro d''ordre d''intervention (si applicable)';

-- ============================================================================
-- PART 4: Add indexes for performance
-- ============================================================================
-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_production_shifts_date ON public.production_shifts(date);
CREATE INDEX IF NOT EXISTS idx_production_shifts_shift_type ON public.production_shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_production_shifts_date_shift_type ON public.production_shifts(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_lignes_production_shift_id ON public.lignes_production(shift_id);
CREATE INDEX IF NOT EXISTS idx_lignes_production_numero_ligne ON public.lignes_production(numero_ligne);
CREATE INDEX IF NOT EXISTS idx_arrets_production_shift_id ON public.arrets_production(shift_id);

-- ============================================================================
-- PART 5: Add constraints for data integrity
-- ============================================================================
-- Ensure shift uniqueness (one shift per date/type combination)
CREATE UNIQUE INDEX IF NOT EXISTS unique_shift_date_type 
ON public.production_shifts(date, shift_type);

-- Ensure ligne numbers are valid (1-5)
ALTER TABLE public.lignes_production
DROP CONSTRAINT IF EXISTS check_numero_ligne_valid;

ALTER TABLE public.lignes_production
ADD CONSTRAINT check_numero_ligne_valid 
CHECK (numero_ligne >= 1 AND numero_ligne <= 5);

-- Ensure nombre_agents is within valid ranges
ALTER TABLE public.lignes_production
DROP CONSTRAINT IF EXISTS check_nombre_agents_valid;

ALTER TABLE public.lignes_production
ADD CONSTRAINT check_nombre_agents_valid 
CHECK (nombre_agents >= 0 AND nombre_agents <= 14);

-- ============================================================================
-- PART 6: Table comments for documentation
-- ============================================================================
COMMENT ON TABLE public.production_shifts IS 
'Table principale des shifts de production. Contient les informations globales du shift: date, équipe, heures, personnel, et KPIs calculés (tonnage, bouteilles, temps d''arrêt).';

COMMENT ON TABLE public.lignes_production IS 
'Détails de production par ligne. Lignes 1-4 utilisent uniquement B6. Ligne 5 utilise B12, B28, B38. Contient les compteurs par client (Petro, Total, Vivo) et les cumuls calculés.';

COMMENT ON TABLE public.arrets_production IS 
'Arrêts de production. Liés au shift via shift_id. Peuvent concerner une ou plusieurs lignes (lignes_concernees). Utilisés pour calcul du TRS et analyse des causes d''arrêt.';