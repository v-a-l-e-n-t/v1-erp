import { describe, it, expect } from 'vitest';
import { calculateBilanBke } from './calculations-bke';
import type { BilanBkeFormData } from '@/types/balance-bke';

const emptyForm = (overrides: Partial<BilanBkeFormData> = {}): BilanBkeFormData => ({
  date: '2026-05-23',
  bac_stockage_initial: '',
  bouteilles_initial: '',
  receptions: [],
  sorties_conditionnees_petro_ivoire: '',
  sorties_conditionnees_vivo_energies: '',
  sorties_conditionnees_total_energies: '',
  fuyardes_petro_ivoire: '',
  fuyardes_vivo_energies: '',
  fuyardes_total_energies: '',
  bac_stockage_final: '',
  bouteilles_final: '',
  notes: '',
  ...overrides,
});

describe('calculateBilanBke', () => {
  it('zero partout -> Neutre', () => {
    const r = calculateBilanBke(emptyForm());
    expect(r.stock_initial).toBe(0);
    expect(r.reception_gpl).toBe(0);
    expect(r.cumul_sorties).toBe(0);
    expect(r.bilan).toBe(0);
    expect(r.nature).toBe('Neutre');
  });

  it('stock_initial = bac_stockage + bouteilles (pas de reservoirs a Bouake)', () => {
    const r = calculateBilanBke(
      emptyForm({
        bac_stockage_initial: '50000',
        bouteilles_initial: '12000',
      }),
    );
    expect(r.stock_initial).toBe(62_000);
  });

  it('cumul_sorties = conditionnees + fuyardes (pas de vrac a Bouake)', () => {
    const r = calculateBilanBke(
      emptyForm({
        sorties_conditionnees_petro_ivoire: '100',
        sorties_conditionnees_total_energies: '200',
        fuyardes_vivo_energies: '50',
      }),
    );
    expect(r.sorties_conditionnees).toBe(300);
    expect(r.fuyardes).toBe(50);
    expect(r.cumul_sorties).toBe(350);
  });

  it('reception multi-clients : conserve client + reception_no', () => {
    const r = calculateBilanBke(
      emptyForm({
        receptions: [
          { quantity: '10000', client: 'PETRO_IVOIRE', reception_no: 'R-001' },
          { quantity: '5000', client: 'TOTAL_ENERGIES', reception_no: 'R-002' },
        ],
      }),
    );
    expect(r.reception_gpl).toBe(15_000);
    expect(r.receptions[0].client).toBe('PETRO_IVOIRE');
    expect(r.receptions[1].reception_no).toBe('R-002');
  });

  it('bilan = stock_final - stock_theorique', () => {
    const r = calculateBilanBke(
      emptyForm({
        bac_stockage_initial: '10000',
        receptions: [{ quantity: '5000', client: 'PETRO_IVOIRE', reception_no: '' }],
        sorties_conditionnees_petro_ivoire: '3000',
        bac_stockage_final: '11500',
      }),
    );
    // stock_theorique = 10000 + 5000 - 3000 = 12000
    // bilan = 11500 - 12000 = -500
    expect(r.stock_theorique).toBe(12_000);
    expect(r.bilan).toBe(-500);
    expect(r.nature).toBe('Négatif');
  });
});
