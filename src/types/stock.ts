// Catégories de bouteilles
export type StockCategory =
  | 'bouteilles_neuves'      // Btles Neuve _ DV
  | 'bouteilles_hs'          // Btles HS _ DV
  | 'reconfiguration'        // RECONFIGURATION
  | 'consignes'              // Consigne _ CE
  | 'parc_ce'                // PARC BOUTEILLES CE (PI & TEMCI)
  | 'stock_outils_vivo'      // STOCK OUTILS VIVO
  | 'peinture';              // PEINTURE TDS

// Types de bouteilles
export type BottleType = 'B6' | 'B12' | 'B28' | 'B38';

// Sites
export type StockSite = 'depot_vrac' | 'centre_emplisseur';

// Types de mouvements (simplifié - sans transfert)
export type MovementType = 'entree' | 'sortie' | 'inventaire';

// Client (pour parc CE)
export type StockClient = 'PI' | 'VIVO' | 'TOTAL' | null;

// Entrée de mouvement de stock
export interface StockMovement {
  id: string;
  date: string;
  category: StockCategory;
  site: StockSite;
  movement_type: MovementType;
  bottle_type: BottleType;
  quantity: number; // Nombre de bouteilles
  client?: StockClient; // Pour parc CE
  bon_numero?: string; // Numéro du bon autorisant l'opération
  motif?: string; // Motif de sortie
  provenance?: string; // Provenance pour entrée
  destination?: string; // Destination pour sortie
  justification_ecart?: string; // Pour inventaire avec écart
  stock_theorique?: number; // Stock théorique avant mouvement
  stock_reel?: number; // Stock réel (pour inventaire)
  ecart?: number; // Écart = stock_reel - stock_theorique
  user_id?: string;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

// État de stock consolidé
export interface StockState {
  category: StockCategory;
  site: StockSite;
  bottle_type: BottleType;
  client?: StockClient;
  stock_initial: number;
  cumul_entrees: number;
  cumul_sorties: number;
  stock_theorique: number;
  stock_reel?: number; // Dernier inventaire
  ecart?: number;
  last_inventory_date?: string;
}

// Labels pour affichage
export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  bouteilles_neuves: 'Bouteilles Neuves',
  bouteilles_hs: 'Bouteilles HS',
  reconfiguration: 'Reconfiguration',
  consignes: 'Consignes',
  // parc_ce: 'Parc CE', // Removed as per request
  stock_outils_vivo: 'Stock Outils',
  peinture: 'Peinture',
  parc_ce: 'Parc CE' // Keeping key for safety but hidden from UI if needed, or remove if unused. User list omitted it.
};

export const STOCK_SITE_LABELS: Record<StockSite, string> = {
  depot_vrac: 'Dépôt Vrac',
  centre_emplisseur: 'Centre Emplisseur'
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  inventaire: 'Inventaire'
};

export const BOTTLE_TYPE_LABELS: Record<BottleType, string> = {
  B6: 'B6',
  B12: 'B12',
  B28: 'B28',
  B38: 'B38'
};

// Ordre: PI, TOTAL, VIVO
export const STOCK_CLIENT_ORDER: Exclude<StockClient, null>[] = ['PI', 'TOTAL', 'VIVO'];

export const STOCK_CLIENT_LABELS: Record<Exclude<StockClient, null>, string> = {
  PI: 'Petro Ivoire',
  TOTAL: 'Total Energies',
  VIVO: 'VIVO Energy'
};

// Form data pour la saisie
export interface StockMovementFormData {
  date: string;
  category: StockCategory;
  site: StockSite;
  movement_type: MovementType;
  bottle_type: BottleType;
  quantity: string; // String pour le formulaire
  client?: StockClient;
  bon_numero?: string; // Numéro du bon autorisant l'opération
  motif?: string;
  provenance?: string;
  destination?: string;
  justification_ecart?: string;
  stock_theorique?: string; // String pour le formulaire
  stock_reel?: string; // String pour le formulaire
}
