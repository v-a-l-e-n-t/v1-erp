-- Table des mandataires
CREATE TABLE public.mandataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des ventes par mandataire
CREATE TABLE public.ventes_mandataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  mandataire_id UUID NOT NULL REFERENCES public.mandataires(id) ON DELETE CASCADE,
  camion TEXT,
  client TEXT,
  numero_bon_sortie TEXT NOT NULL UNIQUE,
  destination TEXT,
  r_b6 INTEGER DEFAULT 0,
  r_b12 INTEGER DEFAULT 0,
  r_b28 INTEGER DEFAULT 0,
  r_b38 INTEGER DEFAULT 0,
  r_b11_carbu INTEGER DEFAULT 0,
  c_b6 INTEGER DEFAULT 0,
  c_b12 INTEGER DEFAULT 0,
  c_b28 INTEGER DEFAULT 0,
  c_b38 INTEGER DEFAULT 0,
  c_b11_carbu INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_ventes_mandataires_date ON public.ventes_mandataires(date);
CREATE INDEX idx_ventes_mandataires_mandataire ON public.ventes_mandataires(mandataire_id);
CREATE INDEX idx_ventes_mandataires_destination ON public.ventes_mandataires(destination);

-- Enable RLS
ALTER TABLE public.mandataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes_mandataires ENABLE ROW LEVEL SECURITY;

-- Policies pour accès public (comme les autres tables du projet)
CREATE POLICY "Allow all operations on mandataires"
ON public.mandataires
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on ventes_mandataires"
ON public.ventes_mandataires
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_ventes_mandataires_updated_at
BEFORE UPDATE ON public.ventes_mandataires
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();