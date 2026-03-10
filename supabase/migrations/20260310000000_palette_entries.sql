-- Table pour les données PALETTE (chargements bouteilles + palettes)

CREATE TABLE public.palette_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    client text NOT NULL CHECK (client IN ('PETRO_IVOIRE', 'TOTAL_ENERGIES', 'VIVO_ENERGY')),
    mandataire_id uuid NOT NULL,
    capacite integer NOT NULL DEFAULT 0, -- en Kg
    num_camion text,
    -- Bouteilles
    b6 integer NOT NULL DEFAULT 0,
    b12 integer NOT NULL DEFAULT 0,
    b28 integer NOT NULL DEFAULT 0,
    b38 integer NOT NULL DEFAULT 0,
    -- Palettes
    palette_b6_normale integer NOT NULL DEFAULT 0,
    palette_b6_courte integer NOT NULL DEFAULT 0,
    palette_b12_ordinaire integer NOT NULL DEFAULT 0,
    palette_b12_superpo integer NOT NULL DEFAULT 0,
    -- Metadata
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.palette_entries
    ADD CONSTRAINT palette_entries_pkey PRIMARY KEY (id);

-- FK vers mandataires
ALTER TABLE ONLY public.palette_entries
    ADD CONSTRAINT palette_entries_mandataire_fkey
    FOREIGN KEY (mandataire_id) REFERENCES public.mandataires(id) ON DELETE RESTRICT;

-- Index sur la date pour les filtres
CREATE INDEX palette_entries_date_idx ON public.palette_entries USING btree (date);

-- Index sur client
CREATE INDEX palette_entries_client_idx ON public.palette_entries USING btree (client);

-- RLS
ALTER TABLE public.palette_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "palette_entries_all"
    ON public.palette_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);
