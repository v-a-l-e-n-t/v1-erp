-- Créer la table pour les chefs de quart
CREATE TABLE IF NOT EXISTS public.chefs_quart (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  prenom text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chefs_quart ENABLE ROW LEVEL SECURITY;

-- Policies pour les chefs de quart (similaires aux chefs de ligne)
CREATE POLICY "Admins can manage chefs de quart"
ON public.chefs_quart
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Chef depot can view chefs de quart"
ON public.chefs_quart
FOR SELECT
USING (has_role(auth.uid(), 'chef_depot'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insérer les chefs de ligne
INSERT INTO public.chefs_ligne (nom, prenom) VALUES
('ANOH', 'MANGOUA'),
('DOUKROU', 'BONAVENTURE'),
('HUE', 'BI'),
('LIGUE', 'WILLIAM'),
('KOFFI', 'SIDJANE JULES'),
('KOFFI', 'REGIS'),
('COULIBALY', 'SALIMATA'),
('KOUASSI', 'CABALANE'),
('AHOUA', 'GRACE'),
('YANTCHE', 'RICHARD'),
('KODJO', 'AKA BILE'),
('LEGNANKOU', 'ALEXANDRE'),
('COULIBALY', 'TOUSSAINT');

-- Insérer les chefs de quart
INSERT INTO public.chefs_quart (nom, prenom) VALUES
('MOTE', 'JEAN WILLIAMS'),
('BOMISSO', 'DIROTO ALFRED');