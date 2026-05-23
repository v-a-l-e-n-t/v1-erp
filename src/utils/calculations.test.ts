import { describe, it, expect } from 'vitest';
import {
  calculateBilan,
  formatNumber,
  formatNumberValue,
  getNatureColor,
  getNatureBadgeVariant,
  getWorkingDaysInMonth,
  getWorkingDaysPassed,
} from './calculations';
import type { BilanFormData } from '@/types/balance';

const emptyForm = (overrides: Partial<BilanFormData> = {}): BilanFormData => ({
  date: '2026-05-23',
  spheres_initial: '',
  bouteilles_initial: '',
  reservoirs_initial: '',
  receptions: [],
  sorties_vrac_simam: '',
  sorties_vrac_petro_ivoire: '',
  sorties_vrac_vivo_energies: '',
  sorties_vrac_total_energies: '',
  sorties_conditionnees_petro_ivoire: '',
  sorties_conditionnees_vivo_energies: '',
  sorties_conditionnees_total_energies: '',
  fuyardes_petro_ivoire: '',
  fuyardes_vivo_energies: '',
  fuyardes_total_energies: '',
  spheres_final: '',
  bouteilles_final: '',
  reservoirs_final: '',
  agent_exploitation_matin: '',
  agent_exploitation_soir: '',
  agent_mouvement_matin: '',
  agent_mouvement_soir: '',
  notes: '',
  ...overrides,
});

describe('calculateBilan', () => {
  it('agrege a zero quand tout est vide', () => {
    const r = calculateBilan(emptyForm());
    expect(r.stock_initial).toBe(0);
    expect(r.reception_gpl).toBe(0);
    expect(r.cumul_sorties).toBe(0);
    expect(r.stock_final).toBe(0);
    expect(r.stock_theorique).toBe(0);
    expect(r.bilan).toBe(0);
    expect(r.nature).toBe('Neutre');
  });

  it('calcule stock_initial = spheres + bouteilles + reservoirs', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '1000000',
        bouteilles_initial: '250000',
        reservoirs_initial: '50000',
      }),
    );
    expect(r.stock_initial).toBe(1_300_000);
  });

  it('somme les receptions a partir du tableau', () => {
    const r = calculateBilan(
      emptyForm({
        receptions: [
          { quantity: '500000', navire: 'N1', reception_no: 'R1' },
          { quantity: '300000', navire: 'N2', reception_no: 'R2' },
        ],
      }),
    );
    expect(r.reception_gpl).toBe(800_000);
    expect(r.receptions).toHaveLength(2);
    expect(r.receptions[0].navire).toBe('N1');
  });

  it('agrege sorties vrac sur les 4 clients', () => {
    const r = calculateBilan(
      emptyForm({
        sorties_vrac_simam: '100',
        sorties_vrac_petro_ivoire: '200',
        sorties_vrac_vivo_energies: '50',
        sorties_vrac_total_energies: '150',
      }),
    );
    expect(r.sorties_vrac).toBe(500);
  });

  it('cumul_sorties = vrac + conditionnees + fuyardes', () => {
    const r = calculateBilan(
      emptyForm({
        sorties_vrac_simam: '100',
        sorties_conditionnees_petro_ivoire: '200',
        fuyardes_total_energies: '50',
      }),
    );
    expect(r.cumul_sorties).toBe(350);
  });

  it('stock_theorique = initial + reception - cumul_sorties', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '1000000',
        receptions: [{ quantity: '500000', navire: '', reception_no: '' }],
        sorties_vrac_simam: '300000',
      }),
    );
    // 1_000_000 + 500_000 - 300_000 = 1_200_000
    expect(r.stock_theorique).toBe(1_200_000);
  });

  it('bilan Positif quand stock_final > stock_theorique', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '1000',
        spheres_final: '1200',
      }),
    );
    expect(r.bilan).toBe(200);
    expect(r.nature).toBe('Positif');
  });

  it('bilan Negatif quand stock_final < stock_theorique', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '1000',
        spheres_final: '800',
      }),
    );
    expect(r.bilan).toBe(-200);
    expect(r.nature).toBe('Negatif'.replace('Negatif', 'Négatif'));
  });

  it('precision Decimal.js : 0.1 + 0.2 reste exact', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '0.1',
        bouteilles_initial: '0.2',
      }),
    );
    // En JS natif, 0.1 + 0.2 = 0.30000000000000004
    // Decimal.js doit converger vers 0.3 exact
    expect(r.stock_initial).toBe(0.3);
  });

  it('precision sur grands nombres (millions de kg)', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '12345678.123',
        bouteilles_initial: '9876543.877',
      }),
    );
    expect(r.stock_initial).toBe(22_222_222);
  });

  it('traite valeurs vides comme 0 (pas NaN)', () => {
    const r = calculateBilan(
      emptyForm({
        spheres_initial: '',
        bouteilles_initial: '5',
        reservoirs_initial: undefined as unknown as string,
      }),
    );
    expect(r.stock_initial).toBe(5);
    expect(Number.isNaN(r.stock_initial)).toBe(false);
  });
});

describe('formatNumber / formatNumberValue', () => {
  it('separe les milliers par espace insecable visuel', () => {
    expect(formatNumber(1234567)).toBe('1 234 567');
  });

  it('cache les decimales nulles', () => {
    expect(formatNumber(1000)).toBe('1 000');
  });

  it('garde les decimales significatives avec virgule', () => {
    expect(formatNumber(1234.5)).toBe('1 234,500');
  });

  it('formatNumberValue se comporte comme formatNumber', () => {
    expect(formatNumberValue(2500.75)).toBe('2 500,750');
  });
});

describe('getNatureColor / getNatureBadgeVariant', () => {
  it('Positif -> success', () => {
    expect(getNatureColor('Positif')).toBe('text-success');
    expect(getNatureBadgeVariant('Positif')).toBe('success');
  });

  it('Negatif -> destructive', () => {
    expect(getNatureColor('Négatif')).toBe('text-destructive');
    expect(getNatureBadgeVariant('Négatif')).toBe('destructive');
  });

  it('autre -> muted/secondary', () => {
    expect(getNatureColor('Neutre')).toBe('text-muted-foreground');
    expect(getNatureBadgeVariant('Neutre')).toBe('secondary');
  });
});

describe('getWorkingDaysInMonth', () => {
  it('mai 2026 (31 jours, 4 dimanches : 3, 10, 17, 24, 31 = 5) -> 26 jours ouvres', () => {
    // mai 2026 : 1 mai = vendredi, 31 = dimanche
    // dimanches : 3, 10, 17, 24, 31 = 5
    // 31 - 5 = 26
    const days = getWorkingDaysInMonth(new Date(2026, 4, 15));
    expect(days).toBe(26);
  });

  it('fevrier 2026 (28 jours, dimanches 1, 8, 15, 22 = 4) -> 24', () => {
    const days = getWorkingDaysInMonth(new Date(2026, 1, 10));
    expect(days).toBe(24);
  });
});

describe('getWorkingDaysPassed', () => {
  it('mois futur -> 0', () => {
    const farFuture = new Date(2099, 0, 1);
    expect(getWorkingDaysPassed(farFuture)).toBe(0);
  });

  it('mois passe -> total des jours ouvres du mois', () => {
    const farPast = new Date(2000, 0, 1); // janvier 2000
    const total = getWorkingDaysInMonth(farPast);
    expect(getWorkingDaysPassed(farPast)).toBe(total);
  });
});
