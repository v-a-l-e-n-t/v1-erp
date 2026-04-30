/**
 * Logique de calcul de la masse de butane reçue d'un navire.
 * Reproduit fidèlement le tableur de référence (cf. cahier des charges).
 *
 * Pour chaque sphère :
 *   - 1 état AVANT le transfert
 *   - 1 état APRÈS le transfert
 *   - masse_transferee = masse_totale_APRES − masse_totale_AVANT
 *
 * Arrondis de calcul critiques (sinon écart de quelques kg vs Excel) :
 *   - rho_butane_liq  : ROUND 4 décimales avant utilisation dans masse_liquide
 *   - rho_air         : ROUND 7 décimales avant utilisation dans masse_gazeuse
 *   - masse_liquide   : ROUND 0 décimale (entier)
 *   - masse_gazeuse   : ROUND 0 décimale (entier)
 *   - partie_entiere  : TRUNC (Math.trunc), pas Math.floor (différent pour les négatifs)
 */
import { CAPACITE_VOLUMIQUE_L, type SphereId } from '@/utils/sphereStockCompute';

export type { SphereId };
export { CAPACITE_VOLUMIQUE_L };

export const DENSITE_BUTANE_GAZ_AIR = 2.004;
export const PRESSION_ATMOSPHERIQUE = 1.01325;

/**
 * 18 inputs par état (AVANT ou APRÈS), saisis comme strings pour autoriser
 * l'affichage virgule française et les champs vides en cours d'édition.
 */
export interface ReceptionStateInputs {
  jauge_mm: string;
  hauteur_min_mm: string;
  hauteur_max_mm: string;
  volume_min_L: string;
  volume_max_L: string;
  densite_recue: string;
  densite_bac: string;
  temperature_liquide_C: string;
  temp_liq_min_C: string;
  temp_liq_max_C: string;
  densite_liq_min: string;
  densite_liq_max: string;
  temperature_gaz_C: string;
  temp_gaz_min_C: string;
  temp_gaz_max_C: string;
  airdensity_min: string;
  airdensity_max: string;
  pression_relative_bar: string;
}

export const EMPTY_RECEPTION_STATE: ReceptionStateInputs = {
  jauge_mm: '',
  hauteur_min_mm: '',
  hauteur_max_mm: '',
  volume_min_L: '',
  volume_max_L: '',
  densite_recue: '',
  densite_bac: '',
  temperature_liquide_C: '',
  temp_liq_min_C: '',
  temp_liq_max_C: '',
  densite_liq_min: '',
  densite_liq_max: '',
  temperature_gaz_C: '',
  temp_gaz_min_C: '',
  temp_gaz_max_C: '',
  airdensity_min: '',
  airdensity_max: '',
  pression_relative_bar: '',
};

export interface ReceptionStateResult {
  volume_liquide: number | null;
  volume_gazeux: number | null;
  pression_absolue: number | null;
  densite_15C_melange: number | null;
  rho_butane_liq: number | null;   // arrondi 4 décimales
  rho_air: number | null;           // arrondi 7 décimales
  masse_liquide: number | null;     // entier
  masse_gazeuse: number | null;     // entier
  masse_totale: number | null;
}

export interface ReceptionResult {
  avant: ReceptionStateResult;
  apres: ReceptionStateResult;
  masse_transferee: number | null;
}

const EMPTY_STATE_RESULT: ReceptionStateResult = {
  volume_liquide: null,
  volume_gazeux: null,
  pression_absolue: null,
  densite_15C_melange: null,
  rho_butane_liq: null,
  rho_air: null,
  masse_liquide: null,
  masse_gazeuse: null,
  masse_totale: null,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function parseFr(s: string | undefined | null): number {
  if (s === undefined || s === null) return NaN;
  const t = String(s).trim();
  if (t === '') return NaN;
  const n = Number(t.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function safeDiv(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** Linéaire avec garde-fou division par zéro (max-min = 0 → null). */
function interp(yMin: number, yMax: number, xMin: number, xMax: number, x: number): number | null {
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) ||
      !Number.isFinite(xMin) || !Number.isFinite(xMax) ||
      !Number.isFinite(x)) return null;
  const dx = xMax - xMin;
  if (dx === 0) return null;
  return yMin + ((yMax - yMin) / dx) * (x - xMin);
}

function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/* ------------------------------------------------------------------ */
/* Étapes de calcul                                                    */
/* ------------------------------------------------------------------ */

/** Volume liquide + gazeux + pression absolue, sans dépendance entre AVANT/APRÈS. */
function computeStateBase(
  inputs: ReceptionStateInputs,
  capaciteSphere: number,
): {
  volume_liquide: number | null;
  volume_gazeux: number | null;
  pression_absolue: number | null;
} {
  const jauge = parseFr(inputs.jauge_mm);
  const hMin = parseFr(inputs.hauteur_min_mm);
  const hMax = parseFr(inputs.hauteur_max_mm);
  const vMin = parseFr(inputs.volume_min_L);
  const vMax = parseFr(inputs.volume_max_L);

  const volume_liquide = interp(vMin, vMax, hMin, hMax, jauge);
  const volume_gazeux =
    volume_liquide === null ? null : capaciteSphere - volume_liquide;

  const pRel = parseFr(inputs.pression_relative_bar);
  const pression_absolue = Number.isFinite(pRel)
    ? pRel + PRESSION_ATMOSPHERIQUE
    : null;

  return { volume_liquide, volume_gazeux, pression_absolue };
}

/**
 * Densité du mélange à 15°C.
 * Pour AVANT : ratio = vol_avant / vol_avant = 1, donc résultat = densite_bac
 * (cosmétique, conservé pour respecter le tableur source).
 */
function densiteMelange(
  densiteRecue: number,
  densiteBac: number,
  volumeAvant: number | null,
  volumeApres: number | null,
): number | null {
  if (!Number.isFinite(densiteRecue) || !Number.isFinite(densiteBac)) return null;
  if (volumeAvant === null || volumeApres === null) return null;
  const ratio = safeDiv(volumeAvant, volumeApres);
  if (ratio === null) return null;
  return densiteRecue + (densiteBac - densiteRecue) * ratio;
}

/**
 * Masse volumique butane liquide à T° du liquide.
 * Étape 4.4 : interpolation 2D décomposée en partie entière + reste.
 * → ROUND 4 décimales avant utilisation dans le calcul de masse.
 */
function rhoButaneLiquide(
  densite15CMelange: number | null,
  inputs: ReceptionStateInputs,
): number | null {
  if (densite15CMelange === null || !Number.isFinite(densite15CMelange)) return null;

  const dx1000 = densite15CMelange * 1000;
  const partieEntiere = Math.trunc(dx1000);
  const reste = dx1000 - partieEntiere;

  const dMin = parseFr(inputs.densite_liq_min);
  const dMax = parseFr(inputs.densite_liq_max);
  const tMin = parseFr(inputs.temp_liq_min_C);
  const tMax = parseFr(inputs.temp_liq_max_C);
  const tLiq = parseFr(inputs.temperature_liquide_C);

  const tempInterp = interp(dMin, dMax, tMin, tMax, tLiq);
  if (tempInterp === null) return null;

  const rho = (tempInterp + reste) / 1000;
  return round(rho, 4);
}

/**
 * Masse volumique de l'air sec (kg/L) à la température du gaz.
 * → ROUND 7 décimales avant utilisation dans le calcul de masse gazeuse.
 */
function rhoAir(inputs: ReceptionStateInputs): number | null {
  const aMin = parseFr(inputs.airdensity_min);
  const aMax = parseFr(inputs.airdensity_max);
  const tMin = parseFr(inputs.temp_gaz_min_C);
  const tMax = parseFr(inputs.temp_gaz_max_C);
  const tGaz = parseFr(inputs.temperature_gaz_C);

  const interp_kg_m3 = interp(aMin, aMax, tMin, tMax, tGaz);
  if (interp_kg_m3 === null) return null;

  return round(interp_kg_m3 / 1000, 7);
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/** Calcule l'ensemble des résultats pour les deux états d'une sphère. */
export function computeReception(
  sphereId: SphereId,
  avantInputs: ReceptionStateInputs,
  apresInputs: ReceptionStateInputs,
): ReceptionResult {
  const capacite = CAPACITE_VOLUMIQUE_L[sphereId];

  const av = computeStateBase(avantInputs, capacite);
  const ap = computeStateBase(apresInputs, capacite);

  // Densités saisies (mêmes physiquement avant/après mais l'utilisateur
  // peut les avoir saisies différemment, on respecte la saisie)
  const dRecueAv = parseFr(avantInputs.densite_recue);
  const dBacAv   = parseFr(avantInputs.densite_bac);
  const dRecueAp = parseFr(apresInputs.densite_recue);
  const dBacAp   = parseFr(apresInputs.densite_bac);

  // Mélange AVANT : ratio volume_avant / volume_avant = 1
  const dMelAv = densiteMelange(dRecueAv, dBacAv, av.volume_liquide, av.volume_liquide);
  // Mélange APRÈS : vrai calcul physique
  const dMelAp = densiteMelange(dRecueAp, dBacAp, av.volume_liquide, ap.volume_liquide);

  const rbAv = rhoButaneLiquide(dMelAv, avantInputs);
  const raAv = rhoAir(avantInputs);

  const rbAp = rhoButaneLiquide(dMelAp, apresInputs);
  const raAp = rhoAir(apresInputs);

  const masseLiqAv =
    av.volume_liquide === null || rbAv === null
      ? null
      : Math.round(av.volume_liquide * rbAv);
  const masseGazAv =
    av.volume_gazeux === null || raAv === null || av.pression_absolue === null
      ? null
      : Math.round(av.volume_gazeux * raAv * DENSITE_BUTANE_GAZ_AIR * av.pression_absolue);
  const masseTotAv =
    masseLiqAv === null || masseGazAv === null ? null : masseLiqAv + masseGazAv;

  const masseLiqAp =
    ap.volume_liquide === null || rbAp === null
      ? null
      : Math.round(ap.volume_liquide * rbAp);
  const masseGazAp =
    ap.volume_gazeux === null || raAp === null || ap.pression_absolue === null
      ? null
      : Math.round(ap.volume_gazeux * raAp * DENSITE_BUTANE_GAZ_AIR * ap.pression_absolue);
  const masseTotAp =
    masseLiqAp === null || masseGazAp === null ? null : masseLiqAp + masseGazAp;

  const masseTransferee =
    masseTotAv === null || masseTotAp === null ? null : masseTotAp - masseTotAv;

  return {
    avant: {
      ...av,
      densite_15C_melange: dMelAv,
      rho_butane_liq: rbAv,
      rho_air: raAv,
      masse_liquide: masseLiqAv,
      masse_gazeuse: masseGazAv,
      masse_totale: masseTotAv,
    },
    apres: {
      ...ap,
      densite_15C_melange: dMelAp,
      rho_butane_liq: rbAp,
      rho_air: raAp,
      masse_liquide: masseLiqAp,
      masse_gazeuse: masseGazAp,
      masse_totale: masseTotAp,
    },
    masse_transferee: masseTransferee,
  };
}

export const EMPTY_RECEPTION_RESULT: ReceptionResult = {
  avant: EMPTY_STATE_RESULT,
  apres: EMPTY_STATE_RESULT,
  masse_transferee: null,
};

/* ------------------------------------------------------------------ */
/* Marketers                                                           */
/* ------------------------------------------------------------------ */

export interface MarketerSplit {
  PETROIVOIRE: string; // % saisis comme strings
  TOTAL_CI: string;
  VIVO: string;
}

export const EMPTY_MARKETER_SPLIT: MarketerSplit = {
  PETROIVOIRE: '',
  TOTAL_CI: '',
  VIVO: '',
};

export function computeMarketerKg(
  split: MarketerSplit,
  masseTransferee: number | null,
): { PETROIVOIRE: number | null; TOTAL_CI: number | null; VIVO: number | null; total: number } {
  if (masseTransferee === null) {
    return { PETROIVOIRE: null, TOTAL_CI: null, VIVO: null, total: 0 };
  }
  const p = parseFr(split.PETROIVOIRE);
  const t = parseFr(split.TOTAL_CI);
  const v = parseFr(split.VIVO);
  const total = (Number.isFinite(p) ? p : 0) + (Number.isFinite(t) ? t : 0) + (Number.isFinite(v) ? v : 0);
  return {
    PETROIVOIRE: Number.isFinite(p) ? Math.round(masseTransferee * (p / 100)) : null,
    TOTAL_CI:    Number.isFinite(t) ? Math.round(masseTransferee * (t / 100)) : null,
    VIVO:        Number.isFinite(v) ? Math.round(masseTransferee * (v / 100)) : null,
    total,
  };
}

/* ------------------------------------------------------------------ */
/* Auto-fill : règles d'encadrement (mêmes que stock-sphere)           */
/* ------------------------------------------------------------------ */

const isInteger = (n: number) => Number.isFinite(n) && Math.floor(n) === n;

/* ------------------------------------------------------------------ */
/* Génération de données de test cohérentes (Ctrl+Shift+Z)             */
/* ------------------------------------------------------------------ */

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function frFixed(n: number, d: number): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
    useGrouping: false,
  });
}

function buildOneState(sphereId: SphereId): ReceptionStateInputs {
  // Densités produit
  const densiteRecue = rand(0.572, 0.589);
  const densiteBac = rand(0.572, 0.589);

  // Jauge : entre 1 500 et 9 800 mm
  const jauge = Math.round(rand(1500, 9800));
  const isS01 = sphereId === 'S01';
  const hMin = isS01 ? jauge : Math.floor(jauge / 10) * 10;
  const hMaxRaw = isS01 ? '' : jauge % 10 === 0 ? '' : Math.ceil(jauge / 10) * 10;

  // Volume linéaire approximatif (~capacité_litre / 10 000 mm)
  const litresPerMm = CAPACITE_VOLUMIQUE_L[sphereId] / 10000;
  const vMin = Math.round((typeof hMin === 'number' ? hMin : Number(hMin)) * litresPerMm);
  const vMax = hMaxRaw === '' ? '' : Math.round(Number(hMaxRaw) * litresPerMm);

  // Températures
  const tLiq = rand(18, 30);
  const tLiqInt = Number.isInteger(tLiq);
  const tLiqMin = tLiqInt ? Math.round(tLiq) : Math.floor(tLiq);
  const tLiqMax = tLiqInt ? '' : Math.ceil(tLiq);

  const tGaz = rand(18, 30);
  const tGazIsHalf = Number.isInteger(tGaz * 2);
  const tGazRound = Math.round(tGaz * 2) / 2;
  const tGazMin = tGazIsHalf ? tGazRound : Math.floor(tGaz * 2) / 2;
  const tGazMax = tGazIsHalf ? '' : Math.ceil(tGaz * 2) / 2;

  // Densité butane liquide centrée selon T° (kg/m³)
  const dLiqCenter = 583 - (tLiq - 15) * 0.7;
  const dLiqMin = dLiqCenter + rand(-0.5, 0.5);
  const dLiqMax = dLiqMin - rand(0.7, 1.0);

  // Densité air sec selon T° gaz (kg/m³)
  const dGazCenter = 1.182 - (tGaz - 15) * 0.0006;
  const dGazMin = dGazCenter;
  const dGazMax = dGazMin - rand(0.0003, 0.0006);

  // Pression relative
  const pression = rand(0.6, 2.4);

  return {
    densite_recue: frFixed(densiteRecue, 4),
    densite_bac: frFixed(densiteBac, 4),
    jauge_mm: String(jauge),
    hauteur_min_mm: String(hMin),
    hauteur_max_mm: hMaxRaw === '' ? '' : String(hMaxRaw),
    volume_min_L: String(vMin),
    volume_max_L: vMax === '' ? '' : String(vMax),
    temperature_liquide_C: frFixed(tLiq, 2),
    temp_liq_min_C: String(tLiqMin),
    temp_liq_max_C: tLiqMax === '' ? '' : String(tLiqMax),
    densite_liq_min: frFixed(dLiqMin, 4),
    densite_liq_max: frFixed(dLiqMax, 4),
    temperature_gaz_C: frFixed(tGaz, 2),
    temp_gaz_min_C: String(tGazMin),
    temp_gaz_max_C: tGazMax === '' ? '' : String(tGazMax),
    airdensity_min: frFixed(dGazMin, 4),
    airdensity_max: frFixed(dGazMax, 4),
    pression_relative_bar: frFixed(pression, 3),
  };
}

/**
 * Génère deux états cohérents AVANT / APRÈS pour une même sphère.
 * - mêmes densités produit
 * - jauge AVANT < jauge APRÈS (transfert positif)
 * - mêmes bornes IL / air sec quand les températures coïncident
 */
export function buildRandomReception(sphereId: SphereId): {
  avant: ReceptionStateInputs;
  apres: ReceptionStateInputs;
} {
  const avant = buildOneState(sphereId);
  const apres = buildOneState(sphereId);
  // Cohérence : même densité produit reçue + bac, jauge APRÈS >= jauge AVANT.
  apres.densite_recue = avant.densite_recue;
  apres.densite_bac = avant.densite_bac;

  const jauseAv = parseFr(avant.jauge_mm);
  const jauseAp = parseFr(apres.jauge_mm);
  if (Number.isFinite(jauseAv) && Number.isFinite(jauseAp) && jauseAp < jauseAv) {
    // Inverse pour que APRÈS soit toujours >= AVANT (jauge croît avec le transfert)
    const tmp = avant.jauge_mm;
    avant.jauge_mm = apres.jauge_mm;
    avant.hauteur_min_mm = apres.hauteur_min_mm;
    avant.hauteur_max_mm = apres.hauteur_max_mm;
    avant.volume_min_L = apres.volume_min_L;
    avant.volume_max_L = apres.volume_max_L;
    apres.jauge_mm = tmp;
    // Recalcul des bornes APRÈS depuis la nouvelle jauge
    const j = parseFr(tmp);
    if (sphereId === 'S01') {
      apres.hauteur_min_mm = String(j);
      apres.hauteur_max_mm = '';
    } else if (j % 10 === 0) {
      apres.hauteur_min_mm = String(j);
      apres.hauteur_max_mm = '';
    } else {
      apres.hauteur_min_mm = String(Math.floor(j / 10) * 10);
      apres.hauteur_max_mm = String(Math.ceil(j / 10) * 10);
    }
    const lpm = CAPACITE_VOLUMIQUE_L[sphereId] / 10000;
    apres.volume_min_L = String(Math.round(parseFr(apres.hauteur_min_mm) * lpm));
    apres.volume_max_L = apres.hauteur_max_mm === ''
      ? ''
      : String(Math.round(parseFr(apres.hauteur_max_mm) * lpm));
  }

  return { avant, apres };
}

export function autoFillFromKey(
  sphereId: SphereId,
  key: keyof ReceptionStateInputs,
  rawValue: string,
): Partial<ReceptionStateInputs> | null {
  if (rawValue.trim() === '') return null;
  const v = parseFr(rawValue);
  if (!Number.isFinite(v)) return null;

  if (key === 'jauge_mm') {
    if (sphereId === 'S01') {
      return { hauteur_min_mm: String(v), hauteur_max_mm: '' };
    }
    if (v % 10 === 0) {
      return { hauteur_min_mm: String(v), hauteur_max_mm: '' };
    }
    return {
      hauteur_min_mm: String(Math.floor(v / 10) * 10),
      hauteur_max_mm: String(Math.ceil(v / 10) * 10),
    };
  }

  if (key === 'temperature_liquide_C') {
    if (isInteger(v)) {
      return { temp_liq_min_C: String(v), temp_liq_max_C: '' };
    }
    if (v >= 10) {
      return { temp_liq_min_C: String(Math.floor(v)), temp_liq_max_C: String(Math.ceil(v)) };
    }
    return null;
  }

  if (key === 'temperature_gaz_C') {
    if (isInteger(v)) {
      return { temp_gaz_min_C: String(v), temp_gaz_max_C: '' };
    }
    return {
      temp_gaz_min_C: String(Math.floor(v * 2) / 2),
      temp_gaz_max_C: String(Math.ceil(v * 2) / 2),
    };
  }

  return null;
}
