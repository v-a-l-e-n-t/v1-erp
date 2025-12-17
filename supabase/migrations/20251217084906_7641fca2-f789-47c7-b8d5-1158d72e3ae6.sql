-- Create vrac_clients table
CREATE TABLE public.vrac_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    nom_affichage TEXT NOT NULL,
    champ_sortie_vrac TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vrac_users table
CREATE TABLE public.vrac_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.vrac_clients(id) ON DELETE CASCADE,
    nom TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create vrac_demandes_chargement table
CREATE TABLE public.vrac_demandes_chargement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.vrac_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.vrac_users(id) ON DELETE SET NULL,
    date_chargement DATE NOT NULL,
    immatriculation_tracteur TEXT NOT NULL,
    immatriculation_citerne TEXT NOT NULL,
    numero_bon TEXT,
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'charge')),
    tonnage_charge NUMERIC,
    validated_by UUID,
    validated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vrac_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vrac_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vrac_demandes_chargement ENABLE ROW LEVEL SECURITY;

-- RLS policies for vrac_clients (public read, admin write)
CREATE POLICY "Allow public read on vrac_clients"
ON public.vrac_clients FOR SELECT
USING (true);

CREATE POLICY "Allow admin write on vrac_clients"
ON public.vrac_clients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for vrac_users (public read, admin write)
CREATE POLICY "Allow public read on vrac_users"
ON public.vrac_users FOR SELECT
USING (true);

CREATE POLICY "Allow admin write on vrac_users"
ON public.vrac_users FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for vrac_demandes_chargement (public access for now)
CREATE POLICY "Allow all operations on vrac_demandes"
ON public.vrac_demandes_chargement FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_vrac_users_client_id ON public.vrac_users(client_id);
CREATE INDEX idx_vrac_demandes_client_id ON public.vrac_demandes_chargement(client_id);
CREATE INDEX idx_vrac_demandes_date ON public.vrac_demandes_chargement(date_chargement);
CREATE INDEX idx_vrac_demandes_statut ON public.vrac_demandes_chargement(statut);

-- Trigger for updated_at
CREATE TRIGGER update_vrac_demandes_updated_at
BEFORE UPDATE ON public.vrac_demandes_chargement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();