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
    provenance: string;
  }>;
  reception_gpl: number; // Total des réceptions en kg
  
  // Sorties (en kilogrammes - kg)
  sorties_vrac: number;
  sorties_conditionnees: number;
  fuyardes: number;
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
    provenance: string;
  }>;
  sorties_vrac: string;
  sorties_conditionnees: string;
  fuyardes: string;
  spheres_final: string;
  bouteilles_final: string;
  reservoirs_final: string;
  notes: string;
}
