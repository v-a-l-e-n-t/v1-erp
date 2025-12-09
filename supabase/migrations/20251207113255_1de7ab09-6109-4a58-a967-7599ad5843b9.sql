-- Ajouter la colonne duree_minutes
ALTER TABLE "public"."arrets_production" ADD COLUMN IF NOT EXISTS "duree_minutes" numeric;

-- Rendre heure_debut nullable
ALTER TABLE "public"."arrets_production" ALTER COLUMN "heure_debut" DROP NOT NULL;

-- Rendre heure_fin nullable
ALTER TABLE "public"."arrets_production" ALTER COLUMN "heure_fin" DROP NOT NULL;