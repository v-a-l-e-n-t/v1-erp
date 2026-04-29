import { useMemo, useState, useCallback } from 'react';
import {
  EMPTY_SPHERE_INPUT,
  computeSphere,
  parseFr,
  type SphereId,
  type SphereInputStrings,
  type SphereResult,
} from '@/utils/sphereStockCompute';

export interface UseSphereStock {
  input: SphereInputStrings;
  result: SphereResult;
  setField: (key: keyof SphereInputStrings, value: string) => void;
  setAll: (input: SphereInputStrings) => void;
  reset: () => void;
}

const isInteger = (n: number) => Number.isFinite(n) && Math.floor(n) === n;

/**
 * Règles d'auto-remplissage des bornes lorsque l'utilisateur saisit
 * une valeur principale (jauge / T° liquide / T° gaz).
 * Retourne un patch partiel à fusionner dans le state.
 */
function autoFillPatch(
  sphereId: SphereId,
  key: keyof SphereInputStrings,
  raw: string,
): Partial<SphereInputStrings> | null {
  if (raw.trim() === '') return null;
  const v = parseFr(raw);
  if (!Number.isFinite(v)) return null;

  if (key === 'jauge') {
    // S01 : Hmin = valeur saisie, Hmax vide
    if (sphereId === 'S01') {
      return { hMin: String(v), hMax: '' };
    }
    // S02 / S03 : encadrement de 10 en 10
    if (v % 10 === 0) {
      return { hMin: String(v), hMax: '' };
    }
    const hMin = Math.floor(v / 10) * 10;
    const hMax = Math.ceil(v / 10) * 10;
    return { hMin: String(hMin), hMax: String(hMax) };
  }

  if (key === 'tLiq') {
    // Entier : Tmin = T, Tmax vide
    if (isInteger(v)) {
      return { tLiqMin: String(v), tLiqMax: '' };
    }
    // Décimal ≥ 10 : encadrement de 1 en 1
    if (v >= 10) {
      return {
        tLiqMin: String(Math.floor(v)),
        tLiqMax: String(Math.ceil(v)),
      };
    }
    return null;
  }

  if (key === 'tGaz') {
    // Entier : Tmin = T, Tmax vide
    if (isInteger(v)) {
      return { tGazMin: String(v), tGazMax: '' };
    }
    // Décimal : encadrement de 0,5 en 0,5
    const lo = Math.floor(v * 2) / 2;
    const hi = Math.ceil(v * 2) / 2;
    return { tGazMin: String(lo), tGazMax: String(hi) };
  }

  return null;
}

export function useSphereStock(sphereId: SphereId): UseSphereStock {
  const [input, setInput] = useState<SphereInputStrings>(EMPTY_SPHERE_INPUT);

  const setField = useCallback(
    (key: keyof SphereInputStrings, value: string) => {
      setInput((prev) => {
        const patch = autoFillPatch(sphereId, key, value);
        return { ...prev, [key]: value, ...(patch ?? {}) };
      });
    },
    [sphereId],
  );

  const setAll = useCallback((next: SphereInputStrings) => setInput(next), []);
  const reset = useCallback(() => setInput(EMPTY_SPHERE_INPUT), []);

  const result = useMemo(() => computeSphere(sphereId, input), [sphereId, input]);

  return { input, result, setField, setAll, reset };
}
