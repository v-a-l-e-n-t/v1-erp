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

// --- Ajouter les données des autres clients ici ---
// const VIVO_ENERGIES_RECORDS: FleetRecord[] = [ ... ];
// const TOTAL_ENERGIES_RECORDS: FleetRecord[] = [ ... ];
// const PETRO_IVOIRE_RECORDS: FleetRecord[] = [ ... ];

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
  // VIVO_ENERGIES: buildClientFleet(VIVO_ENERGIES_RECORDS),
  // TOTAL_ENERGIES: buildClientFleet(TOTAL_ENERGIES_RECORDS),
  // PETRO_IVOIRE: buildClientFleet(PETRO_IVOIRE_RECORDS),
};

/** Récupère la flotte d'un client par son nom. Retourne une flotte vide si inconnu. */
export function getClientFleet(clientNom: string): ClientFleet {
  return FLEET_REGISTRY[clientNom] || EMPTY_FLEET;
}
