-- Ajoute la date d'édition du bon (date imprimée sur le document papier),
-- qui peut différer de la date de réception physique chez nous.
-- Par défaut, on initialise date_edition = date_reception pour l'historique.

ALTER TABLE public.bons_transfert
  ADD COLUMN IF NOT EXISTS date_edition date;

UPDATE public.bons_transfert
SET date_edition = date_reception
WHERE date_edition IS NULL;

COMMENT ON COLUMN public.bons_transfert.date_edition IS
  'Date d''édition du bon (papier). Peut différer de la date de réception.';
