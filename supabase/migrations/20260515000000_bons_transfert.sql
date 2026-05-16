-- Module /rapport-bl : suivi des bons de transfert papier déposés par les
-- clients (SIMAM, PETROIVOIRE, VIVO, TOTAL) et consommés au fil des
-- chargements citernes.
--
-- Cycle de vie d'un bon :
--   disponible → utilise (lors de l'import de l'extraction pesée)
--   → annule (geste manuel optionnel)
--
-- Le couple (client, numero_bon) est unique : on ne peut pas avoir deux fois
-- le même numéro pour un même client.

DO $$ BEGIN
  CREATE TYPE bon_client_t AS ENUM ('SIMAM', 'PETROIVOIRE', 'VIVO', 'TOTAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bon_statut_t AS ENUM ('disponible', 'utilise', 'annule');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.bons_transfert (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client           bon_client_t NOT NULL,
  numero_bon       text         NOT NULL,
  statut           bon_statut_t NOT NULL DEFAULT 'disponible',
  date_reception   date         NOT NULL,
  date_edition     date,        -- date d'édition du bon (peut différer de la réception physique)
  batch_id         uuid,
  date_sortie      date,
  citerne          text,
  poids_net_kg     numeric(10,2),
  commentaire      text,
  user_id          uuid,
  last_modified_by text,
  last_modified_at timestamptz  DEFAULT now(),
  created_at       timestamptz  DEFAULT now(),
  UNIQUE (client, numero_bon)
);

CREATE INDEX IF NOT EXISTS bons_transfert_statut_idx
  ON public.bons_transfert (statut);
CREATE INDEX IF NOT EXISTS bons_transfert_date_sortie_idx
  ON public.bons_transfert (date_sortie DESC);
CREATE INDEX IF NOT EXISTS bons_transfert_client_idx
  ON public.bons_transfert (client);

ALTER TABLE public.bons_transfert ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enable all access for all users"
    ON public.bons_transfert FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE  public.bons_transfert IS 'Bons de transfert papier déposés par les clients et consommés par les citernes.';
COMMENT ON COLUMN public.bons_transfert.batch_id IS 'Regroupe une plage saisie en une fois (ex 0007493 → 0007550).';
COMMENT ON COLUMN public.bons_transfert.date_sortie IS 'Renseigné lors de l''import de l''extraction pesée.';
