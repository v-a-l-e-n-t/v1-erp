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
  SigmaStock,
  StockMovement,
  StockInventory,
  CreateMovementResult,
  DeleteMovementResult,
  CanReduceSigmaResult,
  TheoreticalStock,
} from '@/types/stock';

// =============================================
// SIGMA STOCK OPERATIONS
// =============================================

export async function getSigmaStocks(): Promise<SigmaStock[]> {
  const { data, error } = await supabase
    .from('sigma_stock')
    .select('*')
    .order('client')
    .order('bottle_type');

  if (error) throw error;
  return (data || []) as unknown as SigmaStock[];
}

export async function getSigmaStock(
  client: StockClientType,
  bottleType: BottleType
): Promise<number> {
  const { data, error } = await supabase
    .from('sigma_stock')
    .select('current_stock')
    .eq('client', client)
    .eq('bottle_type', bottleType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.current_stock ?? 0;
}

export async function updateSigmaStock(
  client: StockClientType,
  bottleType: BottleType,
  quantity: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('sigma_stock')
    .select('id')
    .eq('client', client)
    .eq('bottle_type', bottleType)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('sigma_stock')
      .update({ current_stock: quantity, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('sigma_stock')
      .insert({
        client,
        bottle_type: bottleType,
        current_stock: quantity,
      } as Record<string, unknown>);
    if (error) throw error;
  }
}

export async function canReduceSigmaStock(
  client: StockClientType,
  bottleType: BottleType,
  newQuantity: number
): Promise<CanReduceSigmaResult> {
  const { data, error } = await supabase.rpc('can_reduce_sigma_stock', {
    p_client: client,
    p_bottle_type: bottleType,
    p_new_quantity: newQuantity,
  });

  if (error) throw error;
  return data as CanReduceSigmaResult;
}

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
    p_source_warehouse: null,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data as CreateMovementResult;
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
  return data as CreateMovementResult;
}

export async function deleteStockMovement(
  movementId: string
): Promise<DeleteMovementResult> {
  const { data, error } = await supabase.rpc('delete_stock_movement', {
    p_movement_id: movementId,
  });

  if (error) throw error;
  return data as DeleteMovementResult;
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
    } as Record<string, unknown>)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as StockInventory;
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
  return data as unknown as StockInventory | null;
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
    b6: b6Data ?? 0,
    b12: b12Data ?? 0,
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
// SIGMA DASHBOARD DATA
// =============================================

export interface SigmaDashboardData {
  stocks: SigmaStock[];
  totalB6: number;
  totalB12: number;
}

export async function getSigmaDashboardData(): Promise<SigmaDashboardData> {
  const stocks = await getSigmaStocks();
  
  const totalB6 = stocks
    .filter((s) => s.bottle_type === 'B6')
    .reduce((sum, s) => sum + s.current_stock, 0);
  
  const totalB12 = stocks
    .filter((s) => s.bottle_type === 'B12')
    .reduce((sum, s) => sum + s.current_stock, 0);

  return { stocks, totalB6, totalB12 };
}
