// Utilitaires du module /rapport-bl.

import type { BonClient } from '@/types/bons';

/**
 * Normalise le nom client tel qu'il apparaît dans l'extraction Excel du
 * logiciel de pesée vers l'enum `BonClient` utilisé en base.
 *
 * Exemples observés dans `recap_pic.xlsx` :
 *   "PETROIVOIRE", "SIMAM", "VIVO ENERGY CI", "TOTAL ENERGIES"
 */
export function normalizeClient(raw: unknown): BonClient | null {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().trim();
  if (s.includes('SIMAM')) return 'SIMAM';
  if (s.includes('PETRO')) return 'PETROIVOIRE'; // Petroivoire / Petro Ivoire / etc.
  if (s.includes('VIVO')) return 'VIVO';
  if (s.includes('TOTAL')) return 'TOTAL';
  return null;
}

/**
 * Convertit une date issue d'une cellule Excel (serial ou string) en `Date`.
 * Reprend la logique de MandatairesImport.tsx (parseDate).
 */
export function parseExcelDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return raw;

  if (typeof raw === 'number') {
    // Excel serial date : base 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000);
  }

  const s = String(raw).trim();
  if (!s) return null;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Génère la plage de numéros de bons entre `start` et `end` (inclus).
 * Le **padding zéro** du numéro de départ est conservé sur toute la plage.
 *
 * @example
 * generateRange('0007493', '0007495') // → ['0007493','0007494','0007495']
 * generateRange('100', '102')         // → ['100', '101', '102']
 */
export function generateRange(start: string, end: string): string[] {
  const s = String(start).trim();
  const e = String(end).trim();
  const startNum = parseInt(s, 10);
  const endNum = parseInt(e, 10);
  if (isNaN(startNum) || isNaN(endNum)) {
    throw new Error('Numéros de bon invalides.');
  }
  if (startNum > endNum) {
    throw new Error('Le numéro de début doit être ≤ au numéro de fin.');
  }
  // On garde le padding du plus long des deux (sécurise les cas "100" → "1050")
  const width = Math.max(s.length, e.length);
  const out: string[] = [];
  for (let n = startNum; n <= endNum; n++) {
    out.push(String(n).padStart(width, '0'));
  }
  return out;
}

/**
 * Compacte une liste de numéros de bons en plages consécutives, conservant
 * leur padding. Utile pour l'affichage du stock disponible.
 *
 * @example
 * compactNumbers(['0007490','0007491','0007492','0007500','0007501'])
 * // → [{from:'0007490',to:'0007492',count:3}, {from:'0007500',to:'0007501',count:2}]
 */
export function compactNumbers(nums: string[]): { from: string; to: string; count: number }[] {
  const sorted = [...nums].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return na - nb;
  });
  const ranges: { from: string; to: string; count: number }[] = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && parseInt(n, 10) === parseInt(last.to, 10) + 1) {
      last.to = n;
      last.count += 1;
    } else {
      ranges.push({ from: n, to: n, count: 1 });
    }
  }
  return ranges;
}

/** Format YYYY-MM-DD (UTC-safe) à partir d'une Date locale. */
export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ============== EXPIRATION DES BONS ==============
// Un bon a une durée de vie de 30 jours à partir de sa date sur bon
// (date_edition). Au-delà, il est considéré comme expiré.
export const BON_LIFETIME_DAYS = 30;
// Seuil d'alerte plateforme : on prévient à partir de 3 jours avant expiration.
export const BON_EXPIRY_ALERT_DAYS = 3;

export type ExpiryLevel = 'ok' | 'warning' | 'danger' | 'expired';

/**
 * Jours restants avant expiration (peut être négatif si déjà expiré).
 * Basé sur `date_edition` (date imprimée sur le bon).
 */
export function daysLeft(dateEditionIso: string | null | undefined): number | null {
  if (!dateEditionIso) return null;
  const d = new Date(dateEditionIso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - d.getTime();
  const daysElapsed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return BON_LIFETIME_DAYS - daysElapsed;
}

/** Catégorise les jours restants pour le code couleur. */
export function expiryLevel(days: number | null): ExpiryLevel {
  if (days == null) return 'ok';
  if (days <= 0) return 'expired';
  if (days <= BON_EXPIRY_ALERT_DAYS) return 'danger';
  if (days <= 7) return 'warning';
  return 'ok';
}
