-- Ajouter la colonne temps_arret_ligne_minutes dans lignes_production
ALTER TABLE public.lignes_production
ADD COLUMN temps_arret_ligne_minutes integer DEFAULT 0;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.lignes_production.temps_arret_ligne_minutes IS 'Temps d''arrêt total pour cette ligne en minutes (somme des durées des arrêts)';
