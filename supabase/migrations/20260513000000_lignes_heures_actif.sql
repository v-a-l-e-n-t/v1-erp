-- Ajout du toggle Actif/Inactif et des heures réelles par ligne de production.
-- Voir plan : heures-reelles-par-ligne.
-- - actif = false : la ligne n'a pas travaillé sur ce shift, doit être exclue
--   des KPI (heuresProductives, rendement, etc.).
-- - heure_debut_reelle / heure_fin_reelle : permettent de calculer la durée
--   propre à la ligne. Si NULL (anciennes saisies), on retombe sur les heures
--   du shift global pour rester rétro-compatible.

ALTER TABLE public.lignes_production
  ADD COLUMN IF NOT EXISTS actif boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS heure_debut_reelle time NULL,
  ADD COLUMN IF NOT EXISTS heure_fin_reelle   time NULL;

COMMENT ON COLUMN public.lignes_production.actif IS
  'false = la ligne n''a pas travaillé sur ce shift (exclue des stats).';
COMMENT ON COLUMN public.lignes_production.heure_debut_reelle IS
  'Heure réelle de démarrage de la ligne (peut différer du shift).';
COMMENT ON COLUMN public.lignes_production.heure_fin_reelle IS
  'Heure réelle d''arrêt de la ligne.';
