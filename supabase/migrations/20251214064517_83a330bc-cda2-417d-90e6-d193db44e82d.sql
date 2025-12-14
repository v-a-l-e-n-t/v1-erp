-- Create destinations_geolocation table for Côte d'Ivoire cities
CREATE TABLE public.destinations_geolocation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL UNIQUE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.destinations_geolocation ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to geolocation"
  ON public.destinations_geolocation
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to geolocation"
  ON public.destinations_geolocation
  FOR INSERT
  WITH CHECK (true);

-- Insert major Côte d'Ivoire cities with coordinates
INSERT INTO public.destinations_geolocation (destination, latitude, longitude, region) VALUES
  ('ABIDJAN', 5.3600, -4.0083, 'District Autonome d''Abidjan'),
  ('BOUAKE', 7.6881, -5.0305, 'Vallée du Bandama'),
  ('YAMOUSSOUKRO', 6.8206, -5.2767, 'Lacs'),
  ('SAN-PEDRO', 4.7485, -6.6363, 'Bas-Sassandra'),
  ('KORHOGO', 9.4580, -5.6293, 'Savanes'),
  ('MAN', 7.4125, -7.5536, 'Montagnes'),
  ('DALOA', 6.8774, -6.4502, 'Sassandra-Marahoué'),
  ('GAGNOA', 6.1319, -5.9506, 'Gôh-Djiboua'),
  ('DIVO', 5.8372, -5.3573, 'Gôh-Djiboua'),
  ('AGBOVILLE', 5.9286, -4.2136, 'Agnéby-Tiassa'),
  ('ABENGOUROU', 6.7297, -3.4964, 'Comoé'),
  ('BONDOUKOU', 8.0404, -2.8000, 'Zanzan'),
  ('FERKESSEDOUGOU', 9.5933, -5.1947, 'Savanes'),
  ('ODIENNE', 9.5089, -7.5650, 'Denguélé'),
  ('SEGUELA', 7.9614, -6.6731, 'Worodougou'),
  ('SASSANDRA', 4.9500, -6.0833, 'Bas-Sassandra'),
  ('GRAND-BASSAM', 5.2139, -3.7356, 'Sud-Comoé'),
  ('DAOUKRO', 7.0500, -3.9667, 'Iffou'),
  ('BINGERVILLE', 5.3528, -3.8917, 'District Autonome d''Abidjan'),
  ('ANYAMA', 5.4917, -4.0542, 'District Autonome d''Abidjan'),
  ('YOPOUGON', 5.3167, -4.0667, 'District Autonome d''Abidjan'),
  ('ABOBO', 5.4167, -4.0167, 'District Autonome d''Abidjan'),
  ('COCODY', 5.3500, -3.9833, 'District Autonome d''Abidjan'),
  ('MARCORY', 5.3000, -3.9833, 'District Autonome d''Abidjan'),
  ('TREICHVILLE', 5.2833, -3.9833, 'District Autonome d''Abidjan'),
  ('PORT-BOUET', 5.2500, -3.9333, 'District Autonome d''Abidjan'),
  ('KOUMASSI', 5.3000, -3.9500, 'District Autonome d''Abidjan'),
  ('ADJAME', 5.3667, -4.0167, 'District Autonome d''Abidjan'),
  ('PLATEAU', 5.3167, -4.0167, 'District Autonome d''Abidjan'),
  ('SOUBRE', 5.7833, -6.5833, 'Nawa'),
  ('ISSIA', 6.4833, -6.5833, 'Haut-Sassandra'),
  ('SINFRA', 6.6167, -5.9167, 'Marahoué'),
  ('BOUAFLE', 6.9833, -5.7500, 'Marahoué'),
  ('TOUMODI', 6.5500, -5.0167, 'Bélier'),
  ('TIASSALE', 5.8833, -4.8333, 'Agnéby-Tiassa'),
  ('ADZOPE', 6.1056, -3.8614, 'La Mé'),
  ('DABOU', 5.3247, -4.3769, 'Grands-Ponts'),
  ('JACQUEVILLE', 5.2028, -4.4128, 'Grands-Ponts'),
  ('BONOUA', 5.2719, -3.5958, 'Sud-Comoé'),
  ('ASSINIE', 5.1500, -3.3000, 'Sud-Comoé');

-- Create index for faster lookups
CREATE INDEX idx_destinations_destination ON public.destinations_geolocation(destination);