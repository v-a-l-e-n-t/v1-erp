// Données des flottes clients VRAC - Citernes, Tracteurs, Chauffeurs
// Chaque client a sa propre flotte, isolée des autres.
// Ajouter les données des autres clients au fur et à mesure.

export interface FleetRecord {
  citerne: string;
  tracteur: string;
  chauffeurs: string[];
}

export interface ClientFleet {
  records: FleetRecord[];
  citernes: string[];
  tracteurs: string[];
  chauffeurs: string[];
  citerneToTracteur: Map<string, string>;
  tracteurToCiterne: Map<string, string>;
  citerneTochauffeurs: Map<string, string[]>;
}

/** Normalise une immatriculation: supprime tirets et met en majuscules */
export function normalizeImmat(value: string): string {
  return value.replace(/-/g, '').toUpperCase().trim();
}

// --- Données brutes par client ---

const SIMAM_RECORDS: FleetRecord[] = [
  { citerne: '1456JS01', tracteur: 'AA930KQ01', chauffeurs: ['DABO ABDOULAYE', 'YAO YAO MARIUS GASTON'] },
  { citerne: '4910LL01', tracteur: '663LG01', chauffeurs: ['SALIFOU KONE', 'LAMINE KONE'] },
  { citerne: '678JZ01', tracteur: '7530JC01', chauffeurs: ['KADJE ASSI ARMEL FABRICE', 'SAVADOGO ALASSANE', 'SINAYOKO SOULEYMANE', 'YAO YAO MARIUS GASTON'] },
  { citerne: '3150HE01', tracteur: '7531JC01', chauffeurs: ['TRAORE BAFIM', 'AMARA CISSE'] },
  { citerne: '1202FG01', tracteur: '8893HL01', chauffeurs: ['DOUMBIA DRISSA'] },
  { citerne: '1289KC01', tracteur: '2287HX01', chauffeurs: ['KONATE BAFAMORY', 'OUATTARA YACOUBA', 'BAMBA MOHAMED ABOU'] },
  { citerne: '2923JY01', tracteur: '4572JC01', chauffeurs: ['OHOUOT YAPO ULRICH'] },
  { citerne: '2921HP01', tracteur: '7533JC01', chauffeurs: ['TRAORE ZANGA ALASSANE', 'SINAYOKO SOULEYMANE', 'KADJE ASSI ARMEL FABRICE', 'SAGARA DAOUDA', 'YAO YAO MARIUS GASTON'] },
  { citerne: '145JR01', tracteur: '5840HC01', chauffeurs: ['KONE YACOUBA'] },
  { citerne: '1288KC01', tracteur: '2285HX01', chauffeurs: ['SOULEYMANE KOUADIO ANZOUMANAN', 'SANGARE KARIM', 'KOUAME ELUI HUBERT ANDRE'] },
  { citerne: '141JR01', tracteur: '2084JP01', chauffeurs: ['TOH ABOUDRAMANE', 'SAGARA DAOUDA'] },
  { citerne: 'AA620AE', tracteur: '657LG01', chauffeurs: ['DOUMBIA SAIBOU'] },
  { citerne: 'AA525BL', tracteur: '656LG01', chauffeurs: ['DAO DJAKARIDJA', 'DOUMBIA ALI'] },
  { citerne: 'AA540BK', tracteur: '658LG01', chauffeurs: ['SEKA YAPI ALEXANDRE', 'DOGO GBAGBO ERIC'] },
  { citerne: '2922HP01', tracteur: '943JE01', chauffeurs: ['TANGARA AMADOU', 'KADJE ASSI ARMEL FABRICE'] },
  { citerne: 'AA501BN', tracteur: '3626KS01', chauffeurs: ['BAMBA AMADOU', 'DAO SOUNKALO'] },
  { citerne: '5458KU01', tracteur: '662LG01', chauffeurs: ['DJIBRIL KONE', 'SANOGO MOHAMED'] },
  { citerne: '5391HZ01', tracteur: '607JE01', chauffeurs: ['OUATTARA OUMAR', 'BAMBA MOHAMED ABOU'] },
  { citerne: '7210HZ01', tracteur: '678HY01', chauffeurs: ['SANOGO BASSOUMARIFO'] },
  { citerne: '6730HZ01', tracteur: '942JE01', chauffeurs: ['BERTHE MAMADOU', 'BAMBA MOHAMED ABOU'] },
  { citerne: '5457KU01', tracteur: '665LG01', chauffeurs: ['OUATTARA ABDOULAYE', 'SOUMAHORO ABOUBAKAR'] },
  { citerne: '679JZ01', tracteur: '2081JP01', chauffeurs: ['DOUMBIA BAKARY', 'KADJE ASSI ARMEL FABRICE', 'SOULEYMANE KOUADIO ANZOUMANAN'] },
  { citerne: '2089JP01', tracteur: '2284HX01', chauffeurs: ['BAMBA MOHAMED ABOU'] },
  { citerne: '4911LL01', tracteur: '660LG01', chauffeurs: ['CISSE ADAMA', 'CAMARA KLO SAMSON'] },
  { citerne: 'AA737BL', tracteur: '3628KS01', chauffeurs: ['OUATTARA ABDRAMANE', 'CAMARA BANGALY'] },
  { citerne: '5392HZ01', tracteur: 'AA118KS01', chauffeurs: ['KONE ABDOULAYE', 'ABDOUL MALICK SAMAKE', 'SANGARE KARIM', 'BAMBA MOHAMED ABOU'] },
  { citerne: '3139KL01', tracteur: '664LG01', chauffeurs: ['BOUABEHI KOUASSI ARNAUD', 'TRAORE SOUMAILA'] },
  { citerne: '7309HZ01', tracteur: '3230HP01', chauffeurs: ['KADJE ASSI ARMEL FABRICE', 'OUATTARA YACOUBA'] },
  { citerne: '5202HC01', tracteur: '1195HX01', chauffeurs: ['SINAYOKO SOULEYMANE', 'FADIGA SOULEYMANE', 'OUATTARA YACOUBA'] },
  { citerne: '2922JY01', tracteur: '944JE01', chauffeurs: ['SANOGO SOUALIHO', 'SANGARE KARIM', 'SAVADOGO ALASSANE', 'TANGARA AMADOU', 'SOULEYMANE KOUADIO ANZOUMANAN', 'DABO ABDOULAYE'] },
  { citerne: '2088JP01', tracteur: '2087JP01', chauffeurs: ['ABDOULAYE DIALLO', 'KEITA ABOUBACAR SIDIK', 'KONATE BAFAMORY'] },
  { citerne: '6001JT01', tracteur: '9871HU01', chauffeurs: ['YAO YAO MARIUS GASTON'] },
  { citerne: '6728HZ01', tracteur: '7167JB01', chauffeurs: ['KONE BAKARY'] },
  { citerne: '6002JT01', tracteur: '7535JC01', chauffeurs: ['KEITA ABOUBACAR SIDIK', 'KOUAME ELUI HUBERT ANDRE', 'ABDOULAYE DIALLO'] },
  { citerne: 'AA432AD', tracteur: '661LG01', chauffeurs: ['KONE MAMADOU'] },
  { citerne: 'AA624AE', tracteur: '659LG01', chauffeurs: ['IRIE BI LEZIE LANDRY RICHMOND', 'BALAMINE KONE'] },
  { citerne: '3140KL01', tracteur: '670LG01', chauffeurs: ['FOFANA MOUSTAPHA', 'KONATE SEYDOU', 'FOFANA MAMADOU'] },
  { citerne: '2923HP01', tracteur: '1524HX01', chauffeurs: ['SANGARE KARIM', 'SINAYOKO SOULEYMANE'] },
  { citerne: '1454JS01', tracteur: 'AA380KR01', chauffeurs: ['KONATE GAOUSSOU', 'TANGARA AMADOU'] },
  { citerne: '143JR01', tracteur: '7529JC01', chauffeurs: ['ABDOUL MALICK SAMAKE', 'KEITA ABOUBACAR SIDIK', 'SAGARA DAOUDA', 'SANGARE KARIM'] },
  { citerne: '1695HE01', tracteur: '7821GN01', chauffeurs: ['SAGARA DAOUDA'] },
  { citerne: '5842HK01', tracteur: '5842HK01', chauffeurs: ['KONE SIAKA'] },
  { citerne: 'AA629AE', tracteur: '655LG01', chauffeurs: ['KONATE MOHAMED', 'BROU ALLATIN NARCISSE'] },
  { citerne: '1509FJ01', tracteur: '1509FJ01', chauffeurs: ['SAGDO ABOULAYE'] },
  { citerne: '3886GU01', tracteur: '3886GU01', chauffeurs: ['KANTE TIDIANE'] },
];

const VIVO_ENERGIES_RECORDS: FleetRecord[] = [
  { citerne: 'AA272FR04', tracteur: 'AA065FH04', chauffeurs: ['KONE BOURAIMA'] },
  { citerne: '3723HB01', tracteur: 'AA023LF01', chauffeurs: ['OUATTARA LAMINE', 'SANOGO YOUSSOUF', 'LOBA JEAN MARIE', 'MOUSSA TRAORE', 'MOUSSA TOURE'] },
  { citerne: '029039WW01', tracteur: '374929WW01', chauffeurs: ['GBAME AGUI CHARLES', 'DIAKITE LAMIN'] },
  { citerne: 'AA620AE', tracteur: '657LG01', chauffeurs: ['DOUMBIA SAIBOU'] },
  { citerne: '6737HP01', tracteur: '6737HP01', chauffeurs: ['DOUMBIA ADAMA'] },
  { citerne: '3150HE01', tracteur: '7531JC01', chauffeurs: ['TRAORE BAFIM'] },
  { citerne: 'AA540BK', tracteur: '658LG01', chauffeurs: ['DOGO GBAGBO ERIC'] },
  { citerne: 'AA695BS', tracteur: 'AA930BA', chauffeurs: ['KONE SINDOU'] },
  { citerne: '6751HP01', tracteur: '6751HP01', chauffeurs: ['TIHA ANICET'] },
  { citerne: '1509FJ01', tracteur: '1509FJ01', chauffeurs: ['SAGDO ABOULAYE'] },
  { citerne: '3455FH01', tracteur: '3455FH01', chauffeurs: ['DOUMBIA MOUSTAPHA', 'DORAN COULIBALY'] },
  { citerne: 'AA014BS', tracteur: '9934GX01', chauffeurs: ['KONE SOULEYMANE', 'KONE SOUMAILA', 'DIALLO ABDOUL HARISSOU'] },
  { citerne: '5828HA01', tracteur: '7029HV01', chauffeurs: ['AMANI KOUADIO SYLVAIN'] },
  { citerne: '9183GR01', tracteur: '1062GP01', chauffeurs: ['KONE AMARA', 'KONE ALASSANE'] },
  { citerne: '4518GT01', tracteur: '4518GT01', chauffeurs: ['DOUMBIA MOUSTAPHA', 'KONE AMARA', 'SYLLA ZANGA SOULEYMANE', 'AMANI KOUADIO SYLVAIN', 'KONE ALASSANE', 'TIHA ANICET'] },
  { citerne: '4911LL01', tracteur: '660LG01', chauffeurs: ['CAMARA KLO SAMSON', 'CISSE ADAMA'] },
  { citerne: '1798HY01', tracteur: '7347JR01', chauffeurs: ['SYLLA ZANGA SOULEYMANE'] },
  { citerne: '029042WW01', tracteur: '374931WW01', chauffeurs: ['MOUSSA TRAORE', 'DIAKITE LAMIN'] },
  { citerne: '4140JE01', tracteur: '9965GN01', chauffeurs: ['LACINE DOUMBIA'] },
  { citerne: '3799HB01', tracteur: '1847LL01', chauffeurs: ['LOBA JEAN MARIE', 'GBAME AGUI CHARLES'] },
  { citerne: '3139KL01', tracteur: '664LG01', chauffeurs: ['TRAORE SOUMAILA', 'BOUABEHI KOUASSI ARNAUD'] },
  { citerne: '1185JH01', tracteur: '1845LL01', chauffeurs: ['TOUNDE MAHAMADOU', 'DIAKITE LAMIN'] },
  { citerne: '814JZ01', tracteur: '212JZ01', chauffeurs: ['DOUMBIA INZA'] },
  { citerne: '4910LL01', tracteur: '663LG01', chauffeurs: ['SALIFOU KONE', 'LAMINE KONE'] },
  { citerne: '5458KU01', tracteur: '662LG01', chauffeurs: ['DJIBRIL KONE'] },
  { citerne: 'AA624AE', tracteur: '659LG01', chauffeurs: ['BALAMINE KONE', 'IRIE BI LEZIE LANDRY RICHMOND'] },
  { citerne: '5457KU01', tracteur: '665LG01', chauffeurs: ['SOUMAHORO ABOUBAKAR', 'OUATTARA ABDOULAYE'] },
  { citerne: '6863EU01', tracteur: '6863EU01', chauffeurs: ['CISSE GAOUSSOU'] },
  { citerne: 'AA737BL', tracteur: '3628KS01', chauffeurs: ['OUATTARA ABDRAMANE'] },
  { citerne: '3140KL01', tracteur: '670LG01', chauffeurs: ['KONATE SEYDOU'] },
  { citerne: 'AA432AD', tracteur: '661LG01', chauffeurs: ['KONE MAMADOU'] },
  { citerne: 'AA374TY01', tracteur: 'AA661TP01', chauffeurs: ['KONE MAMADOU'] },
  { citerne: '5779HF03', tracteur: 'AA978YL01', chauffeurs: ['KONE YAYA'] },
  { citerne: 'AA081PJ01', tracteur: '9940GX01', chauffeurs: ['DIALLO ABDOUL HARISSOU'] },
  { citerne: '1893HS01', tracteur: '1893HS01', chauffeurs: ['TRAORE MAMADOU'] },
  { citerne: '9184GR01', tracteur: '1001GP01', chauffeurs: ['SYLLA YACOUBA'] },
  { citerne: 'AA629AE', tracteur: '655LG01', chauffeurs: ['KONATE MOHAMED'] },
  { citerne: 'AA501BN', tracteur: '3626KS01', chauffeurs: ['DAO SOUNKALO'] },
  { citerne: 'AA337PF01', tracteur: '19GY01', chauffeurs: ['CISSE ABOUBACAR'] },
  { citerne: 'AA469PN', tracteur: '9951GX01', chauffeurs: ['DOUMBIA ABDOULAYE', 'TRAORE TAHIROU'] },
  { citerne: '2595JN01', tracteur: '6254JB01', chauffeurs: ['DIAKITE LASSINA'] },
  { citerne: 'AA177HR01', tracteur: '4404KU01', chauffeurs: ['ABOU KANATE'] },
  { citerne: 'AA414TZ01', tracteur: 'AA793VG01', chauffeurs: ['DIALLO KARIM'] },
  { citerne: 'AA252SX01', tracteur: 'AA239SX01', chauffeurs: ['TRAORE ALASSANE'] },
  { citerne: '4480EJ01', tracteur: '7856HN01', chauffeurs: ['ADAMA BAMBA'] },
  { citerne: '7856FE01', tracteur: '4211KV01', chauffeurs: ['ADAMA BAMBA'] },
];

const PETRO_IVOIRE_RECORDS: FleetRecord[] = [
  { citerne: '1989FG01', tracteur: '1989FG01', chauffeurs: ['BAMBA SOUNGALO KARNAN', 'OUATTARA BEH'] },
  { citerne: '2074LK01', tracteur: '2074LK01', chauffeurs: ['BAMBA SOUNGALO KARNAN', 'TRAORE DRISSA'] },
  { citerne: '2454FE01', tracteur: '2454FE01', chauffeurs: ['OUATTARA PORNON'] },
  { citerne: '3139KL01', tracteur: '664LG01', chauffeurs: ['BOUABEHI KOUASSI ARNAUD', 'TRAORE SOUMAILA'] },
  { citerne: '3140KL01', tracteur: '670LG01', chauffeurs: ['FOFANA MOUSTAPHA'] },
  { citerne: '3150HE01', tracteur: '7531JC01', chauffeurs: ['TRAORE BAFIM'] },
  { citerne: '4910LL01', tracteur: '663LG01', chauffeurs: ['SALIFOU KONE'] },
  { citerne: '5203HC01', tracteur: '4573JC01', chauffeurs: ['BAMBA AMADOU'] },
  { citerne: '5457KU01', tracteur: '665LG01', chauffeurs: ['OUATTARA ABDOULAYE', 'SOUMAHORO ABOUBAKAR'] },
  { citerne: '5458KU01', tracteur: '662LG01', chauffeurs: ['DJIBRIL KONE', 'SANOGO MOHAMED'] },
  { citerne: '5779HF03', tracteur: 'AA978YL01', chauffeurs: ['KONE YAYA'] },
  { citerne: '5817FK01', tracteur: '5817FK01', chauffeurs: ['TOURE MAMADOU'] },
  { citerne: '6424HF01', tracteur: '6424HF01', chauffeurs: ['BAMBA MAMADOU', 'BAMBA MAMADOU FOUGNIGUE', 'KONE YAYA', 'TOURE MAMADOU'] },
  { citerne: '679JZ01', tracteur: '2081JP01', chauffeurs: ['DOUMBIA BAKARY'] },
  { citerne: '7423FB01', tracteur: '7423FB01', chauffeurs: ['KONATE ADAMA'] },
  { citerne: 'AA432AD', tracteur: '661LG01', chauffeurs: ['KONE MAMADOU'] },
  { citerne: 'AA501BN', tracteur: '3626KS01', chauffeurs: ['BAMBA AMADOU', 'DAO SOUNKALO'] },
  { citerne: 'AA525BL', tracteur: '656LG01', chauffeurs: ['DAO DJAKARIDJA', 'DOUMBIA ALI'] },
  { citerne: 'AA540BK', tracteur: '658LG01', chauffeurs: ['DOGO GBAGBO ERIC', 'SEKA YAPI ALEXANDRE'] },
  { citerne: 'AA620AE', tracteur: '657LG01', chauffeurs: ['COMPAORE SEYDOU', 'DOUMBIA SAIBOU'] },
  { citerne: 'AA624AE', tracteur: '659LG01', chauffeurs: ['BALAMINE KONE', 'IRIE BI LEZIE LANDRY RICHMOND'] },
  { citerne: 'AA629AE', tracteur: '655LG01', chauffeurs: ['KONATE MOHAMED'] },
  { citerne: 'AA737BL', tracteur: '3628KS01', chauffeurs: ['CAMARA BANGALY', 'OUATTARA ABDRAMANE'] },
  { citerne: 'AA887YY01', tracteur: 'AA887YY01', chauffeurs: ['KONATE ADAMA'] },
];

const TOTAL_ENERGIES_RECORDS: FleetRecord[] = [
  { citerne: '3017KS01', tracteur: '4807KT01', chauffeurs: ['KONE ZIE SALIF', 'COULIBALY GNINIGUEFOLOMAN DJAKARIDJA'] },
  { citerne: '3285LF01', tracteur: 'AA131XF01', chauffeurs: ['CAMARA OUSMANE', 'KONE HOSAHANA SIAKA'] },
  { citerne: '3286LF01', tracteur: 'AA132XF01', chauffeurs: ['KEITA MAMADOU', 'CISSE DRISSA', 'KONE HOSAHANA SIAKA'] },
  { citerne: '4634HC01', tracteur: '4255KA01', chauffeurs: ['YOUSSOUF TRAORE', 'BAMBA HAMED'] },
  { citerne: '4678JC01', tracteur: '4793KL01', chauffeurs: ['BARRY SANKARA ALASSANE', 'COULIBALY GNINIGUEFOLOMAN DJAKARIDJA', 'TOGOLA ISSA'] },
  { citerne: '738LS01', tracteur: '2186LT01', chauffeurs: ['BAZIE FREDERIC', 'COULIBALY GNINIGUEFOLOMAN DJAKARIDJA', 'CISSE MAMADOU'] },
  { citerne: '739LS01', tracteur: '739LS01', chauffeurs: ['YOUSSOUF TRAORE', 'SALL MAMADOU', 'KONE ZIE SALIF', 'BARRY SANKARA ALASSANE'] },
  { citerne: '968LZ01', tracteur: '1837LU01', chauffeurs: ['OUATTARA LANCINA', 'CISSE MAMADOU', 'BARRY SANKARA ALASSANE'] },
  { citerne: 'AA252SX01', tracteur: 'AA239SX01', chauffeurs: ['TRAORE ALASSANE'] },
  { citerne: 'AA255BN', tracteur: 'AA504BE', chauffeurs: ['SANOU ISSIF', 'KEITA MAMADOU'] },
  { citerne: 'AA264FR04', tracteur: 'AA781FX04', chauffeurs: ['KONATE TIDIANE'] },
  { citerne: 'AA378SH01', tracteur: 'AA211RV01', chauffeurs: ['SIDIBE HAMIDOU'] },
  { citerne: 'AA761AH', tracteur: 'AA761AH', chauffeurs: ['GNAHOUA HERMANN', 'DIARRASSOUBA LANSSINA'] },
  { citerne: 'AA971KT01', tracteur: '4799KL01', chauffeurs: ['SAMASSI SOULEYMANE', 'BARRY SANKARA ALASSANE', 'COULIBALY DJAKARIDJA'] },
];

// --- Construction des flottes ---

function buildClientFleet(records: FleetRecord[]): ClientFleet {
  return {
    records,
    citernes: records.map(r => r.citerne).sort(),
    tracteurs: [...new Set(records.map(r => r.tracteur))].sort(),
    chauffeurs: [...new Set(records.flatMap(r => r.chauffeurs))].sort(),
    citerneToTracteur: new Map(records.map(r => [r.citerne, r.tracteur])),
    tracteurToCiterne: new Map(records.map(r => [r.tracteur, r.citerne])),
    citerneTochauffeurs: new Map(records.map(r => [r.citerne, r.chauffeurs])),
  };
}

const EMPTY_FLEET: ClientFleet = {
  records: [],
  citernes: [],
  tracteurs: [],
  chauffeurs: [],
  citerneToTracteur: new Map(),
  tracteurToCiterne: new Map(),
  citerneTochauffeurs: new Map(),
};

// Registre des flottes par nom client (correspond à vrac_clients.nom)
const FLEET_REGISTRY: Record<string, ClientFleet> = {
  SIMAM: buildClientFleet(SIMAM_RECORDS),
  VIVO: buildClientFleet(VIVO_ENERGIES_RECORDS),
  TOTAL: buildClientFleet(TOTAL_ENERGIES_RECORDS),
  'PETRO IVOIRE': buildClientFleet(PETRO_IVOIRE_RECORDS),
};

// Aliases pour gérer les anciens noms en base (migration initiale)
const CLIENT_ALIASES: Record<string, string> = {
  'VIVO_ENERGIES': 'VIVO',
  'VIVO ENERGIES': 'VIVO',
  'TOTAL_ENERGIES': 'TOTAL',
  'TOTAL ENERGIES': 'TOTAL',
  'PETRO_IVOIRE': 'PETRO IVOIRE',
  'PETROIVOIRE': 'PETRO IVOIRE',
};

/** Récupère la flotte d'un client par son nom. Gère les alias et normalisation. */
export function getClientFleet(clientNom: string): ClientFleet {
  const normalized = clientNom.trim().toUpperCase();
  return FLEET_REGISTRY[normalized] || FLEET_REGISTRY[CLIENT_ALIASES[normalized] || ''] || EMPTY_FLEET;
}

/** Fusionne la flotte hardcodée avec l'historique des soumissions passées.
 *  Les nouvelles valeurs saisies manuellement enrichissent l'autocomplete. */
export function mergeFleetWithHistory(
  base: ClientFleet,
  history: Array<{ citerne: string; tracteur: string; chauffeur: string }>
): ClientFleet {
  if (!history || history.length === 0) return base;

  // Construire des records à partir de l'historique
  const histMap = new Map<string, { tracteur: string; chauffeurs: Set<string> }>();
  for (const h of history) {
    const c = normalizeImmat(h.citerne);
    const t = normalizeImmat(h.tracteur);
    const ch = h.chauffeur.toUpperCase().trim();
    if (!c || !t) continue;

    const existing = histMap.get(c);
    if (existing) {
      if (ch) existing.chauffeurs.add(ch);
    } else {
      const chauffeurs = new Set<string>();
      if (ch) chauffeurs.add(ch);
      histMap.set(c, { tracteur: t, chauffeurs });
    }
  }

  // Fusionner : base + nouvelles entrées de l'historique
  const mergedCiterneToTracteur = new Map(base.citerneToTracteur);
  const mergedTracteurToCiterne = new Map(base.tracteurToCiterne);
  const mergedCiterneToChauffeurs = new Map(
    Array.from(base.citerneTochauffeurs.entries()).map(([k, v]) => [k, [...v]])
  );
  const allCiternes = new Set(base.citernes);
  const allTracteurs = new Set(base.tracteurs);
  const allChauffeurs = new Set(base.chauffeurs);

  for (const [citerne, { tracteur, chauffeurs }] of histMap) {
    allCiternes.add(citerne);
    allTracteurs.add(tracteur);
    chauffeurs.forEach(ch => allChauffeurs.add(ch));

    if (!mergedCiterneToTracteur.has(citerne)) {
      mergedCiterneToTracteur.set(citerne, tracteur);
    }
    if (!mergedTracteurToCiterne.has(tracteur)) {
      mergedTracteurToCiterne.set(tracteur, citerne);
    }

    const existingChauffeurs = mergedCiterneToChauffeurs.get(citerne) || [];
    const merged = new Set([...existingChauffeurs, ...chauffeurs]);
    mergedCiterneToChauffeurs.set(citerne, [...merged]);
  }

  return {
    records: base.records,
    citernes: [...allCiternes].sort(),
    tracteurs: [...allTracteurs].sort(),
    chauffeurs: [...allChauffeurs].sort(),
    citerneToTracteur: mergedCiterneToTracteur,
    tracteurToCiterne: mergedTracteurToCiterne,
    citerneTochauffeurs: mergedCiterneToChauffeurs,
  };
}
