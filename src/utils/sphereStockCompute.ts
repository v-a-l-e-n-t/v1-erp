import Decimal from 'decimal.js';

Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

export type SphereId = 'S01' | 'S02' | 'S03';

export const SPHERE_IDS: readonly SphereId[] = ['S01', 'S02', 'S03'] as const;

export const CAPACITE_VOLUMIQUE_L: Record<SphereId, number> = {
  S01: 3_323_413,
  S02: 3_330_579,
  S03: 3_332_688,
};

export const CAPACITE_SPHERE_KG = 1_650_000;
export const RESERVE_TECHNIQUE_KG = 450_000;
export const P_ATM = 1.01325;
export const RATIO_GAZ_AIR = 2.004;

export interface SphereInputStrings {
  densite15: string;
  jauge: string;
  hMin: string;
  hMax: string;
  vMin: string;
  vMax: string;
  tLiq: string;
  tLiqMin: string;
  tLiqMax: string;
  dLiqMin: string;
  dLiqMax: string;
  tGaz: string;
  tGazMin: string;
  tGazMax: string;
  dGazMin: string;
  dGazMax: string;
  pression: string;
}

export const EMPTY_SPHERE_INPUT: SphereInputStrings = {
  densite15: '',
  jauge: '',
  hMin: '',
  hMax: '',
  vMin: '',
  vMax: '',
  tLiq: '',
  tLiqMin: '',
  tLiqMax: '',
  dLiqMin: '',
  dLiqMax: '',
  tGaz: '',
  tGazMin: '',
  tGazMax: '',
  dGazMin: '',
  dGazMax: '',
  pression: '',
};

export interface SphereResult {
  volumeLiquide: number | null;
  volumeGazeux: number | null;
  densiteButaneLiq: number | null;
  masseVolAirGaz: number | null;
  pAbs: number | null;
  masseLiq: number | null;
  masseGaz: number | null;
  masseTotale: number | null;
  creux: number | null;
}

export const EMPTY_RESULT: SphereResult = {
  volumeLiquide: null,
  volumeGazeux: null,
  densiteButaneLiq: null,
  masseVolAirGaz: null,
  pAbs: null,
  masseLiq: null,
  masseGaz: null,
  masseTotale: null,
  creux: null,
};

export function parseFr(s: string | undefined | null): number {
  if (s === undefined || s === null) return 0;
  const trimmed = String(s).trim();
  if (trimmed === '') return 0;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatFr(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function padDecimalsFr(s: string, decimals: number): string {
  const trimmed = s.trim();
  if (trimmed === '') return s;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  });
}

function safeLinearInterp(
  yMin: Decimal,
  yMax: Decimal,
  xMin: Decimal,
  xMax: Decimal,
  x: Decimal,
): Decimal | null {
  const dx = xMax.minus(xMin);
  if (dx.isZero()) return null;
  return yMin.plus(yMax.minus(yMin).div(dx).times(x.minus(xMin)));
}

export function computeSphere(
  sphereId: SphereId,
  input: SphereInputStrings,
): SphereResult {
  const d15 = new Decimal(parseFr(input.densite15));
  const jauge = new Decimal(parseFr(input.jauge));
  const hMin = new Decimal(parseFr(input.hMin));
  const hMax = new Decimal(parseFr(input.hMax));
  const vMin = new Decimal(parseFr(input.vMin));
  const vMax = new Decimal(parseFr(input.vMax));
  const tLiq = new Decimal(parseFr(input.tLiq));
  const tLiqMin = new Decimal(parseFr(input.tLiqMin));
  const tLiqMax = new Decimal(parseFr(input.tLiqMax));
  const dLiqMin = new Decimal(parseFr(input.dLiqMin));
  const dLiqMax = new Decimal(parseFr(input.dLiqMax));
  const tGaz = new Decimal(parseFr(input.tGaz));
  const tGazMin = new Decimal(parseFr(input.tGazMin));
  const tGazMax = new Decimal(parseFr(input.tGazMax));
  const dGazMin = new Decimal(parseFr(input.dGazMin));
  const dGazMax = new Decimal(parseFr(input.dGazMax));
  const pRel = new Decimal(parseFr(input.pression));

  const capaciteL = new Decimal(CAPACITE_VOLUMIQUE_L[sphereId]);

  // 1. Volume liquide
  const volLiq = safeLinearInterp(vMin, vMax, hMin, hMax, jauge);

  // 2. Volume gazeux
  const volGaz = volLiq === null ? null : capaciteL.minus(volLiq);

  // 3. Densité butane liquide corrigée
  // A5 : reste = densité15 × 1000 − TRUNC(densité15 × 1000)
  const d15x1000 = d15.times(1000);
  const partieEntiere = d15x1000.trunc(); // TRUNC (pas floor) pour valeurs ±
  const reste = d15x1000.minus(partieEntiere);
  const densInterp = safeLinearInterp(dLiqMin, dLiqMax, tLiqMin, tLiqMax, tLiq);
  // A1 : arrondi à 4 décimales AVANT utilisation
  const densCorr =
    densInterp === null
      ? null
      : densInterp.plus(reste).div(1000).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

  // 4. Masse volumique air sec corrigée T° gaz
  const mvAirInterp = safeLinearInterp(dGazMin, dGazMax, tGazMin, tGazMax, tGaz);
  // A2 : arrondi à 7 décimales AVANT utilisation
  const mvAir =
    mvAirInterp === null
      ? null
      : mvAirInterp.div(1000).toDecimalPlaces(7, Decimal.ROUND_HALF_UP);

  // 5. Pression absolue (pas d'arrondi de calcul)
  const pAbs = pRel.plus(P_ATM);

  // 6. Masse liquide — A3 : arrondi à l'entier
  const masseLiq =
    volLiq === null || densCorr === null
      ? null
      : volLiq.times(densCorr).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  // 7. Masse gazeuse — A4 : arrondi à l'entier
  const masseGaz =
    volGaz === null || mvAir === null
      ? null
      : volGaz
          .times(mvAir)
          .times(RATIO_GAZ_AIR)
          .times(pAbs)
          .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  // 8. Masse totale (somme de deux entiers)
  const masseTot =
    masseLiq === null || masseGaz === null ? null : masseLiq.plus(masseGaz);

  // 9. Creux
  const creux =
    masseTot === null ? null : new Decimal(CAPACITE_SPHERE_KG).minus(masseTot);

  return {
    volumeLiquide: volLiq ? volLiq.toNumber() : null,
    volumeGazeux: volGaz ? volGaz.toNumber() : null,
    densiteButaneLiq: densCorr ? densCorr.toNumber() : null,
    masseVolAirGaz: mvAir ? mvAir.toNumber() : null,
    pAbs: pAbs.toNumber(),
    masseLiq: masseLiq ? masseLiq.toNumber() : null,
    masseGaz: masseGaz ? masseGaz.toNumber() : null,
    masseTotale: masseTot ? masseTot.toNumber() : null,
    creux: creux ? creux.toNumber() : null,
  };
}

export interface GlobalSummary {
  stockJour: number | null;
  stockExploitable: number | null;
  creuxTotal: number | null;
}

export function computeGlobalSummary(results: SphereResult[]): GlobalSummary {
  // Somme partielle : on additionne les sphères déjà calculées,
  // les sphères vides comptent pour 0.
  const sum = (vals: (number | null)[]) =>
    vals.some((v) => v !== null)
      ? vals.reduce<number>((a, b) => a + (b ?? 0), 0)
      : null;

  const stockJour = sum(results.map((r) => r.masseTotale));
  const stockExploitable =
    stockJour === null ? null : stockJour - RESERVE_TECHNIQUE_KG;
  const creuxTotal = sum(results.map((r) => r.creux));

  return { stockJour, stockExploitable, creuxTotal };
}
