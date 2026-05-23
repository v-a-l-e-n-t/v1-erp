-- =============================================================================
-- Fix : production_shifts.heure_debut/fin_theorique enregistres avec les
-- mauvais defauts.
--
-- Valeurs canoniques (cf src/types/production.ts:SHIFT_HOURS) :
--   shift_type = '10h-19h' -> 11:30 - 20:30
--   shift_type = '20h-5h'  -> 21:30 - 05:30
--
-- Historiquement le formulaire avait des defauts incoherents (10:00/19:00 en
-- mode edition et reset). Les lignes affectees sont corrigees ici. On ne touche
-- PAS heure_debut_reelle / heure_fin_reelle, qui sont les heures reelles
-- declarees par l'operateur et peuvent etre legitimement differentes.
-- =============================================================================

-- 1) Shifts 10h-19h enregistres 10:00 -> 19:00
UPDATE public.production_shifts
   SET heure_debut_theorique = TIME '11:30',
       heure_fin_theorique   = TIME '20:30'
 WHERE shift_type             = '10h-19h'::public.shift_type
   AND heure_debut_theorique  = TIME '10:00'
   AND heure_fin_theorique    = TIME '19:00';

-- 2) Shifts 20h-5h enregistres 20:00 -> 05:00
UPDATE public.production_shifts
   SET heure_debut_theorique = TIME '21:30',
       heure_fin_theorique   = TIME '05:30'
 WHERE shift_type             = '20h-5h'::public.shift_type
   AND heure_debut_theorique  = TIME '20:00'
   AND heure_fin_theorique    = TIME '05:00';

-- 3) Verification : doit retourner 0 ligne avec ces valeurs apres update.
-- SELECT shift_type, heure_debut_theorique, heure_fin_theorique, count(*)
--   FROM public.production_shifts
--  WHERE (shift_type = '10h-19h' AND heure_debut_theorique = '10:00' AND heure_fin_theorique = '19:00')
--     OR (shift_type = '20h-5h'  AND heure_debut_theorique = '20:00' AND heure_fin_theorique = '05:00')
--  GROUP BY 1, 2, 3;
