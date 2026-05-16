-- Ajout de la quantité prévue sur le bon (telle qu'imprimée sur le document
-- papier). Différente du POIDS NET réellement pesé à la sortie.
ALTER TABLE public.bons_transfert
  ADD COLUMN IF NOT EXISTS quantite_bon numeric(10,2);

COMMENT ON COLUMN public.bons_transfert.quantite_bon IS
  'Quantité prévue imprimée sur le bon (kg), généralement 30 000 kg par camion.';
