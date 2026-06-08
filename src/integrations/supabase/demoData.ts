// =============================================================================
// Données FICTIVES pour le mode démonstration (cf src/lib/demoMode.ts).
// Aucune donnée réelle : tout est généré localement, de façon déterministe,
// et ancré sur la date du jour pour que le mois courant soit peuplé.
//
// Couvre les tables lues par le tableau de bord. Volumes ~4 mois.
// =============================================================================

/* PRNG déterministe (mulberry32) pour des valeurs stables. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let _seed = 1337;
const rnd = mulberry32(_seed);
const ri = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));

const DAYS = 120;
const today = new Date();
const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dayAgo = (i: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  return d;
};

const SHIFTS = ['10h-19h', '20h-5h'] as const;
const SHIFT_HOURS: Record<string, { d: string; f: string }> = {
  '10h-19h': { d: '11:30', f: '20:30' },
  '20h-5h': { d: '21:30', f: '05:30' },
};

// ---- Agents (noms génériques, non réels) ----
const CHEFS_QUART = [
  { id: 'demo-cq-1', nom: 'KOUADIO', prenom: 'Marc', role: 'chef_quart' },
  { id: 'demo-cq-2', nom: 'TRAORÉ', prenom: 'Awa', role: 'chef_quart' },
  { id: 'demo-cq-3', nom: 'BAMBA', prenom: 'Yao', role: 'chef_quart' },
];
const CHEFS_LIGNE = [
  { id: 'demo-cl-1', nom: 'KONÉ', prenom: 'Ibrahim', role: 'chef_ligne' },
  { id: 'demo-cl-2', nom: 'DIABATÉ', prenom: 'Fatou', role: 'chef_ligne' },
  { id: 'demo-cl-3', nom: 'OUATTARA', prenom: 'Seydou', role: 'chef_ligne' },
  { id: 'demo-cl-4', nom: 'KOFFI', prenom: 'Aya', role: 'chef_ligne' },
  { id: 'demo-cl-5', nom: 'YAO', prenom: 'Jean', role: 'chef_ligne' },
];
const AGENTS = [
  ...CHEFS_QUART, ...CHEFS_LIGNE,
  { id: 'demo-op-1', nom: 'SANGARÉ', prenom: 'Moussa', role: 'operateur_de_production' },
  { id: 'demo-op-2', nom: 'CISSÉ', prenom: 'Mariam', role: 'operateur_de_production' },
  { id: 'demo-op-3', nom: 'TOURÉ', prenom: 'Adama', role: 'operateur_de_production' },
  { id: 'demo-op-4', nom: 'KÉITA', prenom: 'Salif', role: 'cariste' },
];

const AGENTS_LIGNES = AGENTS.flatMap((a) =>
  a.role === 'chef_ligne'
    ? [{ agent_id: a.id, numero_ligne: CHEFS_LIGNE.indexOf(a as any) + 1 }]
    : a.role === 'operateur_de_production' || a.role === 'cariste'
      ? [{ agent_id: a.id, numero_ligne: ri(1, 5) }]
      : [],
);

// ---- Mandataires (génériques) ----
const MANDATAIRES = [
  { id: 'demo-m-1', nom: 'Transport Atlantique' },
  { id: 'demo-m-2', nom: 'GazExpress Distribution' },
  { id: 'demo-m-3', nom: 'Sahel Énergie' },
  { id: 'demo-m-4', nom: 'Lagune Logistique' },
  { id: 'demo-m-5', nom: 'Comoé Pétrole' },
  { id: 'demo-m-6', nom: 'Baobab Services' },
];

const CLIENTS = ['SIMAM', 'PETRO_IVOIRE', 'VIVO_ENERGIES', 'TOTAL_ENERGIES'] as const;
const DESTINATIONS = ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Korhogo', 'Daloa', 'Man', 'Gagnoa'];

const ARRET_TYPES = ['causerie_securite', 'manque_personnel', 'panne_palettiseur', 'autre_panne', 'manque_bouteilles', 'perte_vitesse', 'lenteur_cariste'];

// ---- Génération production_shifts (+ lignes + arrets imbriqués) ----
const productionShifts: any[] = [];
const lignesFlat: any[] = [];

for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (d.getDay() === 0) continue; // pas de dimanche
  for (const st of SHIFTS) {
    if (rnd() < 0.12) continue; // quelques shifts manquants
    const hours = SHIFT_HOURS[st];
    const shiftId = `demo-shift-${i}-${st}`;
    const dateStr = fmt(d);
    const lignes: any[] = [];
    let shiftTonnage = 0;
    let shiftBottles = 0;
    let shiftArretTotal = 0;
    const arrets: any[] = [];

    for (let n = 1; n <= 5; n++) {
      const isB12 = n === 5;
      const mk = (base: number) => (isB12 ? 0 : ri(base * 0.6, base * 1.4));
      const mk12 = (base: number) => (isB12 ? ri(base * 0.6, base * 1.4) : 0);

      const r_petro_b6 = mk(420), r_vivo_b6 = mk(220), r_total_b6 = mk(300);
      const c_petro_b6 = mk(120), c_vivo_b6 = mk(60), c_total_b6 = mk(90);
      const r_petro_b12 = mk12(180), r_vivo_b12 = mk12(120), r_total_b12 = mk12(150);
      const c_petro_b12 = mk12(50), c_vivo_b12 = mk12(30), c_total_b12 = mk12(40);

      const cumul_recharges_b6 = r_petro_b6 + r_vivo_b6 + r_total_b6;
      const cumul_consignes_b6 = c_petro_b6 + c_vivo_b6 + c_total_b6;
      const cumul_recharges_b12 = r_petro_b12 + r_vivo_b12 + r_total_b12;
      const cumul_consignes_b12 = c_petro_b12 + c_vivo_b12 + c_total_b12;

      const tonnage_ligne =
        ((cumul_recharges_b6 + cumul_consignes_b6) * 6 +
          (cumul_recharges_b12 + cumul_consignes_b12) * 12.5) / 1000;
      const temps_arret_ligne_minutes = rnd() < 0.4 ? ri(10, 95) : 0;

      shiftTonnage += tonnage_ligne;
      shiftBottles += cumul_recharges_b6 + cumul_consignes_b6 + cumul_recharges_b12 + cumul_consignes_b12;
      shiftArretTotal += temps_arret_ligne_minutes;

      if (temps_arret_ligne_minutes > 0 && rnd() < 0.7) {
        arrets.push({
          id: `demo-arret-${shiftId}-${n}`,
          numero_ligne: n,
          type_arret: ARRET_TYPES[ri(0, ARRET_TYPES.length - 1)],
          duree_minutes: temps_arret_ligne_minutes,
        });
      }

      const ligne = {
        id: `demo-ligne-${shiftId}-${n}`,
        shift_id: shiftId,
        numero_ligne: n,
        chef_ligne_id: CHEFS_LIGNE[(n - 1) % CHEFS_LIGNE.length].id,
        nombre_agents: ri(6, 12),
        actif: true,
        heure_debut_reelle: hours.d,
        heure_fin_reelle: hours.f,
        recharges_petro_b6: r_petro_b6, recharges_petro_b12: r_petro_b12, recharges_petro_b28: 0, recharges_petro_b38: 0,
        recharges_vivo_b6: r_vivo_b6, recharges_vivo_b12: r_vivo_b12, recharges_vivo_b28: 0, recharges_vivo_b38: 0,
        recharges_total_b6: r_total_b6, recharges_total_b12: r_total_b12, recharges_total_b28: 0, recharges_total_b38: 0,
        consignes_petro_b6: c_petro_b6, consignes_petro_b12: c_petro_b12, consignes_petro_b28: 0, consignes_petro_b38: 0,
        consignes_vivo_b6: c_vivo_b6, consignes_vivo_b12: c_vivo_b12, consignes_vivo_b28: 0, consignes_vivo_b38: 0,
        consignes_total_b6: c_total_b6, consignes_total_b12: c_total_b12, consignes_total_b28: 0, consignes_total_b38: 0,
        cumul_recharges_b6, cumul_recharges_b12, cumul_recharges_b28: 0, cumul_recharges_b38: 0,
        cumul_consignes_b6, cumul_consignes_b12, cumul_consignes_b28: 0, cumul_consignes_b38: 0,
        tonnage_ligne: Number(tonnage_ligne.toFixed(3)),
        temps_arret_ligne_minutes,
      };
      lignes.push(ligne);
      lignesFlat.push({
        ...ligne,
        production_shifts: { date: dateStr, shift_type: st, heure_debut_reelle: hours.d, heure_fin_reelle: hours.f },
      });
    }

    productionShifts.push({
      id: shiftId,
      date: dateStr,
      shift_type: st,
      chef_quart_id: CHEFS_QUART[ri(0, CHEFS_QUART.length - 1)].id,
      heure_debut_theorique: hours.d, heure_fin_theorique: hours.f,
      heure_debut_reelle: hours.d, heure_fin_reelle: hours.f,
      bouteilles_produites: shiftBottles,
      tonnage_total: Number(shiftTonnage.toFixed(3)),
      temps_arret_total_minutes: shiftArretTotal,
      arret_shift_cumul: shiftArretTotal,
      bilan_commentaire: rnd() < 0.15 ? 'RAS — production nominale.' : null,
      lignes_production: lignes,
      arrets_production: arrets,
    });
  }
}

// ---- ventes_mandataires ----
const ventesMandataires: any[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (d.getDay() === 0) continue;
  const nb = ri(3, 8);
  for (let k = 0; k < nb; k++) {
    const m = MANDATAIRES[ri(0, MANDATAIRES.length - 1)];
    ventesMandataires.push({
      id: `demo-vente-${i}-${k}`,
      date: fmt(d),
      client: CLIENTS[ri(0, CLIENTS.length - 1)],
      mandataire_id: m.id,
      r_b6: ri(0, 400), r_b12: ri(0, 150), r_b28: ri(0, 20), r_b38: ri(0, 10), r_b11_carbu: 0,
      c_b6: ri(0, 120), c_b12: ri(0, 40), c_b28: 0, c_b38: 0, c_b11_carbu: 0,
      numero_bon_sortie: `BS-${10000 + i * 10 + k}`,
      camion: `CI-${ri(1000, 9999)}-${['AB', 'CD', 'EF'][ri(0, 2)]}`,
      destination: DESTINATIONS[ri(0, DESTINATIONS.length - 1)],
      mandataires: { id: m.id, nom: m.nom },
    });
  }
}

// ---- receptions_clients ----
const receptionsClients: any[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (rnd() < 0.6) continue; // réceptions occasionnelles
  const nb = ri(1, 3);
  for (let k = 0; k < nb; k++) {
    receptionsClients.push({
      id: `demo-recep-${i}-${k}`,
      date: fmt(d),
      client: CLIENTS[ri(0, CLIENTS.length - 1)],
      poids_kg: ri(80000, 320000),
    });
  }
}

// ---- bilan_entries ----
const bilanEntries: any[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (d.getDay() === 0) continue;
  const reception = rnd() < 0.4 ? ri(120000, 420000) : 0;
  const sorties_vrac = ri(180000, 360000);
  const sorties_cond = ri(120000, 260000);
  const fuyardes = ri(0, 8000);
  const bilan = ri(-1500, 1800);
  const stock_initial = ri(3500000, 4500000);
  const cumul_sorties = sorties_vrac + sorties_cond + fuyardes;
  const stock_theorique = stock_initial + reception - cumul_sorties;
  const stock_final = stock_theorique + bilan; // bilan = final - théorique
  bilanEntries.push({
    id: `demo-bilan-${i}`,
    date: fmt(d),
    stock_initial,
    spheres_initial: stock_initial, bouteilles_initial: 0, reservoirs_initial: 0,
    spheres_final: stock_final, bouteilles_final: 0, reservoirs_final: 0,
    reception_gpl: reception,
    receptions: reception ? [{ quantity: reception, navire: 'NAVIRE-DÉMO', reception_no: `R-${i}` }] : [],
    sorties_vrac, sorties_conditionnees: sorties_cond, fuyardes,
    cumul_sorties,
    stock_theorique,
    stock_final,
    sorties_vrac_simam: Math.round(sorties_vrac * 0.45),
    sorties_vrac_petro_ivoire: Math.round(sorties_vrac * 0.25),
    sorties_vrac_vivo_energies: Math.round(sorties_vrac * 0.18),
    sorties_vrac_total_energies: Math.round(sorties_vrac * 0.12),
    sorties_conditionnees_petro_ivoire: Math.round(sorties_cond * 0.55),
    sorties_conditionnees_vivo_energies: Math.round(sorties_cond * 0.2),
    sorties_conditionnees_total_energies: Math.round(sorties_cond * 0.25),
    bilan,
    nature: bilan > 0 ? 'Positif' : bilan < 0 ? 'Négatif' : 'Neutre',
  });
}

// ---- atelier_entries (data imbriquée client/catégorie/format) ----
const ATELIER_CLIENTS = ['SIMAM', 'PETRO_IVOIRE', 'VIVO_ENERGY', 'TOTAL_ENERGIES'];
const ATELIER_CATS = ['bouteilles_vidangees', 'reeprouvees', 'hs', 'clapet_monte'];
const ATELIER_FMT = ['B6', 'B12', 'B28', 'B38'];
const atelierEntries: any[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (d.getDay() === 0 || rnd() < 0.3) continue;
  for (const st of SHIFTS) {
    const data: any = {};
    for (const cl of ATELIER_CLIENTS) {
      data[cl] = {};
      for (const cat of ATELIER_CATS) {
        data[cl][cat] = {};
        for (const f of ATELIER_FMT) data[cl][cat][f] = ri(0, f === 'B6' ? 120 : 40);
      }
    }
    atelierEntries.push({
      id: `demo-atelier-${i}-${st}`,
      date: fmt(d), shift_type: st, data, updated_at: fmt(d) + 'T08:00:00Z',
    });
  }
}

// ---- palette_entries ----
const paletteEntries: any[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = dayAgo(i);
  if (rnd() < 0.5) continue;
  const m = MANDATAIRES[ri(0, MANDATAIRES.length - 1)];
  paletteEntries.push({
    id: `demo-pal-${i}`, date: fmt(d), client: CLIENTS[ri(0, CLIENTS.length - 1)],
    mandataire_id: m.id, capacite: ['B6', 'B12'][ri(0, 1)], num_camion: `CI-${ri(1000, 9999)}-GG`,
    b6: ri(0, 600), b12: ri(0, 200), b28: 0, b38: 0,
    palette_b6_normale: ri(0, 20), palette_b6_courte: ri(0, 8),
    palette_b12_ordinaire: ri(0, 12), palette_b12_superpo: ri(0, 6),
    mandataires: { nom: m.nom },
  });
}

// ---- rapport_chariot (minimal) ----
const rapportChariot: any[] = [];
const rapportChariotLignes: any[] = [];
for (let i = 0; i < 20; i++) {
  const d = dayAgo(i * 3);
  const id = `demo-chariot-${i}`;
  rapportChariot.push({ id, date_rapport: fmt(d), created_at: fmt(d) + 'T07:00:00Z' });
  for (let c = 1; c <= 3; c++) {
    rapportChariotLignes.push({
      id: `${id}-l${c}`, rapport_id: id, numero_chariot: `CH-0${c}`,
      etat: rnd() < 0.85 ? 'marche' : 'arret', compteur_horaire: ri(1200, 5400),
      niveau_carburant: ri(20, 100), anomalie: rnd() < 0.2 ? 'Fuite hydraulique mineure' : null,
    });
  }
}

// ---- destinations_geolocation ----
const CITY_COORDS: Record<string, [number, number]> = {
  Abidjan: [-4.008, 5.345], Yamoussoukro: [-5.273, 6.827], Bouaké: [-5.03, 7.69],
  'San-Pédro': [-6.637, 4.748], Korhogo: [-5.629, 9.458], Daloa: [-6.45, 6.877],
  Man: [-7.554, 7.412], Gagnoa: [-5.95, 6.131],
};
const destinationsGeo = DESTINATIONS.map((name, i) => ({
  id: `demo-geo-${i}`, destination: name,
  latitude: CITY_COORDS[name][1], longitude: CITY_COORDS[name][0],
  lat: CITY_COORDS[name][1], lng: CITY_COORDS[name][0],
}));

// ---- objectifs_mensuels (mois courant + précédent) ----
const monthStr = (offset: number) => {
  const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const objectifsMensuels = [0, 1, 2].map((o) => ({
  id: `demo-obj-${o}`, mois: monthStr(o), objectif_receptions: 8000000, objectif_tonnage: 2600,
}));

// =============================================================================
const TABLES: Record<string, any[]> = {
  production_shifts: productionShifts,
  lignes_production: lignesFlat,
  arrets_production: productionShifts.flatMap((s) => s.arrets_production),
  ventes_mandataires: ventesMandataires,
  receptions_clients: receptionsClients,
  mandataires: MANDATAIRES,
  agents: AGENTS,
  agents_lignes: AGENTS_LIGNES,
  bilan_entries: bilanEntries,
  atelier_entries: atelierEntries,
  palette_entries: paletteEntries,
  rapport_chariot: rapportChariot,
  rapport_chariot_lignes: rapportChariotLignes,
  destinations_geolocation: destinationsGeo,
  objectifs_mensuels: objectifsMensuels,
};

/** Renvoie une COPIE du tableau fictif d'une table (ou [] si inconnue). */
export function getDemoTable(table: string): any[] {
  const rows = TABLES[table];
  return rows ? rows.map((r) => ({ ...r })) : [];
}
