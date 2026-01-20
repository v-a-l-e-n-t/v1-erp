// Catégories de bouteilles (magasins)
export type StockCategory =
  | 'bouteilles_neuves'      // Btles Neuve
  | 'consignes'              // Consignes
  | 'stock_outils'           // Stock Outils
  | 'bouteilles_hs'          // Btles HS
  | 'reconfiguration'        // Reconfiguration
  | 'sigma'                  // SIGMA - Magasin d'approvisionnement
  | 'parc_ce';               // PARC BOUTEILLES CE (caché)

// Liste des magasins pour dropdown destination/provenance (ordre spécifique)
export const WAREHOUSE_LIST: StockCategory[] = [
  'bouteilles_neuves',
  'consignes',
  'stock_outils',
  'bouteilles_hs',
  'reconfiguration',
  'sigma'
];

// Liste des magasins pour mouvements inter-magasins automatiques (miroir)
// SIGMA est exclu car c'est un magasin d'approvisionnement géré séparément
export const INTER_WAREHOUSE_LIST: StockCategory[] = [
  'bouteilles_neuves',
  'consignes',
  'stock_outils',
  'bouteilles_hs',
  'reconfiguration'
];

// Origine des bouteilles
export type BottleOrigin = 'fabrique' | 'requalifie';

export const BOTTLE_ORIGIN_LABELS: Record<BottleOrigin, string> = {
  fabrique: 'Fabriqué',
  requalifie: 'Requalifié'
};

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
  bottle_origin?: BottleOrigin; // Origine: Fabriqué ou Requalifié
  motif?: string; // Motif de sortie
  provenance?: string; // Provenance pour entrée (texte libre ou magasin)
  destination?: string; // Destination pour sortie (texte libre ou magasin)
  source_warehouse?: StockCategory; // Magasin source (pour mouvements inter-magasins)
  destination_warehouse?: StockCategory; // Magasin destination (pour mouvements inter-magasins)
  linked_movement_id?: string; // ID du mouvement lié (entrée ↔ sortie inter-magasins)
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
  bouteilles_neuves: 'Bouteilles Neuves - CE',
  consignes: 'Consignes - CE',
  stock_outils: 'Stock Outils - CE',
  bouteilles_hs: 'Bouteilles HS - DV',
  reconfiguration: 'Reconfiguration - DV',
  sigma: 'SIGMA',
  parc_ce: 'Parc CE'
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

// Stock SIGMA configurable par client (simplifié: client + type bouteille)
export interface SigmaStock {
  id: string;
  client: StockClient;
  bottle_type: BottleType;
  initial_stock: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
}

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
  bottle_origin?: BottleOrigin; // Origine: Fabriqué ou Requalifié
  motif?: string;
  provenance?: string;
  destination?: string;
  source_warehouse?: StockCategory; // Magasin source
  destination_warehouse?: StockCategory; // Magasin destination
  justification_ecart?: string;
  stock_theorique?: string; // String pour le formulaire
  stock_reel?: string; // String pour le formulaire
}
