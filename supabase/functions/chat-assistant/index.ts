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

    // Fetch current data from database for context
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

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
      arretDetailsResult
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
      supabase.from('arrets_production').select('*').gte('created_at', thirtyDaysAgo)
    ]);

    // Calculate key statistics
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
      id: string;
      nom: string;
      prenom: string;
      tonnageTotal: number;
      shiftsCount: number;
      bouteillesTotal: number;
      dates: string[];
    }> = {};

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        if (ligne.chef_ligne_id) {
          const chef = chefsLigne.find(c => c.id === ligne.chef_ligne_id);
          if (chef) {
            const key = chef.id;
            if (!statsChefLigne[key]) {
              statsChefLigne[key] = {
                id: chef.id,
                nom: chef.nom,
                prenom: chef.prenom,
                tonnageTotal: 0,
                shiftsCount: 0,
                bouteillesTotal: 0,
                dates: []
              };
            }
            statsChefLigne[key].tonnageTotal += ligne.tonnage_ligne || 0;
            statsChefLigne[key].shiftsCount += 1;
            statsChefLigne[key].bouteillesTotal += 
              (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0) +
              (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_recharges_b38 || 0) +
              (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0) +
              (ligne.cumul_consignes_b28 || 0) + (ligne.cumul_consignes_b38 || 0);
            if (!statsChefLigne[key].dates.includes(shift.date)) {
              statsChefLigne[key].dates.push(shift.date);
            }
          }
        }
      });
    });

    const classementChefsLigne = Object.values(statsChefLigne)
      .map(c => ({
        ...c,
        moyenneParShift: c.shiftsCount > 0 ? Math.round((c.tonnageTotal / c.shiftsCount) * 100) / 100 : 0,
        joursTravailes: c.dates.length
      }))
      .sort((a, b) => b.tonnageTotal - a.tonnageTotal);

    // ============= CHEFS DE QUART PERFORMANCE =============
    const statsChefQuart: Record<string, {
      id: string;
      nom: string;
      prenom: string;
      tonnageSupervise: number;
      shiftsCount: number;
      tempsArretTotal: number;
      dates: string[];
    }> = {};

    production.forEach(shift => {
      if (shift.chef_quart_id) {
        const chef = chefsQuart.find(c => c.id === shift.chef_quart_id);
        if (chef) {
          const key = chef.id;
          if (!statsChefQuart[key]) {
            statsChefQuart[key] = {
              id: chef.id,
              nom: chef.nom,
              prenom: chef.prenom,
              tonnageSupervise: 0,
              shiftsCount: 0,
              tempsArretTotal: 0,
              dates: []
            };
          }
          statsChefQuart[key].tonnageSupervise += shift.tonnage_total || 0;
          statsChefQuart[key].shiftsCount += 1;
          statsChefQuart[key].tempsArretTotal += shift.temps_arret_total_minutes || 0;
          if (!statsChefQuart[key].dates.includes(shift.date)) {
            statsChefQuart[key].dates.push(shift.date);
          }
        }
      }
    });

    const classementChefsQuart = Object.values(statsChefQuart)
      .map(c => ({
        ...c,
        moyenneParShift: c.shiftsCount > 0 ? Math.round((c.tonnageSupervise / c.shiftsCount) * 100) / 100 : 0,
        moyenneArretParShift: c.shiftsCount > 0 ? Math.round(c.tempsArretTotal / c.shiftsCount) : 0,
        joursTravailes: c.dates.length
      }))
      .sort((a, b) => b.tonnageSupervise - a.tonnageSupervise);

    // ============= STATISTIQUES PAR LIGNE DE PRODUCTION (1-5) =============
    const statsLignes: Record<number, {
      tonnageTotal: number;
      shiftsCount: number;
      rechargesTotal: number;
      consignesTotal: number;
    }> = { 1: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
           2: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
           3: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
           4: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 },
           5: { tonnageTotal: 0, shiftsCount: 0, rechargesTotal: 0, consignesTotal: 0 } };

    production.forEach(shift => {
      const lignes = shift.lignes_production || [];
      lignes.forEach((ligne: any) => {
        const num = ligne.numero_ligne;
        if (num >= 1 && num <= 5) {
          statsLignes[num].tonnageTotal += ligne.tonnage_ligne || 0;
          statsLignes[num].shiftsCount += 1;
          statsLignes[num].rechargesTotal += 
            (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0) +
            (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_recharges_b38 || 0);
          statsLignes[num].consignesTotal += 
            (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0) +
            (ligne.cumul_consignes_b28 || 0) + (ligne.cumul_consignes_b38 || 0);
        }
      });
    });

    // ============= STATISTIQUES ARRÊTS PRODUCTION =============
    const statsArrets: Record<string, { count: number; dureeTotale: number; lignesImpactees: Set<number> }> = {};
    const arretLabels: Record<string, string> = {
      'maintenance_corrective': 'Maintenance corrective',
      'manque_personnel': 'Manque de personnel',
      'probleme_approvisionnement': 'Problème approvisionnement',
      'panne_ligne': 'Panne de ligne',
      'autre': 'Autre'
    };

    arrets.forEach(arret => {
      const type = arret.type_arret || 'autre';
      if (!statsArrets[type]) {
        statsArrets[type] = { count: 0, dureeTotale: 0, lignesImpactees: new Set() };
      }
      statsArrets[type].count += 1;
      statsArrets[type].dureeTotale += arret.duree_minutes || 0;
      (arret.lignes_concernees || []).forEach((l: number) => statsArrets[type].lignesImpactees.add(l));
    });

    const totalArrets = arrets.length;
    const totalDureeArrets = arrets.reduce((sum, a) => sum + (a.duree_minutes || 0), 0);

    // ============= CALCULS SPHÈRES =============
    const derniersCalculsSpheres = spheres.slice(0, 6);
    const stockSpheresTotal = derniersCalculsSpheres.reduce((sum, s) => sum + (s.masse_produit_kg || 0), 0) / 1000;
    const creuxTotal = derniersCalculsSpheres.reduce((sum, s) => sum + (s.creux_kg || 0), 0) / 1000;

    // ============= OBJECTIFS MENSUELS =============
    const objectifMoisCourant = objectifs.find(o => o.mois === currentMonth);
    const bilanMoisCourant = bilan.filter(b => b.date.startsWith(currentMonth));
    const receptionsRealisees = bilanMoisCourant.reduce((sum, b) => sum + (b.reception_gpl || 0), 0);
    const progressionObjectif = objectifMoisCourant 
      ? Math.round((receptionsRealisees / objectifMoisCourant.objectif_receptions) * 100) 
      : null;

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

    // Stats per mandataire
    const statsMandataires = mandataires.map(m => {
      const ventesM = ventes.filter(v => v.mandataire_id === m.id);
      const tonnage = ventesM.reduce((sum, v) => sum + calculateTonnage(v), 0);
      const livraisons = ventesM.length;
      const destinationsUniques = new Set(ventesM.map(v => v.destination).filter(Boolean)).size;
      return { nom: m.nom, tonnage: Math.round(tonnage * 100) / 100, livraisons, destinations: destinationsUniques };
    }).filter(m => m.livraisons > 0).sort((a, b) => b.tonnage - a.tonnage);

    // Stats per destination
    const statsDestinations: Record<string, { tonnage: number; livraisons: number }> = {};
    ventes.forEach(v => {
      if (v.destination) {
        if (!statsDestinations[v.destination]) {
          statsDestinations[v.destination] = { tonnage: 0, livraisons: 0 };
        }
        statsDestinations[v.destination].tonnage += calculateTonnage(v);
        statsDestinations[v.destination].livraisons += 1;
      }
    });
    const topDestinations = Object.entries(statsDestinations)
      .map(([dest, stats]) => ({ destination: dest, ...stats }))
      .sort((a, b) => b.tonnage - a.tonnage)
      .slice(0, 10);

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

### Dernier Bilan Matière (${dernierBilan?.date || 'N/A'})
${dernierBilan ? `
- Stock initial: ${dernierBilan.stock_initial} tonnes
- Réceptions GPL: ${dernierBilan.reception_gpl} tonnes
- Sorties vrac: ${dernierBilan.sorties_vrac} tonnes
- Sorties conditionnées: ${dernierBilan.sorties_conditionnees} tonnes
- Stock final: ${dernierBilan.stock_final} tonnes
- Bilan: ${dernierBilan.bilan} tonnes
- Nature: ${dernierBilan.nature}
` : 'Aucun bilan disponible'}

### 📊 OBJECTIFS MENSUELS (${currentMonth})
${objectifMoisCourant ? `
- Objectif réceptions: ${objectifMoisCourant.objectif_receptions} tonnes
- Réceptions réalisées: ${receptionsRealisees} tonnes
- Progression: ${progressionObjectif}%
- ${progressionObjectif && progressionObjectif >= 100 ? '✅ Objectif atteint!' : `Reste à réaliser: ${Math.round(objectifMoisCourant.objectif_receptions - receptionsRealisees)} tonnes`}
` : 'Aucun objectif défini pour ce mois'}

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

### ⏸️ STATISTIQUES DES ARRÊTS PRODUCTION (30 jours)
- Total arrêts: ${totalArrets}
- Durée totale: ${totalDureeArrets} minutes (${Math.round(totalDureeArrets / 60)} heures)
- Durée moyenne par arrêt: ${totalArrets > 0 ? Math.round(totalDureeArrets / totalArrets) : 0} minutes

Répartition par type:
${Object.entries(statsArrets).map(([type, stats]) => 
  `- ${arretLabels[type] || type}: ${stats.count} arrêts | ${stats.dureeTotale} min total | Lignes: ${Array.from(stats.lignesImpactees).sort().join(', ') || 'N/A'}`
).join('\n')}

### 🔵 CALCULS SPHÈRES (Dernières mesures)
${derniersCalculsSpheres.length > 0 ? `
- Stock total sphères: ${Math.round(stockSpheresTotal * 100) / 100} tonnes
- Creux total disponible: ${Math.round(creuxTotal * 100) / 100} tonnes
Détails par sphère:
${derniersCalculsSpheres.map(s => 
  `  Sphère ${s.sphere_number} (${s.calculation_date.split('T')[0]}): ${Math.round(s.masse_produit_kg / 10) / 100} t | Creux: ${Math.round(s.creux_kg / 10) / 100} t | H: ${s.hauteur_mm}mm | P: ${s.pression_sphere_barg} barg`
).join('\n')}
` : 'Aucun calcul de sphère disponible'}

### 💼 BILAN PAR CLIENT (30 jours, en tonnes)
- SIMAM: Vrac ${Math.round(bilanParClient.simam.vrac * 100) / 100} t
- Petro Ivoire: Vrac ${Math.round(bilanParClient.petro_ivoire.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.petro_ivoire.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.petro_ivoire.fuyardes * 100) / 100} t
- Vivo Energies: Vrac ${Math.round(bilanParClient.vivo_energies.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.vivo_energies.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.vivo_energies.fuyardes * 100) / 100} t
- Total Energies: Vrac ${Math.round(bilanParClient.total_energies.vrac * 100) / 100} t | Conditionnées ${Math.round(bilanParClient.total_energies.conditionnees * 100) / 100} t | Fuyardes ${Math.round(bilanParClient.total_energies.fuyardes * 100) / 100} t

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
- Calculs de sphères (stock physique GPL)
- Objectifs mensuels et progression
- Statistiques et analyses

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
- "aujourd'hui" → date du jour (${todayStr})
- "ce mois" → mois en cours (${currentMonth})
- "le meilleur" → celui avec le plus haut tonnage ou performance

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
- Arrêt: interruption de production (panne, maintenance, etc.)

${dataContext}

Réponds maintenant à la question de l'utilisateur en te basant sur ces données.`;

    console.log("Chat assistant context built, calling AI gateway...");

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
