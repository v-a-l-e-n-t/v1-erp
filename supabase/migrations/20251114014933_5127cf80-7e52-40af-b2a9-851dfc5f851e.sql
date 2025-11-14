-- Ajouter les colonnes pour les sorties détaillées par client

-- Sorties vrac détaillées
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_vrac_simam numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_vrac_petro_ivoire numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_vrac_vivo_energies numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_vrac_total_energies numeric DEFAULT 0;

-- Sorties conditionnées détaillées
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_conditionnees_petro_ivoire numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_conditionnees_vivo_energies numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS sorties_conditionnees_total_energies numeric DEFAULT 0;

-- Fuyardes détaillées
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS fuyardes_petro_ivoire numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS fuyardes_vivo_energies numeric DEFAULT 0;
ALTER TABLE public.bilan_entries ADD COLUMN IF NOT EXISTS fuyardes_total_energies numeric DEFAULT 0;

-- Mise à jour des anciennes colonnes en fonction des nouvelles (pour les données existantes)
-- Les anciennes colonnes restent pour la compatibilité, elles seront calculées automatiquement
UPDATE public.bilan_entries 
SET 
  sorties_vrac_simam = 0,
  sorties_vrac_petro_ivoire = 0,
  sorties_vrac_vivo_energies = 0,
  sorties_vrac_total_energies = 0,
  sorties_conditionnees_petro_ivoire = 0,
  sorties_conditionnees_vivo_energies = 0,
  sorties_conditionnees_total_energies = 0,
  fuyardes_petro_ivoire = 0,
  fuyardes_vivo_energies = 0,
  fuyardes_total_energies = 0
WHERE sorties_vrac_simam IS NULL;