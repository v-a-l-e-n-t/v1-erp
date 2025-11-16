export type ShiftType = '10h-19h' | '20h-5h';
export type LigneType = 'B6_L1' | 'B6_L2' | 'B6_L3' | 'B6_L4' | 'B12';
export type ArretType = 
  | 'maintenance_corrective'
  | 'manque_personnel'
  | 'probleme_approvisionnement'
  | 'panne_ligne'
  | 'autre';
export type EtapeLigne = 
  | 'BASCULES'
  | 'PURGE'
  | 'CONTROLE'
  | 'ETANCHEITE'
  | 'CAPSULAGE'
  | 'VIDANGE'
  | 'PALETTISEUR'
  | 'TRI'
  | 'AUTRE';

export interface ChefLigne {
  id: string;
  nom: string;
  prenom: string;
}

export interface ChefQuart {
  id: string;
  nom: string;
  prenom: string;
}

export interface ProductionShift {
  id?: string;
  date: string;
  shift_type: ShiftType;
  chef_quart_id: string;
  heure_debut_theorique: string;
  heure_fin_theorique: string;
  heure_debut_reelle: string;
  heure_fin_reelle: string;
  bouteilles_produites: number;
  tonnage_total?: number;
  cumul_recharges_total?: number;
  cumul_consignes_total?: number;
  temps_arret_total_minutes?: number;
  user_id?: string;
}

export interface LigneProduction {
  id?: string;
  shift_id?: string;
  numero_ligne: number;
  chef_ligne_id: string;
  nombre_agents: number;
  recharges_petro_b6: number;
  recharges_petro_b12: number;
  recharges_total_b6: number;
  recharges_total_b12: number;
  recharges_vivo_b6: number;
  recharges_vivo_b12: number;
  consignes_petro_b6: number;
  consignes_petro_b12: number;
  consignes_total_b6: number;
  consignes_total_b12: number;
  consignes_vivo_b6: number;
  consignes_vivo_b12: number;
  cumul_recharges_b6?: number;
  cumul_recharges_b12?: number;
  cumul_consignes_b6?: number;
  cumul_consignes_b12?: number;
  tonnage_ligne?: number;
  arrets?: ArretProduction[];
}

export interface ArretProduction {
  id?: string;
  shift_id?: string;
  lignes_concernees?: number[];
  heure_debut: string;
  heure_fin: string;
  type_arret: ArretType;
  ordre_intervention?: string;
  etape_ligne?: EtapeLigne;
  description?: string;
  action_corrective?: string;
}

export const SHIFT_HOURS = {
  '10h-19h': { debut: '10:00', fin: '19:00' },
  '20h-5h': { debut: '20:00', fin: '05:00' }
} as const;

export const ARRET_LABELS: Record<ArretType, string> = {
  maintenance_corrective: 'Maintenance corrective',
  manque_personnel: 'Manque de personnel',
  probleme_approvisionnement: 'Problème approvisionnement produit',
  panne_ligne: 'Pannes sur la ligne',
  autre: 'Autre'
};

export const ETAPE_LABELS: Record<EtapeLigne, string> = {
  BASCULES: 'Bascules',
  PURGE: 'Purge',
  CONTROLE: 'Contrôle',
  ETANCHEITE: 'Étanchéité',
  CAPSULAGE: 'Capsulage',
  VIDANGE: 'Vidange',
  PALETTISEUR: 'Palettiseur',
  TRI: 'Tri',
  AUTRE: 'Autre'
};

export const LIGNE_LABELS: Record<LigneType, string> = {
  B6_L1: 'B6 - Ligne 1',
  B6_L2: 'B6 - Ligne 2',
  B6_L3: 'B6 - Ligne 3',
  B6_L4: 'B6 - Ligne 4',
  B12: 'B12'
};
