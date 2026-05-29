-- =============================================================================
-- Module Equipements de production.
--
-- Modele : catalogue + affectation many-to-many aux lignes.
--   - equipements : le catalogue (1 ligne par type d'equipement).
--   - equipements_lignes : pour chaque (equipement, ligne) on stocke un flag
--     actif et un motif texte si actif=false.
--
-- Convention front : si une row equipements_lignes existe pour
-- (equipement_id, numero_ligne), elle est consideree comme "affectee a cette
-- ligne". Active par defaut, devient inactive seulement si l'utilisateur
-- decoche dans la popup "Gerer equipements" — auquel cas un motif est
-- obligatoire cote front (texte libre).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.equipements (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom               text NOT NULL,
    code              text,
    actif             boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    last_modified_by  text,
    last_modified_at  timestamptz
);

CREATE INDEX IF NOT EXISTS equipements_actif_idx ON public.equipements (actif);

CREATE TABLE IF NOT EXISTS public.equipements_lignes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipement_id     uuid NOT NULL REFERENCES public.equipements(id) ON DELETE CASCADE,
    numero_ligne      int  NOT NULL CHECK (numero_ligne BETWEEN 1 AND 5),
    actif             boolean NOT NULL DEFAULT true,
    motif_inactif     text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    last_modified_by  text,
    last_modified_at  timestamptz,
    UNIQUE (equipement_id, numero_ligne)
);

CREATE INDEX IF NOT EXISTS equipements_lignes_ligne_idx ON public.equipements_lignes (numero_ligne);
CREATE INDEX IF NOT EXISTS equipements_lignes_equipement_idx ON public.equipements_lignes (equipement_id);

-- RLS : aligne sur le reste du projet (permissive en attendant la migration auth).
ALTER TABLE public.equipements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipements_lignes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipements_all ON public.equipements;
CREATE POLICY equipements_all ON public.equipements
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS equipements_lignes_all ON public.equipements_lignes;
CREATE POLICY equipements_lignes_all ON public.equipements_lignes
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at (last_modified_at auto si non fourni par le client).
CREATE OR REPLACE FUNCTION public.set_last_modified_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.last_modified_at IS NULL OR NEW.last_modified_at = OLD.last_modified_at THEN
        NEW.last_modified_at = now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipements_last_modified ON public.equipements;
CREATE TRIGGER equipements_last_modified
    BEFORE UPDATE ON public.equipements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_last_modified_at();

DROP TRIGGER IF EXISTS equipements_lignes_last_modified ON public.equipements_lignes;
CREATE TRIGGER equipements_lignes_last_modified
    BEFORE UPDATE ON public.equipements_lignes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_last_modified_at();
