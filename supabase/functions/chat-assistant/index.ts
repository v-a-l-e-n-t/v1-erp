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
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parallel data fetching for performance
    const [
      ventesResult,
      productionResult,
      bilanResult,
      mandatairesResult,
      destinationsResult,
      chefsQuartResult,
      chefsLigneResult
    ] = await Promise.all([
      supabase.from('ventes_mandataires').select('*').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(500),
      supabase.from('production_shifts').select('*, lignes_production(*), arrets_production(*)').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(100),
      supabase.from('bilan_entries').select('*').gte('date', thirtyDaysAgo).order('date', { ascending: false }).limit(60),
      supabase.from('mandataires').select('*'),
      supabase.from('destinations_geolocation').select('*'),
      supabase.from('chefs_quart').select('*'),
      supabase.from('chefs_ligne').select('*')
    ]);

    // Calculate key statistics
    const ventes = ventesResult.data || [];
    const production = productionResult.data || [];
    const bilan = bilanResult.data || [];
    const mandataires = mandatairesResult.data || [];
    const destinations = destinationsResult.data || [];

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
- Période: ${thirtyDaysAgo} à ${today}
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

### Top Mandataires (par tonnage)
${statsMandataires.slice(0, 10).map((m, i) => `${i + 1}. ${m.nom}: ${m.tonnage} t (${m.livraisons} livraisons, ${m.destinations} destinations)`).join('\n')}

### Top Destinations (par tonnage)
${topDestinations.map((d, i) => `${i + 1}. ${d.destination}: ${Math.round(d.tonnage * 100) / 100} t (${d.livraisons} livraisons)`).join('\n')}

### Équipes
- Chefs de quart: ${(chefsQuartResult.data || []).map(c => `${c.prenom} ${c.nom}`).join(', ')}
- Chefs de ligne: ${(chefsLigneResult.data || []).map(c => `${c.prenom} ${c.nom}`).join(', ')}

### Structure des données
- Mandataires enregistrés: ${mandataires.length}
- Destinations géolocalisées: ${destinations.length}
- Régions couvertes: ${new Set(destinations.map(d => d.region).filter(Boolean)).size}
`;

    const systemPrompt = `Tu es l'assistant data de GazPILOT, une application de gestion pour un centre emplisseur de GPL en Côte d'Ivoire (SAEPP).

## TON RÔLE
Tu réponds UNIQUEMENT aux questions concernant les données de l'application:
- Ventes par mandataire (transporteurs/distributeurs)
- Production (shifts, lignes, arrêts)
- Bilan matière (stocks, réceptions, sorties)
- Destinations de livraison
- Statistiques et analyses

## RÈGLES STRICTES
1. REFUSE poliment toute question hors sujet (météo, actualités, programmation, etc.)
2. Base tes réponses UNIQUEMENT sur les données ci-dessous
3. Si tu n'as pas l'information, dis-le clairement
4. Utilise des chiffres précis quand disponibles
5. Formate tes réponses avec du markdown (tableaux, listes)
6. Sois concis et professionnel
7. Réponds en français

## VOCABULAIRE MÉTIER
- Mandataire: transporteur/distributeur qui livre le gaz
- Bilan matière: inventaire journalier des stocks
- Shift: période de travail (10h-19h ou 20h-5h)
- Ligne de production: chaîne d'emplissage de bouteilles
- B6, B12, B28, B38: types de bouteilles (poids en kg)
- Recharges (R_): bouteilles rechargées
- Consignes (C_): bouteilles consignées
- CE: Centre Emplisseur
- GPL: Gaz de Pétrole Liquéfié

${dataContext}

Réponds maintenant à la question de l'utilisateur en te basant sur ces données.`;

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
