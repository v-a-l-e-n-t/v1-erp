import { supabase } from '@/integrations/supabase/client';
import { StockMovement, StockState, StockCategory, StockSite, BottleType, StockClient, WAREHOUSE_LIST, SigmaStock, BottleOrigin } from '@/types/stock';
import { calculateStockState, calculateTheoreticalStock, calculateAllStockStates } from './stockCalculations';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

/**
 * Vérifie si une catégorie est un magasin valide pour les mouvements inter-magasins
 */
export function isValidWarehouse(category: StockCategory | undefined): boolean {
  if (!category) return false;
  return WAREHOUSE_LIST.includes(category);
}

/**
 * Enregistre un mouvement de stock avec création automatique du mouvement miroir
 * pour les mouvements inter-magasins
 */
export async function saveStockMovement(
  movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: StockMovement; linkedData?: StockMovement; error?: string }> {
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

    // Insérer le mouvement principal
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(movementData)
      .select()
      .single();

    if (error) throw error;

    const savedMovement = data as StockMovement;
    let linkedMovement: StockMovement | undefined;

    // Créer le mouvement miroir si c'est un mouvement inter-magasins
    if (movement.movement_type === 'sortie' && movement.destination_warehouse && isValidWarehouse(movement.destination_warehouse)) {
      // Sortie vers un autre magasin → Créer une entrée dans le magasin destination
      linkedMovement = await createLinkedMovement(savedMovement, 'entree', movement.destination_warehouse, userEmail, user?.id);
    } else if (movement.movement_type === 'entree' && movement.source_warehouse && isValidWarehouse(movement.source_warehouse)) {
      // Entrée depuis un autre magasin → Créer une sortie dans le magasin source
      linkedMovement = await createLinkedMovement(savedMovement, 'sortie', movement.source_warehouse, userEmail, user?.id);
    }

    // Mettre à jour le mouvement principal avec le linked_movement_id
    if (linkedMovement) {
      await supabase
        .from('stock_movements')
        .update({ linked_movement_id: linkedMovement.id } as any)
        .eq('id', savedMovement.id);
      
      savedMovement.linked_movement_id = linkedMovement.id;
    }

    return { success: true, data: savedMovement, linkedData: linkedMovement };
  } catch (error: any) {
    console.error('Error saving stock movement:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Crée un mouvement lié (miroir) pour les mouvements inter-magasins
 */
async function createLinkedMovement(
  originalMovement: StockMovement,
  newMovementType: 'entree' | 'sortie',
  targetWarehouse: StockCategory,
  userEmail: string,
  userId?: string
): Promise<StockMovement | undefined> {
  try {
    // Calculer le stock théorique pour le magasin destination
    const existingMovements = await loadStockMovements();
    const stockTheorique = calculateTheoreticalStock(
      existingMovements,
      targetWarehouse,
      originalMovement.site,
      originalMovement.bottle_type,
      originalMovement.client,
      originalMovement.date
    );

    const linkedMovementData = {
      date: originalMovement.date,
      category: targetWarehouse,
      site: originalMovement.site,
      movement_type: newMovementType,
      bottle_type: originalMovement.bottle_type,
      quantity: originalMovement.quantity,
      client: originalMovement.client,
      bon_numero: originalMovement.bon_numero,
      // Inverser source/destination
      source_warehouse: newMovementType === 'entree' ? originalMovement.category : undefined,
      destination_warehouse: newMovementType === 'sortie' ? originalMovement.category : undefined,
      provenance: newMovementType === 'entree' ? originalMovement.category : undefined,
      destination: newMovementType === 'sortie' ? originalMovement.category : undefined,
      linked_movement_id: originalMovement.id,
      stock_theorique: stockTheorique,
      user_id: userId || null,
      last_modified_by: userEmail,
      last_modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(linkedMovementData as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating linked movement:', error);
      return undefined;
    }

    return data as StockMovement;
  } catch (error) {
    console.error('Error creating linked movement:', error);
    return undefined;
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
 * Récupère un mouvement par son ID
 */
export async function getStockMovementById(id: string): Promise<StockMovement | null> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as StockMovement;
  } catch (error) {
    console.error('Error getting stock movement:', error);
    return null;
  }
}

/**
 * Vérifie si un mouvement a un mouvement lié
 */
export async function getLinkedMovement(id: string): Promise<StockMovement | null> {
  try {
    const movement = await getStockMovementById(id);
    if (!movement?.linked_movement_id) return null;
    
    return await getStockMovementById(movement.linked_movement_id);
  } catch (error) {
    console.error('Error getting linked movement:', error);
    return null;
  }
}

/**
 * Supprime un mouvement de stock (un seul, sans cascade)
 */
export async function deleteStockMovementSingle(
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
 * Supprime un mouvement de stock avec option cascade
 * @param id - ID du mouvement à supprimer
 * @param cascade - Si true, supprime aussi le mouvement lié
 */
export async function deleteStockMovement(
  id: string,
  cascade: boolean = true
): Promise<{ success: boolean; deletedLinked: boolean; error?: string }> {
  try {
    // Récupérer le mouvement pour vérifier s'il a un mouvement lié
    const movement = await getStockMovementById(id);
    
    if (!movement) {
      return { success: false, deletedLinked: false, error: 'Mouvement non trouvé' };
    }

    let deletedLinked = false;

    // Si cascade et mouvement lié existe, supprimer d'abord le mouvement lié
    if (cascade && movement.linked_movement_id) {
      const linkedResult = await deleteStockMovementSingle(movement.linked_movement_id);
      if (linkedResult.success) {
        deletedLinked = true;
      }
    }

    // Supprimer le mouvement principal
    const { error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, deletedLinked };
  } catch (error: any) {
    console.error('Error deleting stock movement:', error);
    return { success: false, deletedLinked: false, error: error.message || 'Erreur lors de la suppression' };
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

// ============================================
// GESTION DU STOCK SIGMA
// ============================================

/**
 * Charge tous les stocks SIGMA
 */
export async function loadSigmaStocks(): Promise<SigmaStock[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('sigma_stock')
      .select('*')
      .order('client')
      .order('bottle_type')
      .order('bottle_origin');

    if (error) throw error;
    return (data || []) as SigmaStock[];
  } catch (error: any) {
    console.error('Error loading sigma stocks:', error);
    return [];
  }
}

/**
 * Récupère le stock SIGMA pour un client et type de bouteille (simplifié)
 */
export async function getSigmaStockSimple(
  client: StockClient,
  bottleType: BottleType
): Promise<SigmaStock | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('sigma_stock')
      .select('*')
      .eq('client', client)
      .eq('bottle_type', bottleType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as SigmaStock;
  } catch (error: any) {
    console.error('Error getting sigma stock:', error);
    return null;
  }
}

/**
 * Récupère le stock SIGMA pour un client, type de bouteille et origine spécifiques (legacy)
 */
export async function getSigmaStock(
  client: StockClient,
  bottleType: BottleType,
  bottleOrigin: BottleOrigin
): Promise<SigmaStock | null> {
  // Pour compatibilité, on utilise maintenant la version simplifiée
  return getSigmaStockSimple(client, bottleType);
}

/**
 * Vérifie si le stock SIGMA est suffisant pour une entrée
 */
export async function checkSigmaStockAvailable(
  client: StockClient,
  bottleType: BottleType,
  quantity: number
): Promise<{ available: boolean; currentStock: number; message?: string }> {
  const sigmaStock = await getSigmaStockSimple(client, bottleType);
  
  if (!sigmaStock) {
    return {
      available: false,
      currentStock: 0,
      message: `Aucun stock SIGMA configuré pour ${client} - ${bottleType}`
    };
  }

  if (sigmaStock.current_stock < quantity) {
    return {
      available: false,
      currentStock: sigmaStock.current_stock,
      message: `Stock SIGMA insuffisant. Disponible: ${sigmaStock.current_stock}, Demandé: ${quantity}`
    };
  }

  return {
    available: true,
    currentStock: sigmaStock.current_stock
  };
}

/**
 * Crée ou met à jour un stock SIGMA (simplifié: client + type bouteille)
 */
export async function saveSigmaStock(
  client: StockClient,
  bottleType: BottleType,
  initialStock: number
): Promise<{ success: boolean; data?: SigmaStock; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    // Vérifier si le stock existe déjà (par client + type)
    const existing = await getSigmaStockSimple(client, bottleType);

    if (existing) {
      // Mettre à jour
      const { data, error } = await (supabase as any)
        .from('sigma_stock')
        .update({
          initial_stock: initialStock,
          current_stock: initialStock,
          last_modified_by: userEmail
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as SigmaStock };
    } else {
      // Créer
      const { data, error } = await (supabase as any)
        .from('sigma_stock')
        .insert({
          client,
          bottle_type: bottleType,
          initial_stock: initialStock,
          current_stock: initialStock,
          last_modified_by: userEmail
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as SigmaStock };
    }
  } catch (error: any) {
    console.error('Error saving sigma stock:', error);
    return { success: false, error: error.message || 'Erreur lors de l\'enregistrement' };
  }
}

/**
 * Décrémente le stock SIGMA après une entrée dans un autre magasin
 */
export async function decrementSigmaStock(
  client: StockClient,
  bottleType: BottleType,
  quantity: number
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  try {
    const sigmaStock = await getSigmaStockSimple(client, bottleType);
    
    if (!sigmaStock) {
      return { success: false, error: 'Stock SIGMA non trouvé' };
    }

    const newStock = sigmaStock.current_stock - quantity;

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    const { error } = await (supabase as any)
      .from('sigma_stock')
      .update({
        current_stock: newStock,
        last_modified_by: userEmail
      })
      .eq('id', sigmaStock.id);

    if (error) throw error;

    return { success: true, newStock };
  } catch (error: any) {
    console.error('Error decrementing sigma stock:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Incrémente le stock SIGMA (en cas de suppression d'une entrée ou retour)
 */
export async function incrementSigmaStock(
  client: StockClient,
  bottleType: BottleType,
  quantity: number
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  try {
    const sigmaStock = await getSigmaStockSimple(client, bottleType);
    
    if (!sigmaStock) {
      return { success: false, error: 'Stock SIGMA non trouvé' };
    }

    const newStock = sigmaStock.current_stock + quantity;

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    const { error } = await (supabase as any)
      .from('sigma_stock')
      .update({
        current_stock: newStock,
        last_modified_by: userEmail
      })
      .eq('id', sigmaStock.id);

    if (error) throw error;

    return { success: true, newStock };
  } catch (error: any) {
    console.error('Error incrementing sigma stock:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprime un stock SIGMA
 */
export async function deleteSigmaStock(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('sigma_stock')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting sigma stock:', error);
    return { success: false, error: error.message };
  }
}
