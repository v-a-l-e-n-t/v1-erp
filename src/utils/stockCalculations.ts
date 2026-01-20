import { StockMovement, StockState, StockCategory, StockSite, BottleType, StockClient } from '@/types/stock';
import Decimal from 'decimal.js';

// Configure Decimal.js pour précision maximale
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcule le stock théorique pour une combinaison catégorie/site/type/client
 */
export function calculateTheoreticalStock(
  movements: StockMovement[],
  category: StockCategory,
  site: StockSite,
  bottleType: BottleType,
  client?: StockClient,
  upToDate?: string
): number {
  let stockInitial = 0;
  let cumulEntrees = new Decimal(0);
  let cumulSorties = new Decimal(0);

  // Filtrer les mouvements pertinents
  const relevantMovements = movements.filter(m => {
    if (m.category !== category) return false;
    if (m.site !== site) return false;
    if (m.bottle_type !== bottleType) return false;
    if (client !== undefined && m.client !== client) return false;
    if (upToDate && m.date > upToDate) return false;
    return true;
  });

  // Trier par date pour calculer séquentiellement
  const sortedMovements = [...relevantMovements].sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  // Calculer les cumuls
  sortedMovements.forEach(movement => {
    if (movement.movement_type === 'entree') {
      cumulEntrees = cumulEntrees.plus(movement.quantity);
    } else if (movement.movement_type === 'sortie') {
      cumulSorties = cumulSorties.plus(movement.quantity);
    } else if (movement.movement_type === 'inventaire') {
      // Pour un inventaire, on met à jour le stock initial
      if (movement.stock_reel !== undefined) {
        stockInitial = movement.stock_reel;
        // Réinitialiser les cumuls après l'inventaire
        cumulEntrees = new Decimal(0);
        cumulSorties = new Decimal(0);
      }
    }
  });

  const stockTheorique = new Decimal(stockInitial)
    .plus(cumulEntrees)
    .minus(cumulSorties);

  return stockTheorique.toNumber();
}

/**
 * Calcule l'état de stock consolidé pour une combinaison
 */
export function calculateStockState(
  movements: StockMovement[],
  category: StockCategory,
  site: StockSite,
  bottleType: BottleType,
  client?: StockClient
): StockState {
  // Filtrer les mouvements pertinents
  const relevantMovements = movements.filter(m => {
    if (m.category !== category) return false;
    if (m.site !== site) return false;
    if (m.bottle_type !== bottleType) return false;
    if (client !== undefined && m.client !== client) return false;
    return true;
  });

  // Trier par date
  const sortedMovements = [...relevantMovements].sort((a, b) => 
    a.date.localeCompare(b.date)
  );

  let stockInitial = 0;
  let cumulEntrees = new Decimal(0);
  let cumulSorties = new Decimal(0);
  let stockReel: number | undefined;
  let ecart: number | undefined;
  let lastInventoryDate: string | undefined;

  // Trouver le dernier inventaire pour obtenir le stock initial
  const lastInventory = [...sortedMovements]
    .reverse()
    .find(m => m.movement_type === 'inventaire' && m.stock_reel !== undefined);

  if (lastInventory) {
    stockInitial = lastInventory.stock_reel || 0;
    stockReel = lastInventory.stock_reel;
    ecart = lastInventory.ecart;
    lastInventoryDate = lastInventory.date;

    // Calculer les cumuls après le dernier inventaire
    const movementsAfterInventory = sortedMovements.filter(m => 
      m.date > lastInventory.date
    );

    movementsAfterInventory.forEach(movement => {
      if (movement.movement_type === 'entree') {
        cumulEntrees = cumulEntrees.plus(movement.quantity);
      } else if (movement.movement_type === 'sortie') {
        cumulSorties = cumulSorties.plus(movement.quantity);
      }
    });
  } else {
    // Pas d'inventaire, calculer depuis le début
    sortedMovements.forEach(movement => {
      if (movement.movement_type === 'entree') {
        cumulEntrees = cumulEntrees.plus(movement.quantity);
      } else if (movement.movement_type === 'sortie') {
        cumulSorties = cumulSorties.plus(movement.quantity);
      } else if (movement.movement_type === 'inventaire' && movement.stock_reel !== undefined) {
        stockInitial = movement.stock_reel;
        stockReel = movement.stock_reel;
        ecart = movement.ecart;
        lastInventoryDate = movement.date;
        // Réinitialiser les cumuls après l'inventaire
        cumulEntrees = new Decimal(0);
        cumulSorties = new Decimal(0);
      }
    });
  }

  const stockTheorique = new Decimal(stockInitial)
    .plus(cumulEntrees)
    .minus(cumulSorties);

  return {
    category,
    site,
    bottle_type: bottleType,
    client,
    stock_initial: stockInitial,
    cumul_entrees: cumulEntrees.toNumber(),
    cumul_sorties: cumulSorties.toNumber(),
    stock_theorique: stockTheorique.toNumber(),
    stock_reel: stockReel,
    ecart,
    last_inventory_date: lastInventoryDate
  };
}

/**
 * Calcule tous les états de stock pour toutes les combinaisons
 */
export function calculateAllStockStates(movements: StockMovement[]): StockState[] {
  const states: StockState[] = [];
  const combinations = new Set<string>();

  // Collecter toutes les combinaisons uniques
  movements.forEach(m => {
    const key = `${m.category}|${m.site}|${m.bottle_type}|${m.client || 'null'}`;
    combinations.add(key);
  });

  // Calculer l'état pour chaque combinaison
  combinations.forEach(key => {
    const [category, site, bottleType, clientStr] = key.split('|');
    const client = clientStr === 'null' ? undefined : (clientStr as StockClient);
    
    const state = calculateStockState(
      movements,
      category as StockCategory,
      site as StockSite,
      bottleType as BottleType,
      client
    );
    
    states.push(state);
  });

  return states;
}

/**
 * Détecte les écarts significatifs
 */
export function detectSignificantDiscrepancies(
  states: StockState[],
  threshold: number = 10 // Seuil par défaut : 10 bouteilles
): StockState[] {
  return states.filter(state => {
    if (state.ecart === undefined || state.stock_reel === undefined) return false;
    return Math.abs(state.ecart) >= threshold;
  });
}

/**
 * Génère une synthèse des stocks pour une période
 */
export interface StockSummary {
  period: string;
  total_entrees: number;
  total_sorties: number;
  total_stock_theorique: number;
  total_ecarts: number;
  categories: Record<StockCategory, {
    entrees: number;
    sorties: number;
    stock_theorique: number;
  }>;
  sites: Record<StockSite, {
    entrees: number;
    sorties: number;
    stock_theorique: number;
  }>;
  bottle_types: Record<BottleType, {
    entrees: number;
    sorties: number;
    stock_theorique: number;
  }>;
}

export function generateStockSummary(
  movements: StockMovement[],
  startDate?: string,
  endDate?: string
): StockSummary {
  // Filtrer par période si fournie
  let filteredMovements = movements;
  if (startDate || endDate) {
    filteredMovements = movements.filter(m => {
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });
  }

  const period = startDate && endDate 
    ? `${startDate} - ${endDate}`
    : startDate 
    ? `Depuis ${startDate}`
    : endDate
    ? `Jusqu'à ${endDate}`
    : 'Toutes périodes';

  let totalEntrees = new Decimal(0);
  let totalSorties = new Decimal(0);
  let totalEcart = new Decimal(0);

  const categories: Record<StockCategory, { entrees: Decimal; sorties: Decimal; stock_theorique: Decimal }> = {
    bouteilles_neuves: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    consignes: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    stock_outils: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    bouteilles_hs: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    reconfiguration: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    sigma: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    parc_ce: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) }
  };

  const sites: Record<StockSite, { entrees: Decimal; sorties: Decimal; stock_theorique: Decimal }> = {
    depot_vrac: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    centre_emplisseur: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) }
  };

  const bottleTypes: Record<BottleType, { entrees: Decimal; sorties: Decimal; stock_theorique: Decimal }> = {
    B6: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    B12: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    B28: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) },
    B38: { entrees: new Decimal(0), sorties: new Decimal(0), stock_theorique: new Decimal(0) }
  };

  // Calculer les cumuls
  filteredMovements.forEach(movement => {
    const qty = new Decimal(movement.quantity);

    if (movement.movement_type === 'entree') {
      totalEntrees = totalEntrees.plus(qty);
      categories[movement.category].entrees = categories[movement.category].entrees.plus(qty);
      sites[movement.site].entrees = sites[movement.site].entrees.plus(qty);
      bottleTypes[movement.bottle_type].entrees = bottleTypes[movement.bottle_type].entrees.plus(qty);
    } else if (movement.movement_type === 'sortie') {
      totalSorties = totalSorties.plus(qty);
      categories[movement.category].sorties = categories[movement.category].sorties.plus(qty);
      sites[movement.site].sorties = sites[movement.site].sorties.plus(qty);
      bottleTypes[movement.bottle_type].sorties = bottleTypes[movement.bottle_type].sorties.plus(qty);
    }

    if (movement.ecart !== undefined) {
      totalEcart = totalEcart.plus(Math.abs(movement.ecart));
    }
  });

  // Calculer les stocks théoriques (nécessite les états complets)
  const allStates = calculateAllStockStates(movements);
  allStates.forEach(state => {
    categories[state.category].stock_theorique = categories[state.category].stock_theorique.plus(state.stock_theorique);
    sites[state.site].stock_theorique = sites[state.site].stock_theorique.plus(state.stock_theorique);
    bottleTypes[state.bottle_type].stock_theorique = bottleTypes[state.bottle_type].stock_theorique.plus(state.stock_theorique);
  });

  const totalStockTheorique = allStates.reduce((sum, state) => sum + state.stock_theorique, 0);

  return {
    period,
    total_entrees: totalEntrees.toNumber(),
    total_sorties: totalSorties.toNumber(),
    total_stock_theorique: totalStockTheorique,
    total_ecarts: totalEcart.toNumber(),
    categories: Object.fromEntries(
      Object.entries(categories).map(([key, value]) => [
        key,
        {
          entrees: value.entrees.toNumber(),
          sorties: value.sorties.toNumber(),
          stock_theorique: value.stock_theorique.toNumber()
        }
      ])
    ) as Record<StockCategory, { entrees: number; sorties: number; stock_theorique: number }>,
    sites: Object.fromEntries(
      Object.entries(sites).map(([key, value]) => [
        key,
        {
          entrees: value.entrees.toNumber(),
          sorties: value.sorties.toNumber(),
          stock_theorique: value.stock_theorique.toNumber()
        }
      ])
    ) as Record<StockSite, { entrees: number; sorties: number; stock_theorique: number }>,
    bottle_types: Object.fromEntries(
      Object.entries(bottleTypes).map(([key, value]) => [
        key,
        {
          entrees: value.entrees.toNumber(),
          sorties: value.sorties.toNumber(),
          stock_theorique: value.stock_theorique.toNumber()
        }
      ])
    ) as Record<BottleType, { entrees: number; sorties: number; stock_theorique: number }>
  };
}
