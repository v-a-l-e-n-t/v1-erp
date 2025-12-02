export interface BilanEntry {
  id: string;
  user_id: string | null;
  date: string;
  
  // Stock initial (en kilogrammes - kg)
  spheres_initial: number;
  bouteilles_initial: number;
  reservoirs_initial: number;
  stock_initial: number;
  
  // Réceptions (en kilogrammes - kg)
  receptions: Array<{
    quantity: number; // en kg
    navire: string; // ex: "Pompage N°02_PETROCI"
    reception_no: string; // ex: "RECEPTION 54"
  }>;
  reception_gpl: number; // Total des réceptions en kg
  
  // Sorties (en kilogrammes - kg)
  // Sorties vrac détaillées par client
  sorties_vrac_simam: number;
  sorties_vrac_petro_ivoire: number;
  sorties_vrac_vivo_energies: number;
  sorties_vrac_total_energies: number;
  sorties_vrac: number; // Total calculé
  
  // Sorties conditionnées détaillées par client
  sorties_conditionnees_petro_ivoire: number;
  sorties_conditionnees_vivo_energies: number;
  sorties_conditionnees_total_energies: number;
  sorties_conditionnees: number; // Total calculé
  
  // Fuyardes détaillées par client
  fuyardes_petro_ivoire: number;
  fuyardes_vivo_energies: number;
  fuyardes_total_energies: number;
  fuyardes: number; // Total calculé
  
  cumul_sorties: number;
  
  // Stock final (en kilogrammes - kg)
  spheres_final: number;
  bouteilles_final: number;
  reservoirs_final: number;
  stock_final: number;
  
  // Calculs (en kilogrammes - kg)
  stock_theorique: number;
  bilan: number; // Différence en kg
  nature: 'Positif' | 'Négatif' | 'Neutre';
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface BilanFormData {
  date: string;
  spheres_initial: string;
  bouteilles_initial: string;
  reservoirs_initial: string;
  receptions: Array<{
    quantity: string;
    navire: string;
    reception_no: string;
  }>;
  // Sorties vrac
  sorties_vrac_simam: string;
  sorties_vrac_petro_ivoire: string;
  sorties_vrac_vivo_energies: string;
  sorties_vrac_total_energies: string;
  // Sorties conditionnées
  sorties_conditionnees_petro_ivoire: string;
  sorties_conditionnees_vivo_energies: string;
  sorties_conditionnees_total_energies: string;
  // Fuyardes
  fuyardes_petro_ivoire: string;
  fuyardes_vivo_energies: string;
  fuyardes_total_energies: string;
  spheres_final: string;
  bouteilles_final: string;
  reservoirs_final: string;
  notes: string;
}
