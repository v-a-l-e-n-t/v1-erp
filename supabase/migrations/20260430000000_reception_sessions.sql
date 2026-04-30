-- =============================================================================
-- Reception sessions : 1 ligne = 1 calcul de réception sur 1 sphère
-- Plusieurs lignes peuvent partager le même numero_reception (= même navire,
-- transferts successifs vers S01 / S02 / S03).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reception_sessions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    user_name                text NOT NULL DEFAULT 'Anonyme',

    -- Identification de la réception (entête du cahier des charges §3.1)
    sphere_id                text NOT NULL CHECK (sphere_id IN ('S01','S02','S03')),
    numero_reception         text,
    depot                    text,
    produit                  text,
    origine_navire           text,
    inspecteur               text,
    date_mise_sous_douane    timestamptz,
    date_debut_transfert     timestamptz,
    date_fin_transfert       timestamptz,
    date_deblocage           timestamptz,
    date_jauge_controle      timestamptz,

    -- Inputs et résultats (JSONB pour ne pas figer le schéma)
    inputs_avant             jsonb NOT NULL,
    inputs_apres             jsonb NOT NULL,
    results                  jsonb NOT NULL,

    -- Répartition par marketer (% par société + kg correspondants)
    marketer_repartition     jsonb,

    -- KPI dénormalisé pour la liste d'historique (en kg)
    masse_transferee_kg      numeric,

    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reception_sessions_created_at_idx
    ON public.reception_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS reception_sessions_numero_idx
    ON public.reception_sessions (numero_reception);

ALTER TABLE public.reception_sessions ENABLE ROW LEVEL SECURITY;

-- Lecture / écriture / suppression ouvertes (auth applicative côté front,
-- même politique que stock_sphere_sessions). À durcir le jour où tout passe
-- sur Supabase Auth proprement.
DROP POLICY IF EXISTS reception_sessions_select_anon  ON public.reception_sessions;
CREATE POLICY reception_sessions_select_anon  ON public.reception_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS reception_sessions_insert_anon  ON public.reception_sessions;
CREATE POLICY reception_sessions_insert_anon  ON public.reception_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS reception_sessions_update_anon  ON public.reception_sessions;
CREATE POLICY reception_sessions_update_anon  ON public.reception_sessions FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reception_sessions_delete_anon  ON public.reception_sessions;
CREATE POLICY reception_sessions_delete_anon  ON public.reception_sessions FOR DELETE USING (true);
