export type AtelierClientKey = 'SIMAM' | 'PETRO_IVOIRE' | 'VIVO_ENERGY' | 'TOTAL_ENERGIES';

export type AtelierCategory =
  | 'bouteilles_vidangees'
  | 'bouteilles_reeprouvees'
  | 'bouteilles_hs'
  | 'clapet_monte';

export type AtelierFormat = 'B6' | 'B12' | 'B28' | 'B38';

export type AtelierQuantities = Record<AtelierFormat, number>;

export type AtelierClientData = Record<AtelierCategory, AtelierQuantities>;

export interface AtelierData {
  SIMAM: AtelierClientData;
  PETRO_IVOIRE: AtelierClientData;
  VIVO_ENERGY: AtelierClientData;
  TOTAL_ENERGIES: AtelierClientData;
}

export interface AtelierEntry {
  id?: string;
  date: string;
  shift_type: import('./production').ShiftType;
  chef_quart_id: string;
  data: AtelierData;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const ATELIER_CLIENT_LABELS: Record<AtelierClientKey, string> = {
  SIMAM: 'SIMAM CI',
  PETRO_IVOIRE: 'PETRO IVOIRE',
  VIVO_ENERGY: 'VIVO ENERGY',
  TOTAL_ENERGIES: 'TOTAL ENERGIES',
};

export const ATELIER_CATEGORY_LABELS: Record<AtelierCategory, string> = {
  bouteilles_vidangees: 'Bouteilles vidangées',
  bouteilles_reeprouvees: 'Bouteilles rééprouvées',
  bouteilles_hs: 'Bouteilles HS',
  clapet_monte: 'Clapet monté',
};


