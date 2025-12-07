alter table "public"."arrets_production" add column "duree_minutes" numeric;
alter table "public"."arrets_production" alter column "heure_debut" drop not null;
alter table "public"."arrets_production" alter column "heure_fin" drop not null;
