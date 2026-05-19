-- Phase 1 du refactor /agents :
-- 1) Table `roles` éditable (CRUD côté UI) en remplacement de l'enum
--    hardcodé. On supprime le CHECK sur agents.role pour rendre les rôles
--    libres ; le couplage applicatif se fait par `roles.code` = `agents.role`.
-- 2) Table de jointure `agents_lignes` pour permettre l'affectation
--    multi-lignes d'un agent (un agent peut tourner sur L1 et L3).
--    L'affectation est optionnelle (ex : un chef de quart n'a pas de ligne).
-- 3) Ajout de `duree_minutes` sur arrets_production pour la décomposition
--    des sous-arrêts par type (somme = durée globale d'arrêt de la ligne).

-- ============ 1. ROLES ============
CREATE TABLE IF NOT EXISTS public.roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  label      text NOT NULL,
  actif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all access for all users"
    ON public.roles FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed avec les rôles existants
INSERT INTO public.roles (code, label) VALUES
  ('chef_ligne',          'Chef de ligne'),
  ('chef_quart',          'Chef de quart'),
  ('chef_equipe_atelier', 'Chef d''équipe atelier'),
  ('agent_exploitation',  'Agent d''exploitation'),
  ('agent_mouvement',     'Agent mouvement')
ON CONFLICT (code) DO NOTHING;

-- Lever le CHECK sur agents.role (devient libre)
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_role_check;

COMMENT ON TABLE public.roles IS 'Rôles agents — éditable depuis /agents.';

-- ============ 2. AGENTS_LIGNES (affectation multi-lignes) ============
CREATE TABLE IF NOT EXISTS public.agents_lignes (
  agent_id     uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  numero_ligne smallint NOT NULL CHECK (numero_ligne BETWEEN 1 AND 5),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, numero_ligne)
);

CREATE INDEX IF NOT EXISTS agents_lignes_ligne_idx
  ON public.agents_lignes (numero_ligne);

ALTER TABLE public.agents_lignes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all access for all users"
    ON public.agents_lignes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.agents_lignes IS
  'Affectation multi-lignes d''un agent (optionnelle, 0..N lignes par agent).';

-- ============ 3. arrets_production.duree_minutes ============
ALTER TABLE public.arrets_production
  ADD COLUMN IF NOT EXISTS duree_minutes integer;

COMMENT ON COLUMN public.arrets_production.duree_minutes IS
  'Durée en minutes de CE sous-arrêt. La somme des sous-arrêts par ligne ' ||
  'doit égaler lignes_production.temps_arret_ligne_minutes (durée globale).';
