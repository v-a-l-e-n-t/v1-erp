-- Table de suivi de présence des agents par shift et par ligne.
-- Permet de savoir quels agents étaient présents/absents pour un shift donné.
CREATE TABLE IF NOT EXISTS public.shift_agent_presences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     uuid NOT NULL REFERENCES public.production_shifts(id) ON DELETE CASCADE,
  agent_id     uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  numero_ligne smallint NOT NULL CHECK (numero_ligne BETWEEN 0 AND 5),
  present      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shift_id, agent_id, numero_ligne)
);

CREATE INDEX IF NOT EXISTS shift_agent_presences_shift_idx
  ON public.shift_agent_presences (shift_id);

CREATE INDEX IF NOT EXISTS shift_agent_presences_agent_idx
  ON public.shift_agent_presences (agent_id);

ALTER TABLE public.shift_agent_presences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enable all access for all users"
    ON public.shift_agent_presences FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.shift_agent_presences IS
  'Présence/absence des agents par shift et ligne. numero_ligne=0 = niveau shift.';
