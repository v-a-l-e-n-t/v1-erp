-- Ajout des colonnes Stock Outil et Consignes au niveau Shift.
-- Ces données sont distinctes des Recharges/Consignes par ligne.
-- Pour chaque client (PI, VIVO, TOTAL) × B6/B12 × Vides/Pleines.

-- STOCK OUTIL
ALTER TABLE public.production_shifts
  ADD COLUMN IF NOT EXISTS stock_outil_pi_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_pi_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_pi_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_pi_b12_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_vivo_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_vivo_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_vivo_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_vivo_b12_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_total_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_total_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_total_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_outil_total_b12_pleines integer DEFAULT 0;

-- CONSIGNES SHIFT
ALTER TABLE public.production_shifts
  ADD COLUMN IF NOT EXISTS consignes_shift_pi_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_pi_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_pi_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_pi_b12_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_vivo_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_vivo_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_vivo_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_vivo_b12_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_total_b6_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_total_b6_pleines integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_total_b12_vides integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consignes_shift_total_b12_pleines integer DEFAULT 0;
