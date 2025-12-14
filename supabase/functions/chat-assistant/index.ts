import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Date calculations
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = today.getMonth() === 0 
      ? `${today.getFullYear() - 1}-12` 
      : `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;

    // Parallel data fetching for performance
    const [
      ventesResult,
      productionResult,
      bilanResult,
      mandatairesResult,
      destinationsResult,
      chefsQuartResult,
      chefsLigneResult,
      spheresResult,
      objectifsResult,
      arretDetailsResult,
      sphereCalibrationResult,
      modificationsResult
    ] = await Promise.all([
      supabase.from('ventes_mandataires').select('*').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(1000),
      supabase.from('production_shifts').select('*, lignes_production(*), arrets_production(*)').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(200),
      supabase.from('bilan_entries').select('*').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(60),
      supabase.from('mandataires').select('*'),
      supabase.from('destinations_geolocation').select('*'),
      supabase.from('chefs_quart').select('*'),
      supabase.from('chefs_ligne').select('*'),
      supabase.from('sphere_calculations').select('*').order('calculation_date', { ascending: false }).limit(20),
      supabase.from('objectifs_mensuels').select('*'),
      supabase.from('arrets_production').select('*').gte('created_at', thirtyDaysAgo),
      supabase.from('sphere_calibration').select('*').order('sphere_number').order('height_mm'),
      supabase.from('production_modifications').select('*').gte('created_at', thirtyDaysAgo).order('modified_at', { ascending: false }).limit(50)
    ]);

    // Extract data
    const ventes = ventesResult.data || [];
    const production = productionResult.data || [];
    const bilan = bilanResult.data || [];
    const mandataires = mandatairesResult.data || [];
    const destinations = destinationsResult.data || [];
    const chefsQuart = chefsQuartResult.data || [];
    const chefsLigne = chefsLigneResult.data || [];
    const spheres = spheresResult.data || [];
    const objectifs = objectifsResult.data || [];
    const arrets = arretDetailsResult.data || [];
    const sphereCalibration = sphereCalibrationResult.data || [];
    const modifications = modificationsResult.data || [];

    // Calculate tonnage for ventes
    const calculateTonnage = (v: any) => {
      return ((v.r_b6 || 0) * 6 + (v.c_b6 || 0) * 6 +
              (v.r_b12 || 0) * 12.5 + (v.c_b12 || 0) * 12.5 +
              (v.r_b28 || 0) * 28 + (v.c_b28 || 0) * 28 +
              (v.r_b38 || 0) * 38 + (v.c_b38 || 0) * 38 +
              (v.r_b11_carbu || 0) * 11 + (v.c_b11_carbu || 0) * 11) / 1000;
    };

    const totalTonnageVentes = ventes.reduce((sum, v) => sum + calculateTonnage(v), 0);
    const totalTonnageProduction = production.reduce((sum, p) => sum + (p.tonnage_total || 0), 0);
    const totalBouteillesProduction = production.reduce((sum, p) => sum + (p.bouteilles_produites || 0), 0);
    const dernierBilan = bilan[0];

    // ============= CHEFS DE LIGNE PERFORMANCE =============
    const statsChefLigne: Record<string, {
      id: string; nom: string; prenom: string;
      tonnageTotal: number; shiftsCount: number; bouteillesTotal: number; dates: string[];
    }> = {};

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        if (ligne.chef_ligne_id) {
          const chef = chefsLigne.find(c => c.id === ligne.chef_ligne_id);
          if (chef) {
            const key = chef.id;
            if (!statsChefLigne[key]) {
              statsChefLigne[key] = { id: chef.id, nom: chef.nom, prenom: chef.prenom, tonnageTotal: 0, shiftsCount: 0, bouteillesTotal: 0, dates: [] };
            }
            statsChefLigne[key].tonnageTotal += ligne.tonnage_ligne || 0;
            statsChefLigne[key].shiftsCount += 1;
            statsChefLigne[key].bouteillesTotal += 
              (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0) +
              (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_recharges_b38 || 0) +
              (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0) +
              (ligne.cumul_consignes_b28 || 0) + (ligne.cumul_consignes_b38 || 0);
            if (!statsChefLigne[key].dates.includes(shift.date)) statsChefLigne[key].dates.push(shift.date);
          }
        }
      });
    });

    const classementChefsLigne = Object.values(statsChefLigne)
      .map(c => ({ ...c, moyenneParShift: c.shiftsCount > 0 ? Math.round((c.tonnageTotal / c.shiftsCount) * 100) / 100 : 0, joursTravailes: c.dates.length }))
      .sort((a, b) => b.tonnageTotal - a.tonnageTotal);

    // ============= CHEFS DE QUART PERFORMANCE =============
    const statsChefQuart: Record<string, {
      id: string; nom: string; prenom: string;
      tonnageSupervise: number; shiftsCount: number; tempsArretTotal: number; dates: string[];
    }> = {};

    production.forEach(shift => {
      if (shift.chef_quart_id) {
        const chef = chefsQuart.find(c => c.id === shift.chef_quart_id);
        if (chef) {
          const key = chef.id;
          if (!statsChefQuart[key]) {
            statsChefQuart[key] = { id: chef.id, nom: chef.nom, prenom: chef.prenom, tonnageSupervise: 0, shiftsCount: 0, tempsArretTotal: 0, dates: [] };
          }
          statsChefQuart[key].tonnageSupervise += shift.tonnage_total || 0;
          statsChefQuart[key].shiftsCount += 1;
          statsChefQuart[key].tempsArretTotal += shift.temps_arret_total_minutes || 0;
          if (!statsChefQuart[key].dates.includes(shift.date)) statsChefQuart[key].dates.push(shift.date);
        }
      }
    });

    const classementChefsQuart = Object.values(statsChefQuart)
      .map(c => ({ ...c, moyenneParShift: c.shiftsCount > 0 ? Math.round((c.tonnageSupervise / c.shiftsCount) * 100) / 100 : 0, moyenneArretParShift: c.shiftsCount > 0 ? Math.round(c.tempsArretTotal / c.shiftsCount) : 0, joursTravailes: c.dates.length }))
      .sort((a, b) => b.tonnageSupervise - a.tonnageSupervise);

    // ============= STATISTIQUES PAR LIGNE DE PRODUCTION (1-5) =============
    const statsLignes: Record<number, { tonnageTotal: number; shiftsCount: number; rechargesTotal: number; consignesTotal: number }> = {
      1: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
      2: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
      3: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
      4: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
      5: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 }
    };

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        const num = ligne.numero_ligne;
        if (num >= 1 && num <= 5) {
          statsLignes[num].tonnageTotal += ligne.tonnage_ligne || 0;
          statsLignes[num].shiftsCount += 1;
          statsLignes[num].rechargesTotal += (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0) + (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_recharges_b38 || 0);
          statsLignes[num].consignesTotal += (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0) + (ligne.cumul_consignes_b28 || 0) + (ligne.cumul_consignes_b38 || 0);
        }
      });
    });

    // ============= STATISTIQUES PAR MARQUE (Petro, Total, Vivo) =============
    const statsParMarque = { petro: { recharges: 0, consignes: 0, tonnage: 0 }, total: { recharges: 0, consignes: 0, tonnage: 0 }, vivo: { recharges: 0, consignes: 0, tonnage: 0 } };

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        // Petro
        const petroRecharges = (ligne.recharges_petro_b6 || 0) + (ligne.recharges_petro_b12 || 0) + (ligne.recharges_petro_b28 || 0) + (ligne.recharges_petro_b38 || 0);
        const petroConsignes = (ligne.consignes_petro_b6 || 0) + (ligne.consignes_petro_b12 || 0) + (ligne.consignes_petro_b28 || 0) + (ligne.consignes_petro_b38 || 0);
        const petroTonnage = ((ligne.recharges_petro_b6 || 0) * 6 + (ligne.recharges_petro_b12 || 0) * 12.5 + (ligne.recharges_petro_b28 || 0) * 28 + (ligne.recharges_petro_b38 || 0) * 38 +
                              (ligne.consignes_petro_b6 || 0) * 6 + (ligne.consignes_petro_b12 || 0) * 12.5 + (ligne.consignes_petro_b28 || 0) * 28 + (ligne.consignes_petro_b38 || 0) * 38) / 1000;
        statsParMarque.petro.recharges += petroRecharges;
        statsParMarque.petro.consignes += petroConsignes;
        statsParMarque.petro.tonnage += petroTonnage;
        // Total
        const totalRecharges = (ligne.recharges_total_b6 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_total_b38 || 0);
        const totalConsignes = (ligne.consignes_total_b6 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_total_b38 || 0);
        const totalTonnage = ((ligne.recharges_total_b6 || 0) * 6 + (ligne.recharges_total_b12 || 0) * 12.5 + (ligne.recharges_total_b28 || 0) * 28 + (ligne.recharges_total_b38 || 0) * 38 +
                              (ligne.consignes_total_b6 || 0) * 6 + (ligne.consignes_total_b12 || 0) * 12.5 + (ligne.consignes_total_b28 || 0) * 28 + (ligne.consignes_total_b38 || 0) * 38) / 1000;
        statsParMarque.total.recharges += totalRecharges;
        statsParMarque.total.consignes += totalConsignes;
        statsParMarque.total.tonnage += totalTonnage;
        // Vivo
        const vivoRecharges = (ligne.recharges_vivo_b6 || 0) + (ligne.recharges_vivo_b12 || 0) + (ligne.recharges_vivo_b28 || 0) + (ligne.recharges_vivo_b38 || 0);
        const vivoConsignes = (ligne.consignes_vivo_b6 || 0) + (ligne.consignes_vivo_b12 || 0) + (ligne.consignes_vivo_b28 || 0) + (ligne.consignes_vivo_b38 || 0);
        const vivoTonnage = ((ligne.recharges_vivo_b6 || 0) * 6 + (ligne.recharges_vivo_b12 || 0) * 12.5 + (ligne.recharges_vivo_b28 || 0) * 28 + (ligne.recharges_vivo_b38 || 0) * 38 +
                             (ligne.consignes_vivo_b6 || 0) * 6 + (ligne.consignes_vivo_b12 || 0) * 12.5 + (ligne.consignes_vivo_b28 || 0) * 28 + (ligne.consignes_vivo_b38 || 0) * 38) / 1000;
        statsParMarque.vivo.recharges += vivoRecharges;
        statsParMarque.vivo.consignes += vivoConsignes;
        statsParMarque.vivo.tonnage += vivoTonnage;
      });
    });

    const totalMarqueTonnage = statsParMarque.petro.tonnage + statsParMarque.total.tonnage + statsParMarque.vivo.tonnage;

    // ============= STATISTIQUES PAR TAILLE BOUTEILLE =============
    const statsParTaille = { B6: { recharges: 0, consignes: 0, tonnage: 0 }, B12: { recharges: 0, consignes: 0, tonnage: 0 }, B28: { recharges: 0, consignes: 0, tonnage: 0 }, B38: { recharges: 0, consignes: 0, tonnage: 0 } };

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        // B6
        const b6R = (ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0);
        const b6C = (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
        statsParTaille.B6.recharges += b6R; statsParTaille.B6.consignes += b6C; statsParTaille.B6.tonnage += (b6R + b6C) * 6 / 1000;
        // B12
        const b12R = (ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0);
        const b12C = (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
        statsParTaille.B12.recharges += b12R; statsParTaille.B12.consignes += b12C; statsParTaille.B12.tonnage += (b12R + b12C) * 12.5 / 1000;
        // B28
        const b28R = (ligne.recharges_petro_b28 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_vivo_b28 || 0);
        const b28C = (ligne.consignes_petro_b28 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_vivo_b28 || 0);
        statsParTaille.B28.recharges += b28R; statsParTaille.B28.consignes += b28C; statsParTaille.B28.tonnage += (b28R + b28C) * 28 / 1000;
        // B38
        const b38R = (ligne.recharges_petro_b38 || 0) + (ligne.recharges_total_b38 || 0) + (ligne.recharges_vivo_b38 || 0);
        const b38C = (ligne.consignes_petro_b38 || 0) + (ligne.consignes_total_b38 || 0) + (ligne.consignes_vivo_b38 || 0);
        statsParTaille.B38.recharges += b38R; statsParTaille.B38.consignes += b38C; statsParTaille.B38.tonnage += (b38R + b38C) * 38 / 1000;
      });
    });

    const totalTailleTonnage = statsParTaille.B6.tonnage + statsParTaille.B12.tonnage + statsParTaille.B28.tonnage + statsParTaille.B38.tonnage;

    // ============= STATISTIQUES ARRÊTS PRODUCTION ENRICHIES =============
    const arretLabels: Record<string, string> = { 'maintenance_corrective': 'Maintenance corrective', 'manque_personnel': 'Manque de personnel', 'probleme_approvisionnement': 'Problème approvisionnement', 'panne_ligne': 'Panne de ligne', 'autre': 'Autre' };
    const etapeLabels: Record<string, string> = { 'BASCULES': 'Bascules', 'PURGE': 'Purge', 'CONTROLE': 'Contrôle', 'ETANCHEITE': 'Étanchéité', 'CAPSULAGE': 'Capsulage', 'VIDANGE': 'Vidange', 'PALETTISEUR': 'Palettiseur', 'TRI': 'Tri', 'AUTRE': 'Autre' };

    const statsArrets: Record<string, { count: number; dureeTotale: number; lignesImpactees: Set<number>; etapes: Set<string>; actions: string[]; ordres: string[] }> = {};

    arrets.forEach(arret => {
      const type = arret.type_arret || 'autre';
      if (!statsArrets[type]) statsArrets[type] = { count: 0, dureeTotale: 0, lignesImpactees: new Set(), etapes: new Set(), actions: [], ordres: [] };
      statsArrets[type].count += 1;
      statsArrets[type].dureeTotale += arret.duree_minutes || 0;
      (arret.lignes_concernees || []).forEach((l: number) => statsArrets[type].lignesImpactees.add(l));
      if (arret.etape_ligne) statsArrets[type].etapes.add(arret.etape_ligne);
      if (arret.action_corrective) statsArrets[type].actions.push(arret.action_corrective);
      if (arret.ordre_intervention) statsArrets[type].ordres.push(arret.ordre_intervention);
    });

    const totalArrets = arrets.length;
    const totalDureeArrets = arrets.reduce((sum, a) => sum + (a.duree_minutes || 0), 0);

    // Derniers arrêts avec détails
    const derniersArrets = arrets.slice(0, 10).map(a => ({
      date: a.created_at?.split('T')[0],
      type: arretLabels[a.type_arret] || a.type_arret,
      duree: a.duree_minutes,
      lignes: a.lignes_concernees?.join(', '),
      etape: a.etape_ligne ? etapeLabels[a.etape_ligne] || a.etape_ligne : null,
      action: a.action_corrective,
      ordre: a.ordre_intervention
    }));

    // ============= STATISTIQUES PERSONNEL =============
    const statsPersonnel = { charistes: { total: 0, count: 0 }, chariots: { total: 0, count: 0 }, agentsAtelier: { total: 0, count: 0 }, agentsQuai: { total: 0, count: 0 }, agentsSaisie: { total: 0, count: 0 }, agentsLigne: { total: 0, count: 0 } };

    production.forEach(shift => {
      if (shift.chariste !== null) { statsPersonnel.charistes.total += shift.chariste || 0; statsPersonnel.charistes.count += 1; }
      if (shift.chariot !== null) { statsPersonnel.chariots.total += shift.chariot || 0; statsPersonnel.chariots.count += 1; }
      if (shift.agent_atelier !== null) { statsPersonnel.agentsAtelier.total += shift.agent_atelier || 0; statsPersonnel.agentsAtelier.count += 1; }
      if (shift.agent_quai !== null) { statsPersonnel.agentsQuai.total += shift.agent_quai || 0; statsPersonnel.agentsQuai.count += 1; }
      if (shift.agent_saisie !== null) { statsPersonnel.agentsSaisie.total += shift.agent_saisie || 0; statsPersonnel.agentsSaisie.count += 1; }
      const lignes = shift.lignes_production || [];
      lignes.forEach((l: any) => { if (l.nombre_agents !== null) { statsPersonnel.agentsLigne.total += l.nombre_agents || 0; statsPersonnel.agentsLigne.count += 1; } });
    });

    // ============= COMPARAISONS TEMPORELLES =============
    const productionSemaineCourante = production.filter(p => p.date >= sevenDaysAgo);
    const productionSemainePrecedente = production.filter(p => p.date >= fourteenDaysAgo && p.date < sevenDaysAgo);
    const tonnageSemaineCourante = productionSemaineCourante.reduce((sum, p) => sum + (p.tonnage_total || 0), 0);
    const tonnageSemainePrecedente = productionSemainePrecedente.reduce((sum, p) => sum + (p.tonnage_total || 0), 0);
    const evolutionSemaine = tonnageSemainePrecedente > 0 ? Math.round(((tonnageSemaineCourante - tonnageSemainePrecedente) / tonnageSemainePrecedente) * 100) : 0;

    const productionMoisCourant = production.filter(p => p.date.startsWith(currentMonth));
    const productionMoisPrecedent = production.filter(p => p.date.startsWith(lastMonth));
    const tonnageMoisCourant = productionMoisCourant.reduce((sum, p) => sum + (p.tonnage_total || 0), 0);
    const tonnageMoisPrecedent = productionMoisPrecedent.reduce((sum, p) => sum + (p.tonnage_total || 0), 0);
    const evolutionMois = tonnageMoisPrecedent > 0 ? Math.round(((tonnageMoisCourant - tonnageMoisPrecedent) / tonnageMoisPrecedent) * 100) : 0;

    const tendance = evolutionSemaine > 5 ? '📈 En hausse' : evolutionSemaine < -5 ? '📉 En baisse' : '➡️ Stable';

    // ============= CALCULS SPHÈRES + CALIBRATION =============
    const derniersCalculsSpheres = spheres.slice(0, 6);
    const stockSpheresTotal = derniersCalculsSpheres.reduce((sum, s) => sum + (s.masse_produit_kg || 0), 0) / 1000;
    const creuxTotal = derniersCalculsSpheres.reduce((sum, s) => sum + (s.creux_kg || 0), 0) / 1000;

    // Calibration summary per sphere
    const calibrationBySphere: Record<number, { minH: number; maxH: number; minVol: number; maxVol: number; points: number }> = {};
    sphereCalibration.forEach(c => {
      if (!calibrationBySphere[c.sphere_number]) calibrationBySphere[c.sphere_number] = { minH: Infinity, maxH: 0, minVol: Infinity, maxVol: 0, points: 0 };
      calibrationBySphere[c.sphere_number].minH = Math.min(calibrationBySphere[c.sphere_number].minH, c.height_mm);
      calibrationBySphere[c.sphere_number].maxH = Math.max(calibrationBySphere[c.sphere_number].maxH, c.height_mm);
      calibrationBySphere[c.sphere_number].minVol = Math.min(calibrationBySphere[c.sphere_number].minVol, c.capacity_l);
      calibrationBySphere[c.sphere_number].maxVol = Math.max(calibrationBySphere[c.sphere_number].maxVol, c.capacity_l);
      calibrationBySphere[c.sphere_number].points += 1;
    });

    // ============= OBJECTIFS MENSUELS =============
    const objectifMoisCourant = objectifs.find(o => o.mois === currentMonth);
    const objectifMoisPrecedent = objectifs.find(o => o.mois === lastMonth);
    const bilanMoisCourant = bilan.filter(b => b.date.startsWith(currentMonth));
    const bilanMoisPrecedent = bilan.filter(b => b.date.startsWith(lastMonth));
    const receptionsRealisees = bilanMoisCourant.reduce((sum, b) => sum + (b.reception_gpl || 0), 0);
    const receptionsMoisPrecedent = bilanMoisPrecedent.reduce((sum, b) => sum + (b.reception_gpl || 0), 0);
    const progressionObjectif = objectifMoisCourant ? Math.round((receptionsRealisees / objectifMoisCourant.objectif_receptions) * 100) : null;

    // ============= BILAN PAR CLIENT =============
    const bilanParClient = {
      simam: { vrac: 0 },
      petro_ivoire: { vrac: 0, conditionnees: 0, fuyardes: 0 },
      vivo_energies: { vrac: 0, conditionnees: 0, fuyardes: 0 },
      total_energies: { vrac: 0, conditionnees: 0, fuyardes: 0 }
    };

    bilan.forEach(b => {
      bilanParClient.simam.vrac += b.sorties_vrac_simam || 0;
      bilanParClient.petro_ivoire.vrac += b.sorties_vrac_petro_ivoire || 0;
      bilanParClient.petro_ivoire.conditionnees += b.sorties_conditionnees_petro_ivoire || 0;
      bilanParClient.petro_ivoire.fuyardes += b.fuyardes_petro_ivoire || 0;
      bilanParClient.vivo_energies.vrac += b.sorties_vrac_vivo_energies || 0;
      bilanParClient.vivo_energies.conditionnees += b.sorties_conditionnees_vivo_energies || 0;
      bilanParClient.vivo_energies.fuyardes += b.fuyardes_vivo_energies || 0;
      bilanParClient.total_energies.vrac += b.sorties_vrac_total_energies || 0;
      bilanParClient.total_energies.conditionnees += b.sorties_conditionnees_total_energies || 0;
      bilanParClient.total_energies.fuyardes += b.fuyardes_total_energies || 0;
    });

    // Bilan notes
    const bilanAvecNotes = bilan.filter(b => b.notes && b.notes.trim() !== '').slice(0, 5);

    // ============= MODIFICATIONS PRODUCTION =============
    const modificationsRecentes = modifications.slice(0, 10).map(m => ({
      date: m.modified_at?.split('T')[0],
      type: m.modification_type,
      raison: m.reason,
      shiftId: m.shift_id
    }));

    // Stats mandataires
    const statsMandataires = mandataires.map(m => {
      const ventesM = ventes.filter(v => v.mandataire_id === m.id);
      const tonnage = ventesM.reduce((sum, v) => sum + calculateTonnage(v), 0);
      return { nom: m.nom, tonnage: Math.round(tonnage * 100) / 100, livraisons: ventesM.length, destinations: new Set(ventesM.map(v => v.destination).filter(Boolean)).size };
    }).filter(m => m.livraisons > 0).sort((a, b) => b.tonnage - a.tonnage);

    // Stats destinations
    const statsDestinations: Record<string, { tonnage: number; livraisons: number }> = {};
    ventes.forEach(v => {
      if (v.destination) {
        if (!statsDestinations[v.destination]) statsDestinations[v.destination] = { tonnage: 0, livraisons: 0 };
        statsDestinations[v.destination].tonnage += calculateTonnage(v);
        statsDestinations[v.destination].livraisons += 1;
      }
    });
    const topDestinations = Object.entries(statsDestinations).map(([dest, stats]) => ({ destination: dest, ...stats })).sort((a, b) => b.tonnage - a.tonnage).slice(0, 10);

    // Build context string
    const dataContext = `
## DONNÉES ACTUELLES DE LA BASE DE DONNÉES (30 derniers jours)

### Résumé Global
- Période: ${thirtyDaysAgo} à ${todayStr}
- Mois en cours: ${currentMonth}
- Total tonnage ventes mandataires: ${Math.round(totalTonnageVentes * 100) / 100} tonnes
- Total tonnage production: ${Math.round(totalTonnageProduction * 100) / 100} tonnes
- Total bouteilles produites: ${totalBouteillesProduction.toLocaleString()}
- Nombre de livraisons: ${ventes.length}
- Nombre de shifts production: ${production.length}

### 📈 COMPARAISONS TEMPORELLES
**Semaine en cours vs semaine précédente:**
- Tonnage semaine courante (7 jours): ${Math.round(tonnageSemaineCourante * 100) / 100} tonnes
- Tonnage semaine précédente: ${Math.round(tonnageSemainePrecedente * 100) / 100} tonnes
- Évolution: ${evolutionSemaine > 0 ? '+' : ''}${evolutionSemaine}%
- Tendance: ${tendance}

**Mois en cours (${currentMonth}) vs mois précédent (${lastMonth}):**
- Tonnage mois courant: ${Math.round(tonnageMoisCourant * 100) / 100} tonnes
- Tonnage mois précédent: ${Math.round(tonnageMoisPrecedent * 100) / 100} tonnes
- Évolution: ${evolutionMois > 0 ? '+' : ''}${evolutionMois}%

### Dernier Bilan Matière (${dernierBilan?.date || 'N/A'})
${dernierBilan ? `
- Stock initial: ${dernierBilan.stock_initial} tonnes
- Réceptions GPL: ${dernierBilan.reception_gpl} tonnes
- Sorties vrac: ${dernierBilan.sorties_vrac} tonnes
- Sorties conditionnées: ${dernierBilan.sorties_conditionnees} tonnes
- Stock final: ${dernierBilan.stock_final} tonnes
- Bilan: ${dernierBilan.bilan} tonnes
- Nature: ${dernierBilan.nature}
${dernierBilan.notes ? `- Notes: ${dernierBilan.notes}` : ''}
` : 'Aucun bilan disponible'}

### 📝 NOTES RÉCENTES DES BILANS
${bilanAvecNotes.length > 0 ? bilanAvecNotes.map(b => `- ${b.date}: ${b.notes}`).join('\n') : 'Aucune note récente'}

### 📊 OBJECTIFS MENSUELS
**Mois courant (${currentMonth}):**
${objectifMoisCourant ? `
- Objectif réceptions: ${objectifMoisCourant.objectif_receptions} tonnes
- Réceptions réalisées: ${Math.round(receptionsRealisees * 100) / 100} tonnes
- Progression: ${progressionObjectif}%
- ${progressionObjectif && progressionObjectif >= 100 ? '✅ Objectif atteint!' : `Reste à réaliser: ${Math.round(objectifMoisCourant.objectif_receptions - receptionsRealisees)} tonnes`}
` : 'Aucun objectif défini pour ce mois'}

**Mois précédent (${lastMonth}):**
${objectifMoisPrecedent ? `
- Objectif: ${objectifMoisPrecedent.objectif_receptions} tonnes
- Réalisé: ${Math.round(receptionsMoisPrecedent * 100) / 100} tonnes
- Atteinte: ${Math.round((receptionsMoisPrecedent / objectifMoisPrecedent.objectif_receptions) * 100)}%
` : 'Pas d\'objectif défini'}

### 🏆 CLASSEMENT DES CHEFS DE LIGNE (Performance 30 jours)
${classementChefsLigne.length > 0 ? classementChefsLigne.map((c, i) => 
  `${i + 1}. ${c.prenom} ${c.nom}: ${Math.round(c.tonnageTotal * 100) / 100} t total | ${c.shiftsCount} shifts | Moy: ${c.moyenneParShift} t/shift | ${c.bouteillesTotal} bouteilles | ${c.joursTravailes} jours`
).join('\n') : 'Aucune donnée chef de ligne'}

### 👷 CLASSEMENT DES CHEFS DE QUART (Performance 30 jours)
${classementChefsQuart.length > 0 ? classementChefsQuart.map((c, i) => 
  `${i + 1}. ${c.prenom} ${c.nom}: ${Math.round(c.tonnageSupervise * 100) / 100} t supervisé | ${c.shiftsCount} shifts | Moy: ${c.moyenneParShift} t/shift | Arrêts moy: ${c.moyenneArretParShift} min/shift | ${c.joursTravailes} jours`
).join('\n') : 'Aucune donnée chef de quart'}

### 🔧 STATISTIQUES PAR LIGNE DE PRODUCTION
${Object.entries(statsLignes).map(([num, stats]) => 
  `Ligne ${num}: ${Math.round(stats.tonnageTotal * 100) / 100} t | ${stats.shiftsCount} shifts | ${stats.rechargesTotal} recharges | ${stats.consignesTotal} consignes | Moy: ${stats.shiftsCount > 0 ? Math.round((stats.tonnageTotal / stats.shiftsCount) * 100) / 100 : 0} t/shift`
).join('\n')}

### 🏭 PRODUCTION PAR MARQUE (30 jours)
- **Petro Ivoire**: ${Math.round(statsParMarque.petro.tonnage * 100) / 100} t (${totalMarqueTonnage > 0 ? Math.round((statsParMarque.petro.tonnage / totalMarqueTonnage) * 100) : 0}%) | ${statsParMarque.petro.recharges} recharges | ${statsParMarque.petro.consignes} consignes
- **Total Energies**: ${Math.round(statsParMarque.total.tonnage * 100) / 100} t (${totalMarqueTonnage > 0 ? Math.round((statsParMarque.total.tonnage / totalMarqueTonnage) * 100) : 0}%) | ${statsParMarque.total.recharges} recharges | ${statsParMarque.total.consignes} consignes
- **Vivo Energies**: ${Math.round(statsParMarque.vivo.tonnage * 100) / 100} t (${totalMarqueTonnage > 0 ? Math.round((statsParMarque.vivo.tonnage / totalMarqueTonnage) * 100) : 0}%) | ${statsParMarque.vivo.recharges} recharges | ${statsParMarque.vivo.consignes} consignes

### 📦 PRODUCTION PAR TAILLE DE BOUTEILLE (30 jours)
- **B6 (6kg)**: ${Math.round(statsParTaille.B6.tonnage * 100) / 100} t (${totalTailleTonnage > 0 ? Math.round((statsParTaille.B6.tonnage / totalTailleTonnage) * 100) : 0}%) | ${statsParTaille.B6.recharges} R + ${statsParTaille.B6.consignes} C
- **B12 (12.5kg)**: ${Math.round(statsParTaille.B12.tonnage * 100) / 100} t (${totalTailleTonnage > 0 ? Math.round((statsParTaille.B12.tonnage / totalTailleTonnage) * 100) : 0}%) | ${statsParTaille.B12.recharges} R + ${statsParTaille.B12.consignes} C
- **B28 (28kg)**: ${Math.round(statsParTaille.B28.tonnage * 100) / 100} t (${totalTailleTonnage > 0 ? Math.round((statsParTaille.B28.tonnage / totalTailleTonnage) * 100) : 0}%) | ${statsParTaille.B28.recharges} R + ${statsParTaille.B28.consignes} C
- **B38 (38kg)**: ${Math.round(statsParTaille.B38.tonnage * 100) / 100} t (${totalTailleTonnage > 0 ? Math.round((statsParTaille.B38.tonnage / totalTailleTonnage) * 100) : 0}%) | ${statsParTaille.B38.recharges} R + ${statsParTaille.B38.consignes} C

### ⏸️ STATISTIQUES DES ARRÊTS PRODUCTION (30 jours)
- Total arrêts: ${totalArrets}
- Durée totale: ${totalDureeArrets} minutes (${Math.round(totalDureeArrets / 60)} heures)
- Durée moyenne par arrêt: ${totalArrets > 0 ? Math.round(totalDureeArrets / totalArrets) : 0} minutes

**Répartition par type:**
${Object.entries(statsArrets).map(([type, stats]) => 
  `- ${arretLabels[type] || type}: ${stats.count} arrêts | ${stats.dureeTotale} min | Lignes: ${Array.from(stats.lignesImpactees).sort().join(', ') || 'N/A'} | Étapes: ${Array.from(stats.etapes).map(e => etapeLabels[e] || e).join(', ') || 'N/A'}
  ${stats.actions.length > 0 ? `  Actions correctives: ${stats.actions.slice(0, 3).join('; ')}` : ''}
  ${stats.ordres.length > 0 ? `  Ordres intervention: ${stats.ordres.slice(0, 3).join('; ')}` : ''}`
).join('\n')}

**Derniers arrêts (détails):**
${derniersArrets.map(a => `- ${a.date}: ${a.type} (${a.duree || '?'} min) - Lignes ${a.lignes || '?'}${a.etape ? ` - ${a.etape}` : ''}${a.action ? ` | Action: ${a.action}` : ''}`).join('\n')}

### 👥 STATISTIQUES PERSONNEL (Moyennes par shift)
- Charistes: ${statsPersonnel.charistes.count > 0 ? Math.round((statsPersonnel.charistes.total / statsPersonnel.charistes.count) * 10) / 10 : 0}
- Chariots: ${statsPersonnel.chariots.count > 0 ? Math.round((statsPersonnel.chariots.total / statsPersonnel.chariots.count) * 10) / 10 : 0}
- Agents atelier: ${statsPersonnel.agentsAtelier.count > 0 ? Math.round((statsPersonnel.agentsAtelier.total / statsPersonnel.agentsAtelier.count) * 10) / 10 : 0}
- Agents quai: ${statsPersonnel.agentsQuai.count > 0 ? Math.round((statsPersonnel.agentsQuai.total / statsPersonnel.agentsQuai.count) * 10) / 10 : 0}
- Agents saisie: ${statsPersonnel.agentsSaisie.count > 0 ? Math.round((statsPersonnel.agentsSaisie.total / statsPersonnel.agentsSaisie.count) * 10) / 10 : 0}
- Agents par ligne (moy): ${statsPersonnel.agentsLigne.count > 0 ? Math.round((statsPersonnel.agentsLigne.total / statsPersonnel.agentsLigne.count) * 10) / 10 : 0}

### 🔵 CALCULS SPHÈRES (Dernières mesures)
${derniersCalculsSpheres.length > 0 ? `
- Stock total sphères: ${Math.round(stockSpheresTotal * 100) / 100} tonnes
- Creux total disponible: ${Math.round(creuxTotal * 100) / 100} tonnes
Détails par sphère:
${derniersCalculsSpheres.map(s => 
  `  Sphère ${s.sphere_number} (${s.calculation_date.split('T')[0]}): ${Math.round(s.masse_produit_kg / 10) / 100} t | Creux: ${Math.round(s.creux_kg / 10) / 100} t | H: ${s.hauteur_mm}mm | T°L: ${s.temperature_liquide_c}°C | T°G: ${s.temperature_gazeuse_c}°C | P: ${s.pression_sphere_barg} barg`
).join('\n')}
` : 'Aucun calcul de sphère disponible'}

### 📐 BARÉMAGE SPHÈRES (Données de calibration)
${Object.keys(calibrationBySphere).length > 0 ? Object.entries(calibrationBySphere).map(([num, data]) => 
  `Sphère ${num}: ${data.points} points | Hauteur: ${data.minH}-${data.maxH}mm | Volume: ${Math.round(data.minVol)}-${Math.round(data.maxVol)}L`
).join('\n') : 'Aucune donnée de calibration'}

### 💼 BILAN PAR CLIENT (30 jours, en tonnes)
- SIMAM: Vrac ${Math.round(bilanParClient.simam.vrac * 100) / 100} t
- Petro Ivoire: Vrac ${Math.round(bilanParClient.petro_ivoire.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.petro_ivoire.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.petro_ivoire.fuyardes * 100) / 100} t
- Vivo Energies: Vrac ${Math.round(bilanParClient.vivo_energies.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.vivo_energies.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.vivo_energies.fuyardes * 100) / 100} t
- Total Energies: Vrac ${Math.round(bilanParClient.total_energies.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.total_energies.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.total_energies.fuyardes * 100) / 100} t

### 📝 MODIFICATIONS PRODUCTION RÉCENTES
${modificationsRecentes.length > 0 ? modificationsRecentes.map(m => `- ${m.date}: ${m.type} | Raison: ${m.raison}`).join('\n') : 'Aucune modification récente'}

### Top Mandataires (par tonnage)
${statsMandataires.slice(0, 10).map((m, i) => `${i + 1}. ${m.nom}: ${m.tonnage} t (${m.livraisons} livraisons, ${m.destinations} destinations)`).join('\n')}

### Top Destinations (par tonnage)
${topDestinations.map((d, i) => `${i + 1}. ${d.destination}: ${Math.round(d.tonnage * 100) / 100} t (${d.livraisons} livraisons)`).join('\n')}

### Équipes
- Chefs de quart: ${chefsQuart.map(c => `${c.prenom} ${c.nom}`).join(', ')}
- Chefs de ligne: ${chefsLigne.map(c => `${c.prenom} ${c.nom}`).join(', ')}

### Structure des données
- Mandataires enregistrés: ${mandataires.length}
- Destinations géolocalisées: ${destinations.length}
- Régions couvertes: ${new Set(destinations.map(d => d.region).filter(Boolean)).size}
`;

    const systemPrompt = `Tu es l'assistant data de GazPILOT, une application de gestion pour un centre emplisseur de GPL en Côte d'Ivoire (SAEPP).

## TON RÔLE
Tu réponds UNIQUEMENT aux questions concernant les données de l'application:
- Ventes par mandataire (transporteurs/distributeurs)
- Production (shifts, lignes, arrêts, performance)
- Bilan matière (stocks, réceptions, sorties par client)
- Destinations de livraison
- Performance des chefs de ligne et chefs de quart
- Calculs de sphères (stock physique GPL) et données de calibration
- Objectifs mensuels et progression
- Statistiques personnel (charistes, agents)
- Production par marque (Petro, Total, Vivo)
- Production par taille de bouteille (B6, B12, B28, B38)
- Historique des modifications
- Comparaisons temporelles (semaine vs semaine, mois vs mois)

## RÈGLES STRICTES
1. REFUSE poliment toute question hors sujet (météo, actualités, programmation, etc.)
2. Base tes réponses UNIQUEMENT sur les données ci-dessous
3. Si tu n'as pas l'information, dis-le clairement
4. Utilise des chiffres précis quand disponibles
5. Formate tes réponses avec du markdown (tableaux, listes)
6. Sois concis et professionnel
7. Réponds en français

## INTERPRÉTATION TEMPORELLE
Quand l'utilisateur demande des données pour une période spécifique:
- "en décembre" ou "décembre" → filtre sur le mois 12
- "cette semaine" → 7 derniers jours
- "semaine dernière" → 7-14 jours passés
- "aujourd'hui" → date du jour (${todayStr})
- "ce mois" → mois en cours (${currentMonth})
- "mois dernier" → mois précédent (${lastMonth})
- "le meilleur" → celui avec le plus haut tonnage ou performance
- "évolution" → compare les périodes (utilise les données de comparaison)

## VOCABULAIRE MÉTIER
- Mandataire: transporteur/distributeur qui livre le gaz
- Bilan matière: inventaire journalier des stocks
- Shift: période de travail (10h-19h ou 20h-5h)
- Ligne de production: chaîne d'emplissage de bouteilles (5 lignes)
- Chef de ligne: responsable d'une ligne de production
- Chef de quart: superviseur d'un shift complet
- B6, B12, B28, B38: types de bouteilles (poids en kg)
- Recharges (R_): bouteilles rechargées
- Consignes (C_): bouteilles consignées
- CE: Centre Emplisseur
- GPL: Gaz de Pétrole Liquéfié
- Sphère: réservoir de stockage GPL
- Creux: capacité restante dans une sphère
- Barémage: table de calibration hauteur → volume d'une sphère
- Arrêt: interruption de production (panne, maintenance, etc.)
- Chariste: conducteur de chariot élévateur
- SIMAM, Petro Ivoire, Total Energies, Vivo Energies: clients/marques

${dataContext}

Réponds maintenant à la question de l'utilisateur en te basant sur ces données.`;

    console.log("Chat assistant context built with full enrichment, calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants pour l'assistant IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat-assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
