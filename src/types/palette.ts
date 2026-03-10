export type PaletteClientKey = 'PETRO_IVOIRE' | 'TOTAL_ENERGIES' | 'VIVO_ENERGY';

export interface PaletteEntry {
  id?: string;
  date: string;
  client: PaletteClientKey;
  mandataire_id: string;
  capacite: string;
  num_camion: string;
  // Bouteilles
  b6: number;
  b12: number;
  b28: number;
  b38: number;
  // Palettes
  palette_b6_normale: number;
  palette_b6_courte: number;
  palette_b12_ordinaire: number;
  palette_b12_superpo: number;
  created_at?: string;
}

export const PALETTE_CLIENT_LABELS: Record<PaletteClientKey, string> = {
  PETRO_IVOIRE: 'PI',
  TOTAL_ENERGIES: 'TOTAL',
  VIVO_ENERGY: 'VIVO',
};

export const PALETTE_CLIENT_FULL_LABELS: Record<PaletteClientKey, string> = {
  PETRO_IVOIRE: 'PETRO IVOIRE',
  TOTAL_ENERGIES: 'TOTAL ENERGIES',
  VIVO_ENERGY: 'VIVO ENERGY',
};
