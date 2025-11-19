-- Add personnel fields to production_shifts table
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS chariste integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chariot integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_quai integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_saisie integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_atelier integer DEFAULT 0;

-- Add B28 and B38 fields to lignes_production table
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
ADD COLUMN IF NOT EXISTS consignes_vivo_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b38 integer DEFAULT 0;
