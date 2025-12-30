-- Table pour les données ATELIER (bouteilles traitées)
CREATE TABLE public.atelier_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    shift_type public.shift_type NOT NULL,
    chef_quart_id uuid NOT NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.atelier_entries
    ADD CONSTRAINT atelier_entries_pkey PRIMARY KEY (id);

-- Unicité par date + shift (pas de doublon)
CREATE UNIQUE INDEX atelier_entries_date_shift_key
    ON public.atelier_entries USING btree (date, shift_type);

-- FK vers agents (chef de quart)
ALTER TABLE ONLY public.atelier_entries
    ADD CONSTRAINT atelier_entries_chef_quart_fkey
    FOREIGN KEY (chef_quart_id) REFERENCES public.agents(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.atelier_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (ajuster selon besoins)
CREATE POLICY "Allow all operations on atelier_entries" 
ON public.atelier_entries 
FOR ALL 
USING (true) 
WITH CHECK (true);