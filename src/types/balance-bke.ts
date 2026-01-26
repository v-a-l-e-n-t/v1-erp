// Types pour le Bilan Matière GPL - Site de Bouaké

export interface BilanBkeEntry {
  id: string;
  user_id: string | null;
  date: string;

  // Stock initial (en kilogrammes - kg)
  // Pas de sphères à Bouaké, on utilise "Bac stockage"
  bac_stockage_initial: number;
  bouteilles_initial: number;
  // Pas de réservoirs à Bouaké
  stock_initial: number;

  // Réceptions (en kilogrammes - kg)
  // À Bouaké, pas de navire mais un dropdown client
  receptions: Array<{
    quantity: number; // en kg
    client: string; // "PETRO IVOIRE" ou "TOTAL ENERGIES"
    reception_no: string; // ex: "RECEPTION 54"
  }>;
  reception_gpl: number; // Total des réceptions en kg

  // Sorties (en kilogrammes - kg)
  // PAS de sorties vrac à Bouaké

  // Sorties conditionnées détaillées par client
  sorties_conditionnees_petro_ivoire: number;
  sorties_conditionnees_vivo_energies: number;
  sorties_conditionnees_total_energies: number;
  sorties_conditionnees: number; // Total calculé

  // Retour marché détaillées par client
  fuyardes_petro_ivoire: number;
  fuyardes_vivo_energies: number;
  fuyardes_total_energies: number;
  fuyardes: number; // Total calculé

  cumul_sorties: number;

  // Stock final (en kilogrammes - kg)
  bac_stockage_final: number;
  bouteilles_final: number;
  // Pas de réservoirs à Bouaké
  stock_final: number;

  // Calculs (en kilogrammes - kg)
  stock_theorique: number;
  bilan: number; // Différence en kg
  nature: 'Positif' | 'Négatif' | 'Neutre';

  // Notes
  notes?: string;

  // PAS d'agents à Bouaké

  // Metadata
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

export interface BilanBkeFormData {
  date: string;
  bac_stockage_initial: string;
  bouteilles_initial: string;
  receptions: Array<{
    quantity: string;
    client: string;
    reception_no: string;
  }>;
  // PAS d'agents à Bouaké
  // Sorties conditionnées
  sorties_conditionnees_petro_ivoire: string;
  sorties_conditionnees_vivo_energies: string;
  sorties_conditionnees_total_energies: string;
  // Retour marché
  fuyardes_petro_ivoire: string;
  fuyardes_vivo_energies: string;
  fuyardes_total_energies: string;
  bac_stockage_final: string;
  bouteilles_final: string;
  notes: string;
}

// Liste des clients pour le dropdown de réception
export const BKE_RECEPTION_CLIENTS = [
  'PETRO IVOIRE',
  'TOTAL ENERGIES'
] as const;

export type BkeReceptionClient = typeof BKE_RECEPTION_CLIENTS[number];
