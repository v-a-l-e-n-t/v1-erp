// =============================================
// STOCK MODULE - TypeScript Types
// =============================================

// Enums matching database
export type WarehouseType = 
  | 'bouteilles_neuves'
  | 'consignes'
  | 'stock_outils'
  | 'bouteilles_hs'
  | 'reconfiguration'
  | 'sigma';

export type StockClientType = 
  | 'petro_ivoire'
  | 'total_energies'
  | 'vivo_energy';

export type BottleType = 'B6' | 'B12';

export type MovementType = 'entree' | 'sortie' | 'inventaire';

export type BottleOrigin = 'fabrique' | 'requalifie';

// Labels for display
export const WAREHOUSE_LABELS: Record<WarehouseType, string> = {
  bouteilles_neuves: 'Bouteilles Neuves - CE',
  consignes: 'Consignes - CE',
  stock_outils: 'Stock Outils - CE',
  bouteilles_hs: 'Bouteilles HS - DV',
  reconfiguration: 'Reconfiguration - DV',
  sigma: 'SIGMA',
};

export const CLIENT_LABELS: Record<StockClientType, string> = {
  petro_ivoire: 'Petro Ivoire',
  total_energies: 'TOTAL Energies',
  vivo_energy: 'VIVO Energy',
};

export const CLIENT_SHORT_LABELS: Record<StockClientType, string> = {
  petro_ivoire: 'PI',
  total_energies: 'TOTAL',
  vivo_energy: 'VIVO',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  inventaire: 'Inventaire',
};

export const BOTTLE_ORIGIN_LABELS: Record<BottleOrigin, string> = {
  fabrique: 'Fabriqué',
  requalifie: 'Requalifié',
};

// Warehouses list (excluding SIGMA for inter-warehouse transfers)
export const INTER_WAREHOUSE_LIST: WarehouseType[] = [
  'bouteilles_neuves',
  'consignes',
  'stock_outils',
  'bouteilles_hs',
  'reconfiguration',
];

export const ALL_WAREHOUSES: WarehouseType[] = [
  ...INTER_WAREHOUSE_LIST,
  'sigma',
];

export const ALL_CLIENTS: StockClientType[] = [
  'petro_ivoire',
  'total_energies',
  'vivo_energy',
];

export const ALL_BOTTLE_TYPES: BottleType[] = ['B6', 'B12'];

// Database row types
export interface SigmaStock {
  id: string;
  client: StockClientType;
  bottle_type: BottleType;
  current_stock: number;
  alert_threshold: number | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  warehouse: WarehouseType;
  client: StockClientType;
  movement_type: MovementType;
  movement_date: string;
  bon_number: string | null;
  origin: BottleOrigin | null;
  quantity_b6: number;
  quantity_b12: number;
  destination_warehouse: WarehouseType | null;
  source_warehouse: WarehouseType | null;
  linked_movement_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface StockInventory {
  id: string;
  warehouse: WarehouseType;
  client: StockClientType;
  inventory_date: string;
  quantity_b6: number;
  quantity_b12: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

// Form types
export interface StockMovementFormData {
  movement_type: MovementType;
  movement_date: string;
  bon_number?: string;
  origin?: BottleOrigin;
  quantity_b6: number;
  quantity_b12: number;
  destination_warehouse?: WarehouseType;
  notes?: string;
}

export interface SigmaStockFormData {
  client: StockClientType;
  bottle_type: BottleType;
  quantity: number;
}

// API response types
export interface CreateMovementResult {
  success: boolean;
  error?: string;
  details?: {
    required_b6?: number;
    required_b12?: number;
    available_b6?: number;
    available_b12?: number;
  };
  movement_id?: string;
  mirror_id?: string;
}

export interface DeleteMovementResult {
  success: boolean;
  error?: string;
  deleted_id?: string;
  deleted_linked_id?: string;
}

export interface CanReduceSigmaResult {
  can_reduce: boolean;
  error?: string;
  total_used?: number;
  requested?: number;
}

// Theoretical stock
export interface TheoreticalStock {
  warehouse: WarehouseType;
  client: StockClientType;
  b6: number;
  b12: number;
}

// Stock status for indicators
export type StockStatus = 'ok' | 'low' | 'empty';

export function getStockStatus(current: number, threshold: number): StockStatus {
  if (current <= 0) return 'empty';
  if (current <= threshold) return 'low';
  return 'ok';
}

export const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  ok: 'bg-green-500',
  low: 'bg-orange-500',
  empty: 'bg-red-500',
};

export const STOCK_STATUS_TEXT_COLORS: Record<StockStatus, string> = {
  ok: 'text-green-600',
  low: 'text-orange-600',
  empty: 'text-red-600',
};

// Client colors (PI = blue-violet, TOTAL = red, VIVO = green)
export const CLIENT_COLORS: Record<StockClientType, { bg: string; border: string; text: string }> = {
  petro_ivoire: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-400',
    text: 'text-indigo-700',
  },
  total_energies: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
  },
  vivo_energy: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-700',
  },
};
