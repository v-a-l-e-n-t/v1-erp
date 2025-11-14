-- Ajouter une colonne pour stocker les lignes concernées par un arrêt
ALTER TABLE public.arrets_production 
ADD COLUMN lignes_concernees integer[];

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX idx_arrets_production_lignes_concernees 
ON public.arrets_production USING GIN(lignes_concernees);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.arrets_production.lignes_concernees 
IS 'Numéros des lignes concernées par l''arrêt (tableau de 1-5). Permet d''affecter un arrêt à plusieurs lignes simultanément.';