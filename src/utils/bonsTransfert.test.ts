import { describe, it, expect } from 'vitest';
import {
  normalizeClient,
  parseExcelDate,
  generateRange,
  compactNumbers,
  toIsoDate,
  daysLeft,
  expiryLevel,
  BON_LIFETIME_DAYS,
} from './bonsTransfert';

describe('normalizeClient', () => {
  it('mappe les variantes Petro', () => {
    expect(normalizeClient('PETROIVOIRE')).toBe('PETROIVOIRE');
    expect(normalizeClient('Petro Ivoire')).toBe('PETROIVOIRE');
    expect(normalizeClient('petroivoire ci')).toBe('PETROIVOIRE');
  });

  it('mappe Vivo', () => {
    expect(normalizeClient('VIVO ENERGY CI')).toBe('VIVO');
    expect(normalizeClient('vivo energies')).toBe('VIVO');
  });

  it('mappe Total', () => {
    expect(normalizeClient('TOTAL ENERGIES')).toBe('TOTAL');
  });

  it('mappe SIMAM', () => {
    expect(normalizeClient('SIMAM CI')).toBe('SIMAM');
  });

  it('null pour input vide ou inconnu', () => {
    expect(normalizeClient(null)).toBeNull();
    expect(normalizeClient(undefined)).toBeNull();
    expect(normalizeClient('')).toBeNull();
    expect(normalizeClient('XYZ')).toBeNull();
  });
});

describe('parseExcelDate', () => {
  it('Excel serial number -> Date (base 1899-12-30)', () => {
    // 1 = 1899-12-31, 2 = 1900-01-01
    const d = parseExcelDate(45000); // = 2023-03-15
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2023);
    expect(d!.getMonth()).toBe(2); // mars
  });

  it('string format DD/MM/YYYY', () => {
    const d = parseExcelDate('15/03/2024');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
  });

  it('string format DD-MM-YY (year < 100 -> 2000+)', () => {
    const d = parseExcelDate('15-03-24');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
  });

  it('Date object pass-through', () => {
    const original = new Date(2024, 5, 15);
    const d = parseExcelDate(original);
    expect(d).toBe(original);
  });

  it('null/undefined -> null', () => {
    expect(parseExcelDate(null)).toBeNull();
    expect(parseExcelDate(undefined)).toBeNull();
    expect(parseExcelDate('')).toBeNull();
  });

  // Note : le format ISO (YYYY-MM-DD) n'est pas supporte par parseExcelDate.
  // Le split sur "-" interprete "2024-06-15" comme day=2024, month=5, year=15.
  // Les exports Excel utilisent DD/MM/YYYY ou serial number, pas ISO.
});

describe('generateRange', () => {
  it('plage simple avec padding', () => {
    expect(generateRange('0007493', '0007495')).toEqual(['0007493', '0007494', '0007495']);
  });

  it('plage sans padding', () => {
    expect(generateRange('100', '102')).toEqual(['100', '101', '102']);
  });

  it('padding du plus long applique sur tout', () => {
    expect(generateRange('100', '1050')).toEqual(
      Array.from({ length: 951 }, (_, i) => String(100 + i).padStart(4, '0')),
    );
  });

  it('numero unique -> tableau a 1 element', () => {
    expect(generateRange('500', '500')).toEqual(['500']);
  });

  it('start > end -> throw', () => {
    expect(() => generateRange('200', '100')).toThrow();
  });

  it('non-numerique -> throw', () => {
    expect(() => generateRange('ABC', '200')).toThrow();
  });
});

describe('compactNumbers', () => {
  it('compresse plages consecutives', () => {
    const r = compactNumbers(['0007490', '0007491', '0007492', '0007500', '0007501']);
    expect(r).toEqual([
      { from: '0007490', to: '0007492', count: 3 },
      { from: '0007500', to: '0007501', count: 2 },
    ]);
  });

  it('numeros isoles -> plages de 1', () => {
    const r = compactNumbers(['100', '200', '300']);
    expect(r).toEqual([
      { from: '100', to: '100', count: 1 },
      { from: '200', to: '200', count: 1 },
      { from: '300', to: '300', count: 1 },
    ]);
  });

  it('input non trie -> resultat trie', () => {
    const r = compactNumbers(['0007500', '0007490', '0007491']);
    expect(r[0].from).toBe('0007490');
    expect(r[0].to).toBe('0007491');
    expect(r[1].from).toBe('0007500');
  });

  it('tableau vide -> tableau vide', () => {
    expect(compactNumbers([])).toEqual([]);
  });
});

describe('toIsoDate', () => {
  it('format YYYY-MM-DD avec padding zero', () => {
    expect(toIsoDate(new Date(2024, 2, 5))).toBe('2024-03-05');
    expect(toIsoDate(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});

describe('daysLeft / expiryLevel', () => {
  it('null si date manquante', () => {
    expect(daysLeft(null)).toBeNull();
    expect(daysLeft(undefined)).toBeNull();
    expect(daysLeft('')).toBeNull();
  });

  it('null si date invalide', () => {
    expect(daysLeft('not-a-date')).toBeNull();
  });

  it("bon edite aujourd'hui -> 30 jours restants", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const iso = toIsoDate(today);
    expect(daysLeft(iso)).toBe(BON_LIFETIME_DAYS);
  });

  it('bon edite il y a 35 jours -> negatif', () => {
    const d = new Date();
    d.setDate(d.getDate() - 35);
    d.setHours(0, 0, 0, 0);
    const iso = toIsoDate(d);
    expect(daysLeft(iso)).toBeLessThan(0);
  });

  it('expiryLevel : negatif -> expired', () => {
    expect(expiryLevel(-1)).toBe('expired');
    expect(expiryLevel(0)).toBe('expired');
  });

  it('expiryLevel : 1-3 -> danger', () => {
    expect(expiryLevel(1)).toBe('danger');
    expect(expiryLevel(3)).toBe('danger');
  });

  it('expiryLevel : 4-7 -> warning', () => {
    expect(expiryLevel(4)).toBe('warning');
    expect(expiryLevel(7)).toBe('warning');
  });

  it('expiryLevel : > 7 -> ok', () => {
    expect(expiryLevel(15)).toBe('ok');
    expect(expiryLevel(BON_LIFETIME_DAYS)).toBe('ok');
  });

  it('expiryLevel : null -> ok', () => {
    expect(expiryLevel(null)).toBe('ok');
  });
});
