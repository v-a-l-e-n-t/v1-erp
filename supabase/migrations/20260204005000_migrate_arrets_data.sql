-- Migration des données AVANT de changer la structure
-- Cette migration doit être exécutée AVANT 20260204010000_refactor_arrets_structure.sql

-- 1. Migrer temps_arret_ligne_minutes pour les lignes existantes
-- Calculer le temps d'arrêt pour chaque ligne depuis arrets_production
UPDATE public.lignes_production AS lp
SET temps_arret_ligne_minutes = COALESCE((
  SELECT SUM(
    CASE
      -- Si duree_minutes existe, l'utiliser
      WHEN ap.duree_minutes IS NOT NULL AND ap.duree_minutes > 0 THEN ap.duree_minutes
      -- Sinon calculer depuis heure_debut et heure_fin
      WHEN ap.heure_debut IS NOT NULL AND ap.heure_fin IS NOT NULL THEN
        CASE
          WHEN ap.heure_fin >= ap.heure_debut THEN
            EXTRACT(EPOCH FROM (ap.heure_fin::time - ap.heure_debut::time)) / 60
          ELSE
            EXTRACT(EPOCH FROM (ap.heure_fin::time - ap.heure_debut::time + interval '24 hours')) / 60
        END
      ELSE 0
    END
  )
  FROM public.arrets_production AS ap
  WHERE ap.shift_id = lp.shift_id
    AND ap.lignes_concernees @> ARRAY[lp.numero_ligne]
), 0);

-- 2. Migrer arrets_production : créer numero_ligne depuis lignes_concernees
-- Pour les arrêts qui concernent UNE SEULE ligne, migrer directement
UPDATE public.arrets_production
SET numero_ligne = lignes_concernees[1]
WHERE array_length(lignes_concernees, 1) = 1
  AND numero_ligne IS NULL;

-- Pour les arrêts qui concernent PLUSIEURS lignes, créer un arrêt par ligne
-- (On va d'abord créer les nouveaux arrêts, puis supprimer les anciens)
WITH multi_line_arrets AS (
  SELECT
    id,
    shift_id,
    type_arret,
    ordre_intervention,
    etape_ligne,
    description,
    action_corrective,
    lignes_concernees
  FROM public.arrets_production
  WHERE array_length(lignes_concernees, 1) > 1
    AND numero_ligne IS NULL
)
INSERT INTO public.arrets_production (
  shift_id,
  type_arret,
  ordre_intervention,
  etape_ligne,
  description,
  action_corrective,
  numero_ligne
)
SELECT
  shift_id,
  type_arret,
  ordre_intervention,
  etape_ligne,
  description,
  action_corrective,
  unnest(lignes_concernees) AS numero_ligne
FROM multi_line_arrets;

-- Supprimer les anciens arrêts multi-lignes (qui ont été dupliqués)
DELETE FROM public.arrets_production
WHERE array_length(lignes_concernees, 1) > 1
  AND numero_ligne IS NULL;

-- 3. Mettre à jour arret_shift_cumul pour les shifts existants
UPDATE public.production_shifts AS ps
SET arret_shift_cumul = COALESCE((
  SELECT SUM(lp.temps_arret_ligne_minutes)
  FROM public.lignes_production AS lp
  WHERE lp.shift_id = ps.id
), 0);
