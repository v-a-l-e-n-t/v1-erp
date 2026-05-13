/**
 * Table de variation du poids spécifique (densité) de l'air sec en
 * fonction de la température, à pression atmosphérique.
 * Source : Variation_Poids_Spe_Temp.xlsx — pas de 0,5°C de 0 à 58°C.
 *
 * Unité : densité en kg/m³ (à diviser par 1000 dans les formules pour
 * obtenir des kg/L, comme dans le tableur d'origine).
 */

/** Map "T° (°C, multiple de 0,5)" → "densité air sec (kg/m³)". */
export const AIR_DENSITY_TABLE: Record<number, number> = {
  0: 1.293, 0.5: 1.2906, 1: 1.2882, 1.5: 1.2858, 2: 1.2834, 2.5: 1.281,
  3: 1.2786, 3.5: 1.2762, 4: 1.2738, 4.5: 1.2714, 5: 1.269, 5.5: 1.2666,
  6: 1.2642, 6.5: 1.2618, 7: 1.2594, 7.5: 1.257, 8: 1.2546, 8.5: 1.2522,
  9: 1.2498, 9.5: 1.2474, 10: 1.245, 10.5: 1.2426, 11: 1.2402, 11.5: 1.2378,
  12: 1.2354, 12.5: 1.233, 13: 1.2306, 13.5: 1.2282, 14: 1.2258, 14.5: 1.2234,
  15: 1.221, 15.5: 1.2186, 16: 1.2162, 16.5: 1.2138, 17: 1.2114, 17.5: 1.209,
  18: 1.2066, 18.5: 1.2042, 19: 1.2018, 19.5: 1.1994, 20: 1.197, 20.5: 1.1946,
  21: 1.1922, 21.5: 1.1898, 22: 1.1874, 22.5: 1.185, 23: 1.1826, 23.5: 1.1802,
  24: 1.1778, 24.5: 1.1754, 25: 1.173, 25.5: 1.1706, 26: 1.1682, 26.5: 1.1658,
  27: 1.1634, 27.5: 1.161, 28: 1.1586, 28.5: 1.1562, 29: 1.1538, 29.5: 1.1514,
  30: 1.149, 30.5: 1.1466, 31: 1.1442, 31.5: 1.1418, 32: 1.1394, 32.5: 1.137,
  33: 1.1346, 33.5: 1.1322, 34: 1.1298, 34.5: 1.1274, 35: 1.125, 35.5: 1.1226,
  36: 1.1202, 36.5: 1.1178, 37: 1.1154, 37.5: 1.113, 38: 1.1106, 38.5: 1.1082,
  39: 1.1058, 39.5: 1.1034, 40: 1.101, 40.5: 1.0986, 41: 1.0962, 41.5: 1.0938,
  42: 1.0914, 42.5: 1.089, 43: 1.0866, 43.5: 1.0842, 44: 1.0818, 44.5: 1.0794,
  45: 1.077, 45.5: 1.0746, 46: 1.0722, 46.5: 1.0698, 47: 1.0674, 47.5: 1.065,
  48: 1.0626, 48.5: 1.0602, 49: 1.0578, 49.5: 1.0554, 50: 1.053, 50.5: 1.0506,
  51: 1.0482, 51.5: 1.0458, 52: 1.0434, 52.5: 1.041, 53: 1.0386, 53.5: 1.0362,
  54: 1.0338, 54.5: 1.0314, 55: 1.029, 55.5: 1.0266, 56: 1.0242, 56.5: 1.0218,
  57: 1.0194, 57.5: 1.017, 58: 1.0146,
};

/**
 * Renvoie la densité air sec correspondant à une température (en kg/m³),
 * en arrondissant la T° au demi-degré le plus proche (la table n'est
 * définie que sur les multiples de 0,5°C).
 * Retourne null si T° hors plage [0 ; 58].
 */
export function lookupAirDensity(tempC: number): number | null {
  if (!Number.isFinite(tempC)) return null;
  const key = Math.round(tempC * 2) / 2;
  if (key < 0 || key > 58) return null;
  const v = AIR_DENSITY_TABLE[key];
  return v === undefined ? null : v;
}

/**
 * Pour un encadrement T°min / T°max (multiples de 0,5°C), renvoie les
 * densités air sec correspondantes. Si une borne est vide ou hors plage,
 * la densité associée est null.
 */
export function airDensityBounds(
  tMin: number | null | undefined,
  tMax: number | null | undefined,
): { dMin: number | null; dMax: number | null } {
  return {
    dMin: tMin === null || tMin === undefined ? null : lookupAirDensity(tMin),
    dMax: tMax === null || tMax === undefined ? null : lookupAirDensity(tMax),
  };
}

/** Format français à 4 décimales (utilisé pour pré-remplir les inputs). */
export function formatAirDensityFr(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '';
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    useGrouping: false,
  });
}
