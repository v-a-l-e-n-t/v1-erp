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

--
-- PostgreSQL database dump complete
--


