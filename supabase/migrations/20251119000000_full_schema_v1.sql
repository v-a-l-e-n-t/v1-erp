--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'chef_depot'
);


--
-- Name: arret_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.arret_type AS ENUM (
    'maintenance_corrective',
    'manque_personnel',
    'probleme_approvisionnement',
    'panne_ligne',
    'autre'
);


--
-- Name: etape_ligne; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.etape_ligne AS ENUM (
    'BASCULES',
    'PURGE',
    'CONTROLE',
    'ETANCHEITE',
    'CAPSULAGE',
    'VIDANGE',
    'PALETTISEUR',
    'TRI',
    'AUTRE'
);


--
-- Name: ligne_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ligne_type AS ENUM (
    'B6_L1',
    'B6_L2',
    'B6_L3',
    'B6_L4',
    'B12'
);


--
-- Name: shift_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_type AS ENUM (
    '10h-19h',
    '20h-5h'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: arrets_production; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arrets_production (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    type_arret public.arret_type NOT NULL,
    etape_ligne public.etape_ligne,
    description text,
    action_corrective text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lignes_concernees integer[],
    ordre_intervention text
);


--
-- Name: bilan_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bilan_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    stock_initial numeric DEFAULT 0 NOT NULL,
    reception_gpl numeric DEFAULT 0 NOT NULL,
    receptions jsonb DEFAULT '[]'::jsonb NOT NULL,
    sorties_vrac numeric DEFAULT 0 NOT NULL,
    sorties_conditionnees numeric DEFAULT 0 NOT NULL,
    fuyardes numeric DEFAULT 0 NOT NULL,
    cumul_sorties numeric DEFAULT 0 NOT NULL,
    stock_theorique numeric DEFAULT 0 NOT NULL,
    stock_final numeric DEFAULT 0 NOT NULL,
    bilan numeric DEFAULT 0 NOT NULL,
    nature text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    spheres_initial numeric DEFAULT 0 NOT NULL,
    bouteilles_initial numeric DEFAULT 0 NOT NULL,
    reservoirs_initial numeric DEFAULT 0 NOT NULL,
    spheres_final numeric DEFAULT 0 NOT NULL,
    bouteilles_final numeric DEFAULT 0 NOT NULL,
    reservoirs_final numeric DEFAULT 0 NOT NULL,
    user_id uuid,
    sorties_vrac_simam numeric DEFAULT 0,
    sorties_vrac_petro_ivoire numeric DEFAULT 0,
    sorties_vrac_vivo_energies numeric DEFAULT 0,
    sorties_vrac_total_energies numeric DEFAULT 0,
    sorties_conditionnees_petro_ivoire numeric DEFAULT 0,
    sorties_conditionnees_vivo_energies numeric DEFAULT 0,
    sorties_conditionnees_total_energies numeric DEFAULT 0,
    fuyardes_petro_ivoire numeric DEFAULT 0,
    fuyardes_vivo_energies numeric DEFAULT 0,
    fuyardes_total_energies numeric DEFAULT 0
);


--
-- Name: chefs_ligne; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chefs_ligne (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chefs_quart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chefs_quart (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    prenom text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lignes_production; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lignes_production (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    numero_ligne integer NOT NULL,
    chef_ligne_id uuid,
    recharges_petro_b6 integer DEFAULT 0,
    recharges_petro_b12 integer DEFAULT 0,
    recharges_total_b6 integer DEFAULT 0,
    recharges_total_b12 integer DEFAULT 0,
    recharges_vivo_b6 integer DEFAULT 0,
    recharges_vivo_b12 integer DEFAULT 0,
    consignes_petro_b6 integer DEFAULT 0,
    consignes_petro_b12 integer DEFAULT 0,
    consignes_total_b6 integer DEFAULT 0,
    consignes_total_b12 integer DEFAULT 0,
    consignes_vivo_b6 integer DEFAULT 0,
    consignes_vivo_b12 integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cumul_recharges_b6 integer DEFAULT 0,
    cumul_recharges_b12 integer DEFAULT 0,
    cumul_consignes_b6 integer DEFAULT 0,
    cumul_consignes_b12 integer DEFAULT 0,
    tonnage_ligne numeric(10,3) DEFAULT 0,
    nombre_agents integer DEFAULT 0
);


--
-- Name: production_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    shift_type public.shift_type NOT NULL,
    chef_ligne_id uuid,
    heure_debut_theorique time without time zone NOT NULL,
    heure_fin_theorique time without time zone NOT NULL,
    heure_debut_reelle time without time zone NOT NULL,
    heure_fin_reelle time without time zone NOT NULL,
    bouteilles_produites integer DEFAULT 0 NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    chef_quart_id uuid,
    tonnage_total numeric(10,3) DEFAULT 0,
    cumul_recharges_total integer DEFAULT 0,
    cumul_consignes_total integer DEFAULT 0,
    temps_arret_total_minutes integer DEFAULT 0
);


--
-- Name: sphere_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sphere_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    sphere_number integer NOT NULL,
    calculation_date timestamp with time zone DEFAULT now() NOT NULL,
    hauteur_mm numeric NOT NULL,
    temperature_liquide_c numeric NOT NULL,
    temperature_gazeuse_c numeric NOT NULL,
    pression_sphere_barg numeric NOT NULL,
    densite_d15 numeric NOT NULL,
    tl_min numeric NOT NULL,
    tl_max numeric NOT NULL,
    d_min numeric NOT NULL,
    d_max numeric NOT NULL,
    tg_min numeric NOT NULL,
    tg_max numeric NOT NULL,
    ps_min numeric NOT NULL,
    ps_max numeric NOT NULL,
    volume_liquide_l numeric NOT NULL,
    volume_gazeux_l numeric NOT NULL,
    masse_volumique_butane_kgl numeric NOT NULL,
    masse_produit_kg numeric NOT NULL,
    masse_total_liquide_kg numeric NOT NULL,
    masse_total_gaz_kg numeric NOT NULL,
    masse_liquide_gaz_kg numeric NOT NULL,
    creux_kg numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sphere_calibration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sphere_calibration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sphere_number integer NOT NULL,
    height_mm integer NOT NULL,
    capacity_l numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: arrets_production arrets_production_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arrets_production
    ADD CONSTRAINT arrets_production_pkey PRIMARY KEY (id);


--
-- Name: bilan_entries bilan_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bilan_entries
    ADD CONSTRAINT bilan_entries_pkey PRIMARY KEY (id);


--
-- Name: chefs_ligne chefs_ligne_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chefs_ligne
    ADD CONSTRAINT chefs_ligne_pkey PRIMARY KEY (id);


--
-- Name: chefs_quart chefs_quart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chefs_quart
    ADD CONSTRAINT chefs_quart_pkey PRIMARY KEY (id);


--
-- Name: lignes_production lignes_production_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lignes_production
    ADD CONSTRAINT lignes_production_pkey PRIMARY KEY (id);


--
-- Name: production_shifts production_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_shifts
    ADD CONSTRAINT production_shifts_pkey PRIMARY KEY (id);


--
-- Name: sphere_calculations sphere_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sphere_calculations
    ADD CONSTRAINT sphere_calculations_pkey PRIMARY KEY (id);


--
-- Name: sphere_calibration sphere_calibration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sphere_calibration
    ADD CONSTRAINT sphere_calibration_pkey PRIMARY KEY (id);


--
-- Name: sphere_calibration sphere_calibration_sphere_number_height_mm_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sphere_calibration
    ADD CONSTRAINT sphere_calibration_sphere_number_height_mm_key UNIQUE (sphere_number, height_mm);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_arrets_production_lignes_concernees; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arrets_production_lignes_concernees ON public.arrets_production USING gin (lignes_concernees);


--
-- Name: idx_bilan_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bilan_entries_date ON public.bilan_entries USING btree (date);


--
-- Name: idx_lignes_production_chef_ligne_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lignes_production_chef_ligne_id ON public.lignes_production USING btree (chef_ligne_id);


--
-- Name: idx_lignes_production_shift_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lignes_production_shift_id ON public.lignes_production USING btree (shift_id);


--
-- Name: idx_sphere_calculations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sphere_calculations_date ON public.sphere_calculations USING btree (calculation_date DESC);


--
-- Name: idx_sphere_calculations_sphere; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sphere_calculations_sphere ON public.sphere_calculations USING btree (sphere_number);


--
-- Name: idx_sphere_calibration_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sphere_calibration_lookup ON public.sphere_calibration USING btree (sphere_number, height_mm);


--
-- Name: arrets_production update_arrets_production_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_arrets_production_updated_at BEFORE UPDATE ON public.arrets_production FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bilan_entries update_bilan_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bilan_entries_updated_at BEFORE UPDATE ON public.bilan_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chefs_ligne update_chefs_ligne_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chefs_ligne_updated_at BEFORE UPDATE ON public.chefs_ligne FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lignes_production update_lignes_production_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lignes_production_updated_at BEFORE UPDATE ON public.lignes_production FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: production_shifts update_production_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_production_shifts_updated_at BEFORE UPDATE ON public.production_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sphere_calculations update_sphere_calculations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sphere_calculations_updated_at BEFORE UPDATE ON public.sphere_calculations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: arrets_production arrets_production_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arrets_production
    ADD CONSTRAINT arrets_production_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.production_shifts(id) ON DELETE CASCADE;


--
-- Name: lignes_production lignes_production_chef_ligne_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lignes_production
    ADD CONSTRAINT lignes_production_chef_ligne_id_fkey FOREIGN KEY (chef_ligne_id) REFERENCES public.chefs_ligne(id);


--
-- Name: lignes_production lignes_production_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lignes_production
    ADD CONSTRAINT lignes_production_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.production_shifts(id) ON DELETE CASCADE;


--
-- Name: production_shifts production_shifts_chef_ligne_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_shifts
    ADD CONSTRAINT production_shifts_chef_ligne_id_fkey FOREIGN KEY (chef_ligne_id) REFERENCES public.chefs_ligne(id) ON DELETE SET NULL;


--
-- Name: user_roles Admins can manage all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all user roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chefs_ligne Admins can manage chefs de ligne; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chefs de ligne" ON public.chefs_ligne USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chefs_quart Admins can manage chefs de quart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chefs de quart" ON public.chefs_quart USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bilan_entries Allow all operations for everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations for everyone" ON public.bilan_entries USING (true) WITH CHECK (true);


--
-- Name: arrets_production Allow all operations on arrets_production; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on arrets_production" ON public.arrets_production USING (true) WITH CHECK (true);


--
-- Name: sphere_calculations Allow all operations on calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on calculations" ON public.sphere_calculations USING (true);


--
-- Name: lignes_production Allow all operations on lignes_production; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on lignes_production" ON public.lignes_production USING (true) WITH CHECK (true);


--
-- Name: production_shifts Allow all operations on production_shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on production_shifts" ON public.production_shifts USING (true) WITH CHECK (true);


--
-- Name: sphere_calibration Allow public insert to calibration data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to calibration data" ON public.sphere_calibration FOR INSERT WITH CHECK (true);


--
-- Name: sphere_calibration Allow public read access to calibration data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to calibration data" ON public.sphere_calibration FOR SELECT USING (true);


--
-- Name: chefs_ligne Chef depot can view chefs de ligne; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chef depot can view chefs de ligne" ON public.chefs_ligne FOR SELECT USING ((public.has_role(auth.uid(), 'chef_depot'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: chefs_quart Chef depot can view chefs de quart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chef depot can view chefs de quart" ON public.chefs_quart FOR SELECT USING ((public.has_role(auth.uid(), 'chef_depot'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: chefs_ligne Public can view chefs de ligne; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view chefs de ligne" ON public.chefs_ligne FOR SELECT TO authenticated, anon USING (true);


--
-- Name: chefs_quart Public can view chefs de quart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view chefs de quart" ON public.chefs_quart FOR SELECT TO authenticated, anon USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: arrets_production; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.arrets_production ENABLE ROW LEVEL SECURITY;

--
-- Name: bilan_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bilan_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: chefs_ligne; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chefs_ligne ENABLE ROW LEVEL SECURITY;

--
-- Name: chefs_quart; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chefs_quart ENABLE ROW LEVEL SECURITY;

--
-- Name: lignes_production; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lignes_production ENABLE ROW LEVEL SECURITY;

--
-- Name: production_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.production_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: sphere_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sphere_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: sphere_calibration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sphere_calibration ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PostgreSQL database dump complete

-- ============================================================================
-- PART 1: Update production_shifts table
-- ============================================================================
-- Add personnel fields if they don't exist (from the form)
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS chariste integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chariot integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_quai integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_saisie integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_atelier integer DEFAULT 0;

-- Ensure all calculated KPI fields exist
ALTER TABLE public.production_shifts
ADD COLUMN IF NOT EXISTS tonnage_total numeric(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_total integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS temps_arret_total_minutes integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.production_shifts.heure_debut_theorique IS 'Heure de début prévue selon le type de shift (10h ou 20h)';
COMMENT ON COLUMN public.production_shifts.heure_fin_theorique IS 'Heure de fin prévue selon le type de shift (19h ou 5h)';
COMMENT ON COLUMN public.production_shifts.heure_debut_reelle IS 'Heure de début réelle saisie par l''utilisateur - utilisée pour calcul TRS';
COMMENT ON COLUMN public.production_shifts.heure_fin_reelle IS 'Heure de fin réelle saisie par l''utilisateur - utilisée pour calcul TRS';
COMMENT ON COLUMN public.production_shifts.chariste IS 'Nombre de charistes présents durant le shift';
COMMENT ON COLUMN public.production_shifts.chariot IS 'Nombre de chariots utilisés durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_quai IS 'Nombre d''agents de quai présents durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_saisie IS 'Nombre d''agents de saisie présents durant le shift';
COMMENT ON COLUMN public.production_shifts.agent_atelier IS 'Nombre d''agents d''atelier présents durant le shift';
COMMENT ON COLUMN public.production_shifts.tonnage_total IS 'Tonnage total produit (calculé) - somme des tonnages de toutes les lignes';
COMMENT ON COLUMN public.production_shifts.bouteilles_produites IS 'Nombre total de bouteilles produites (calculé) - tous types confondus';
COMMENT ON COLUMN public.production_shifts.cumul_recharges_total IS 'Cumul total des recharges (calculé) - toutes lignes et types de bouteilles';
COMMENT ON COLUMN public.production_shifts.cumul_consignes_total IS 'Cumul total des consignes (calculé) - toutes lignes et types de bouteilles';
COMMENT ON COLUMN public.production_shifts.temps_arret_total_minutes IS 'Temps d''arrêt total en minutes (calculé) - somme de tous les arrêts du shift';

-- ============================================================================
-- PART 2: Update lignes_production table
-- ============================================================================
-- Add B28 and B38 fields for all bottle types (Ligne 5 only uses these)
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS recharges_petro_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_petro_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_total_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_total_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_vivo_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recharges_vivo_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_petro_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_petro_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_total_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_total_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_vivo_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS consignes_vivo_b38 integer DEFAULT 0;

-- Add cumulative fields for B28 and B38
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS cumul_recharges_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_recharges_b38 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b28 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cumul_consignes_b38 integer DEFAULT 0;

-- Ensure nombre_agents exists
ALTER TABLE public.lignes_production
ADD COLUMN IF NOT EXISTS nombre_agents integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.lignes_production.numero_ligne IS 'Numéro de ligne (1-5). Lignes 1-4: B6 uniquement. Ligne 5: B12, B28, B38';
COMMENT ON COLUMN public.lignes_production.nombre_agents IS 'Nombre d''agents sur la ligne. Max: L1-2=8, L3-4=14, L5=10';
COMMENT ON COLUMN public.lignes_production.tonnage_ligne IS 'Tonnage total de la ligne (calculé). B6=6kg, B12=12.5kg, B28=28kg, B38=38kg';

-- Recharges comments
COMMENT ON COLUMN public.lignes_production.recharges_petro_b6 IS 'Recharges PETRO IVOIRE - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b12 IS 'Recharges PETRO IVOIRE - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b28 IS 'Recharges PETRO IVOIRE - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_petro_b38 IS 'Recharges PETRO IVOIRE - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.recharges_total_b6 IS 'Recharges TOTAL ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_total_b12 IS 'Recharges TOTAL ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_total_b28 IS 'Recharges TOTAL ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_total_b38 IS 'Recharges TOTAL ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.recharges_vivo_b6 IS 'Recharges VIVO ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b12 IS 'Recharges VIVO ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b28 IS 'Recharges VIVO ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.recharges_vivo_b38 IS 'Recharges VIVO ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

-- Consignes comments
COMMENT ON COLUMN public.lignes_production.consignes_petro_b6 IS 'Consignes PETRO IVOIRE - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b12 IS 'Consignes PETRO IVOIRE - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b28 IS 'Consignes PETRO IVOIRE - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_petro_b38 IS 'Consignes PETRO IVOIRE - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.consignes_total_b6 IS 'Consignes TOTAL ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_total_b12 IS 'Consignes TOTAL ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_total_b28 IS 'Consignes TOTAL ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_total_b38 IS 'Consignes TOTAL ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.consignes_vivo_b6 IS 'Consignes VIVO ENERGIES - Bouteilles B6 (6kg)';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b12 IS 'Consignes VIVO ENERGIES - Bouteilles B12 (12.5kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b28 IS 'Consignes VIVO ENERGIES - Bouteilles B28 (28kg) - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.consignes_vivo_b38 IS 'Consignes VIVO ENERGIES - Bouteilles B38 (38kg) - Ligne 5 uniquement';

-- Cumulative totals comments
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b6 IS 'Cumul recharges B6 (calculé) - Petro + Total + Vivo';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b12 IS 'Cumul recharges B12 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b28 IS 'Cumul recharges B28 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_recharges_b38 IS 'Cumul recharges B38 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';

COMMENT ON COLUMN public.lignes_production.cumul_consignes_b6 IS 'Cumul consignes B6 (calculé) - Petro + Total + Vivo';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b12 IS 'Cumul consignes B12 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b28 IS 'Cumul consignes B28 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';
COMMENT ON COLUMN public.lignes_production.cumul_consignes_b38 IS 'Cumul consignes B38 (calculé) - Petro + Total + Vivo - Ligne 5 uniquement';

-- ============================================================================
-- PART 3: Update arrets_production table
-- ============================================================================
-- Ensure all required fields exist
ALTER TABLE public.arrets_production
ADD COLUMN IF NOT EXISTS lignes_concernees integer[],
ADD COLUMN IF NOT EXISTS ordre_intervention text;

-- Add comments
COMMENT ON COLUMN public.arrets_production.shift_id IS 'Lien vers le shift - les arrêts appartiennent au shift global';
COMMENT ON COLUMN public.arrets_production.lignes_concernees IS 'Tableau des numéros de lignes concernées par cet arrêt (ex: {1,2} pour lignes 1 et 2)';
COMMENT ON COLUMN public.arrets_production.heure_debut IS 'Heure de début de l''arrêt';
COMMENT ON COLUMN public.arrets_production.heure_fin IS 'Heure de fin de l''arrêt';
COMMENT ON COLUMN public.arrets_production.type_arret IS 'Type d''arrêt: maintenance_corrective, manque_personnel, probleme_approvisionnement, panne_ligne, autre';
COMMENT ON COLUMN public.arrets_production.etape_ligne IS 'Étape de la ligne concernée (si type_arret = panne_ligne): BASCULES, PURGE, CONTROLE, etc.';
COMMENT ON COLUMN public.arrets_production.description IS 'Description détaillée de l''arrêt';
COMMENT ON COLUMN public.arrets_production.action_corrective IS 'Action corrective mise en place';
COMMENT ON COLUMN public.arrets_production.ordre_intervention IS 'Numéro d''ordre d''intervention (si applicable)';

-- ============================================================================
-- PART 4: Add indexes for performance
-- ============================================================================
-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_production_shifts_date ON public.production_shifts(date);
CREATE INDEX IF NOT EXISTS idx_production_shifts_shift_type ON public.production_shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_production_shifts_date_shift_type ON public.production_shifts(date, shift_type);
CREATE INDEX IF NOT EXISTS idx_lignes_production_shift_id ON public.lignes_production(shift_id);
CREATE INDEX IF NOT EXISTS idx_lignes_production_numero_ligne ON public.lignes_production(numero_ligne);
CREATE INDEX IF NOT EXISTS idx_arrets_production_shift_id ON public.arrets_production(shift_id);

-- ============================================================================
-- PART 5: Add constraints for data integrity
-- ============================================================================
-- Ensure shift uniqueness (one shift per date/type combination)
CREATE UNIQUE INDEX IF NOT EXISTS unique_shift_date_type 
ON public.production_shifts(date, shift_type);

-- Ensure ligne numbers are valid (1-5)
ALTER TABLE public.lignes_production
DROP CONSTRAINT IF EXISTS check_numero_ligne_valid;

ALTER TABLE public.lignes_production
ADD CONSTRAINT check_numero_ligne_valid 
CHECK (numero_ligne >= 1 AND numero_ligne <= 5);

-- Ensure nombre_agents is within valid ranges
ALTER TABLE public.lignes_production
DROP CONSTRAINT IF EXISTS check_nombre_agents_valid;

ALTER TABLE public.lignes_production
ADD CONSTRAINT check_nombre_agents_valid 
CHECK (nombre_agents >= 0 AND nombre_agents <= 14);

-- ============================================================================
-- PART 6: Table comments for documentation
-- ============================================================================
COMMENT ON TABLE public.production_shifts IS 
'Table principale des shifts de production. Contient les informations globales du shift: date, équipe, heures, personnel, et KPIs calculés (tonnage, bouteilles, temps d''arrêt).';

COMMENT ON TABLE public.lignes_production IS 
'Détails de production par ligne. Lignes 1-4 utilisent uniquement B6. Ligne 5 utilise B12, B28, B38. Contient les compteurs par client (Petro, Total, Vivo) et les cumuls calculés.';

COMMENT ON TABLE public.arrets_production IS 
'Arrêts de production. Liés au shift via shift_id. Peuvent concerner une ou plusieurs lignes (lignes_concernees). Utilisés pour calcul du TRS et analyse des causes d''arrêt.';

-- Supprimer la colonne chef_ligne_id de production_shifts (elle n'a pas de sens ici)
ALTER TABLE public.production_shifts
DROP COLUMN IF EXISTS chef_ligne_id;
