// =============================================
// STOCK MODULE - Supabase Client Functions
// =============================================

import { supabase } from '@/integrations/supabase/client';
import type {
  WarehouseType,
  StockClientType,
  BottleType,
  MovementType,
  BottleOrigin,
  DepotLubStock,
  SigmaStock,
  StockMovement,
  StockInventory,
  CreateMovementResult,
  DeleteMovementResult,
  CanReduceDepotLubResult,
  TheoreticalStock,
} from '@/types/stock';

// =============================================
// DEPOT LUB STOCK OPERATIONS
// =============================================

export async function getDepotLubStocks(): Promise<DepotLubStock[]> {
  const { data, error } = await supabase
    .from('depot_lub_stock')
    .select('*')
    .order('client')
    .order('bottle_type');

  if (error) throw error;
  return (data || []) as DepotLubStock[];
}

// Alias for backward compatibility
export const getSigmaStocks = getDepotLubStocks;

export async function getDepotLubStock(
  client: StockClientType,
  bottleType: BottleType
): Promise<number> {
  const { data, error } = await supabase
    .from('depot_lub_stock')
    .select('current_stock')
    .eq('client', client)
    .eq('bottle_type', bottleType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.current_stock ?? 0;
}

// Alias for backward compatibility
export const getSigmaStock = getDepotLubStock;

export async function updateDepotLubStock(
  client: StockClientType,
  bottleType: BottleType,
  quantity: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('depot_lub_stock')
    .select('id')
    .eq('client', client)
    .eq('bottle_type', bottleType)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('depot_lub_stock')
      .update({ current_stock: quantity, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('depot_lub_stock')
      .insert({
        client,
        bottle_type: bottleType,
        current_stock: quantity,
      });
    if (error) throw error;
  }
}

// Alias for backward compatibility
export const updateSigmaStock = updateDepotLubStock;

export async function canReduceDepotLubStock(
  client: StockClientType,
  bottleType: BottleType,
  newQuantity: number
): Promise<CanReduceDepotLubResult> {
  const { data, error } = await supabase.rpc('can_reduce_depot_lub_stock', {
    p_client: client,
    p_bottle_type: bottleType,
    p_new_quantity: newQuantity,
  });

  if (error) throw error;
  return data as unknown as CanReduceDepotLubResult;
}

// Alias for backward compatibility
export const canReduceSigmaStock = canReduceDepotLubStock;

// =============================================
// STOCK MOVEMENTS OPERATIONS
// =============================================

export async function getStockMovements(
  warehouse: WarehouseType,
  client: StockClientType,
  month?: Date,
  limit: number = 50,
  offset: number = 0
): Promise<{ movements: StockMovement[]; totalCount: number }> {
  const { data, error } = await supabase.rpc('get_stock_movements_paginated', {
    p_warehouse: warehouse,
    p_client: client,
    p_filter_type: month ? 'month' : 'all',
    p_month: month ? month.toISOString().split('T')[0] : null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const movements = (data || []) as (StockMovement & { total_count: number })[];
  const totalCount = movements.length > 0 ? Number(movements[0].total_count) : 0;

  return {
    movements: movements.map(({ total_count, ...m }) => m as StockMovement),
    totalCount,
  };
}

export async function createStockMovement(
  warehouse: WarehouseType,
  client: StockClientType,
  movementType: MovementType,
  movementDate: Date,
  quantityB6: number,
  quantityB12: number,
  bonNumber?: string,
  origin?: BottleOrigin,
  destinationWarehouse?: WarehouseType,
  sourceWarehouse?: WarehouseType,
  notes?: string
): Promise<CreateMovementResult> {
  const { data, error } = await supabase.rpc('create_stock_movement', {
    p_warehouse: warehouse,
    p_client: client,
    p_movement_type: movementType,
    p_movement_date: movementDate.toISOString().split('T')[0],
    p_quantity_b6: quantityB6,
    p_quantity_b12: quantityB12,
    p_bon_number: bonNumber || null,
    p_origin: origin || null,
    p_destination_warehouse: destinationWarehouse || null,
    p_source_warehouse: sourceWarehouse || null,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data as unknown as CreateMovementResult;
}

export async function updateStockMovement(
  movementId: string,
  movementDate: Date,
  quantityB6: number,
  quantityB12: number,
  bonNumber?: string,
  origin?: BottleOrigin,
  notes?: string
): Promise<CreateMovementResult> {
  const { data, error } = await supabase.rpc('update_stock_movement', {
    p_movement_id: movementId,
    p_movement_date: movementDate.toISOString().split('T')[0],
    p_quantity_b6: quantityB6,
    p_quantity_b12: quantityB12,
    p_bon_number: bonNumber || null,
    p_origin: origin || null,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data as unknown as CreateMovementResult;
}

export async function deleteStockMovement(
  movementId: string
): Promise<DeleteMovementResult> {
  const { data, error } = await supabase.rpc('delete_stock_movement', {
    p_movement_id: movementId,
  });

  if (error) throw error;
  return data as unknown as DeleteMovementResult;
}

// =============================================
// INVENTORY OPERATIONS
// =============================================

export async function createInventory(
  warehouse: WarehouseType,
  client: StockClientType,
  inventoryDate: Date,
  quantityB6: number,
  quantityB12: number,
  notes?: string
): Promise<StockInventory> {
  const { data, error } = await supabase
    .from('stock_inventories')
    .insert({
      warehouse,
      client,
      inventory_date: inventoryDate.toISOString().split('T')[0],
      quantity_b6: quantityB6,
      quantity_b12: quantityB12,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StockInventory;
}

export async function getLastInventory(
  warehouse: WarehouseType,
  client: StockClientType
): Promise<StockInventory | null> {
  const { data, error } = await supabase
    .from('stock_inventories')
    .select('*')
    .eq('warehouse', warehouse)
    .eq('client', client)
    .order('inventory_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as StockInventory | null;
}

// =============================================
// THEORETICAL STOCK CALCULATION
// =============================================

export async function getTheoreticalStock(
  warehouse: WarehouseType,
  client: StockClientType
): Promise<TheoreticalStock> {
  const { data: b6Data, error: b6Error } = await supabase.rpc(
    'calculate_theoretical_stock',
    {
      p_warehouse: warehouse,
      p_client: client,
      p_bottle_type: 'B6',
    }
  );

  if (b6Error) throw b6Error;

  const { data: b12Data, error: b12Error } = await supabase.rpc(
    'calculate_theoretical_stock',
    {
      p_warehouse: warehouse,
      p_client: client,
      p_bottle_type: 'B12',
    }
  );

  if (b12Error) throw b12Error;

  return {
    warehouse,
    client,
    b6: (b6Data as number) ?? 0,
    b12: (b12Data as number) ?? 0,
  };
}

export async function getAllTheoreticalStocks(
  warehouse: WarehouseType
): Promise<TheoreticalStock[]> {
  const clients: StockClientType[] = ['petro_ivoire', 'total_energies', 'vivo_energy'];
  const results: TheoreticalStock[] = [];

  for (const client of clients) {
    const stock = await getTheoreticalStock(warehouse, client);
    results.push(stock);
  }

  return results;
}

// =============================================
// DEPOT LUB DASHBOARD DATA
// =============================================

export interface DepotLubDashboardData {
  stocks: DepotLubStock[];
  totalB6: number;
  totalB12: number;
}

// Alias for backward compatibility
export type SigmaDashboardData = DepotLubDashboardData;

export async function getDepotLubDashboardData(): Promise<DepotLubDashboardData> {
  const stocks = await getDepotLubStocks();
  
  const totalB6 = stocks
    .filter((s) => s.bottle_type === 'B6')
    .reduce((sum, s) => sum + s.current_stock, 0);
  
  const totalB12 = stocks
    .filter((s) => s.bottle_type === 'B12')
    .reduce((sum, s) => sum + s.current_stock, 0);

  return { stocks, totalB6, totalB12 };
}

// Alias for backward compatibility
export const getSigmaDashboardData = getDepotLubDashboardData;
