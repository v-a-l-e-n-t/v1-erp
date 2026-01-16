import { supabase } from '@/integrations/supabase/client';
import { StockMovement, StockState, StockCategory, StockSite, BottleType, StockClient } from '@/types/stock';
import { calculateStockState, calculateTheoreticalStock, calculateAllStockStates } from './stockCalculations';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

/**
 * Enregistre un mouvement de stock
 */
export async function saveStockMovement(
  movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: StockMovement; error?: string }> {
  try {
    // Calculer le stock théorique avant le mouvement
    const existingMovements = await loadStockMovements();
    const stockTheorique = calculateTheoreticalStock(
      existingMovements,
      movement.category,
      movement.site,
      movement.bottle_type,
      movement.client,
      movement.date
    );

    // Calculer l'écart si c'est un inventaire
    let ecart: number | undefined;
    if (movement.movement_type === 'inventaire' && movement.stock_reel !== undefined) {
      ecart = movement.stock_reel - stockTheorique;
    }

    // Préparer les données
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    const movementData = {
      ...movement,
      stock_theorique: stockTheorique,
      ecart,
      user_id: user?.id || null,
      last_modified_by: userEmail,
      last_modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(movementData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data as StockMovement };
  } catch (error: any) {
    console.error('Error saving stock movement:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Charge les mouvements de stock avec filtres optionnels
 */
export async function loadStockMovements(filters?: {
  category?: StockCategory;
  site?: StockSite;
  bottleType?: BottleType;
  client?: StockClient;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: DateRange;
}): Promise<StockMovement[]> {
  try {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.site) {
      query = query.eq('site', filters.site);
    }
    if (filters?.bottleType) {
      query = query.eq('bottle_type', filters.bottleType);
    }
    if (filters?.client !== undefined) {
      if (filters.client === null) {
        query = query.is('client', null);
      } else {
        query = query.eq('client', filters.client);
      }
    }
    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    // Filtres de date
    if (filters?.dateRange?.from) {
      const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd');
      query = query.gte('date', fromStr);
      
      if (filters.dateRange.to) {
        const toStr = format(filters.dateRange.to, 'yyyy-MM-dd');
        query = query.lte('date', toStr);
      }
    } else {
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as StockMovement[];
  } catch (error: any) {
    console.error('Error loading stock movements:', error);
    return [];
  }
}

/**
 * Calcule l'état de stock consolidé pour une combinaison
 */
export async function calculateStockStateFromDB(
  category: StockCategory,
  site: StockSite,
  bottleType: BottleType,
  client?: StockClient
): Promise<StockState> {
  const movements = await loadStockMovements({ category, site, bottleType, client });
  return calculateStockState(movements, category, site, bottleType, client);
}

/**
 * Calcule tous les états de stock depuis la base de données
 */
export async function calculateAllStockStatesFromDB(): Promise<StockState[]> {
  const movements = await loadStockMovements();
  return calculateAllStockStates(movements);
}

/**
 * Récupère l'historique des mouvements avec pagination optionnelle
 */
export async function getStockHistory(
  limit?: number,
  offset?: number,
  filters?: {
    category?: StockCategory;
    site?: StockSite;
    bottleType?: BottleType;
    client?: StockClient;
    movementType?: string;
  }
): Promise<{ movements: StockMovement[]; total: number }> {
  try {
    let query = supabase
      .from('stock_movements')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.site) {
      query = query.eq('site', filters.site);
    }
    if (filters?.bottleType) {
      query = query.eq('bottle_type', filters.bottleType);
    }
    if (filters?.client !== undefined) {
      if (filters.client === null) {
        query = query.is('client', null);
      } else {
        query = query.eq('client', filters.client);
      }
    }
    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    // Pagination
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      movements: (data || []) as StockMovement[],
      total: count || 0
    };
  } catch (error: any) {
    console.error('Error getting stock history:', error);
    return { movements: [], total: 0 };
  }
}

/**
 * Met à jour un mouvement de stock
 */
export async function updateStockMovement(
  id: string,
  updates: Partial<Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; data?: StockMovement; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    const updateData = {
      ...updates,
      last_modified_by: userEmail,
      last_modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: data as StockMovement };
  } catch (error: any) {
    console.error('Error updating stock movement:', error);
    return { success: false, error: error.message || 'Erreur lors de la mise à jour' };
  }
}

/**
 * Supprime un mouvement de stock
 */
export async function deleteStockMovement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting stock movement:', error);
    return { success: false, error: error.message || 'Erreur lors de la suppression' };
  }
}

/**
 * Récupère les statistiques de stock pour une période
 */
export async function getStockStats(
  startDate?: string,
  endDate?: string
): Promise<{
  total_movements: number;
  total_entrees: number;
  total_sorties: number;
  total_inventaires: number;
  total_ecarts: number;
}> {
  try {
    let query = supabase.from('stock_movements').select('movement_type, quantity, ecart');

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const movements = data || [];
    let totalEntrees = 0;
    let totalSorties = 0;
    let totalInventaires = 0;
    let totalEcart = 0;

    movements.forEach((m: any) => {
      if (m.movement_type === 'entree' || m.movement_type === 'transfert') {
        totalEntrees += m.quantity || 0;
      } else if (m.movement_type === 'sortie') {
        totalSorties += m.quantity || 0;
      } else if (m.movement_type === 'inventaire') {
        totalInventaires += 1;
      }
      if (m.ecart !== undefined && m.ecart !== null) {
        totalEcart += Math.abs(m.ecart);
      }
    });

    return {
      total_movements: movements.length,
      total_entrees: totalEntrees,
      total_sorties: totalSorties,
      total_inventaires: totalInventaires,
      total_ecarts: totalEcart
    };
  } catch (error: any) {
    console.error('Error getting stock stats:', error);
    return {
      total_movements: 0,
      total_entrees: 0,
      total_sorties: 0,
      total_inventaires: 0,
      total_ecarts: 0
    };
  }
}
