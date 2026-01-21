// =============================================
// STOCK MODULE - Calculation Utilities with decimal.js
// =============================================

import Decimal from 'decimal.js';

// Configure decimal.js for precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculate theoretical stock using decimal.js to avoid floating point errors
 * Stock Théorique = Stock Initial (dernier inventaire) + Cumul Entrées - Cumul Sorties
 */
export function calculateTheoreticalStock(
  initialStock: number,
  totalEntries: number,
  totalExits: number
): number {
  const initial = new Decimal(initialStock);
  const entries = new Decimal(totalEntries);
  const exits = new Decimal(totalExits);

  return initial.plus(entries).minus(exits).toNumber();
}

/**
 * Sum quantities safely using decimal.js
 */
export function sumQuantities(...quantities: number[]): number {
  return quantities
    .reduce((acc, qty) => acc.plus(new Decimal(qty)), new Decimal(0))
    .toNumber();
}

/**
 * Subtract quantities safely using decimal.js
 */
export function subtractQuantities(a: number, b: number): number {
  return new Decimal(a).minus(new Decimal(b)).toNumber();
}

/**
 * Check if stock is sufficient for a withdrawal
 */
export function isStockSufficient(
  currentStock: number,
  requestedQuantity: number
): boolean {
  return new Decimal(currentStock).gte(new Decimal(requestedQuantity));
}

/**
 * Format number for French locale display
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

/**
 * Format stock with unit
 */
export function formatStock(value: number, unit: string = 'btl'): string {
  return `${formatNumber(value)} ${unit}`;
}

/**
 * Calculate percentage of stock used
 */
export function calculateStockPercentage(
  current: number,
  total: number
): number {
  if (total <= 0) return 0;
  return new Decimal(current)
    .dividedBy(new Decimal(total))
    .times(100)
    .toDecimalPlaces(1)
    .toNumber();
}

/**
 * Validate movement quantities
 */
export interface QuantityValidation {
  isValid: boolean;
  error?: string;
}

export function validateMovementQuantities(
  quantityB6: number,
  quantityB12: number
): QuantityValidation {
  if (quantityB6 < 0 || quantityB12 < 0) {
    return {
      isValid: false,
      error: 'Les quantités ne peuvent pas être négatives',
    };
  }

  if (quantityB6 === 0 && quantityB12 === 0) {
    return {
      isValid: false,
      error: 'Au moins une quantité doit être supérieure à 0',
    };
  }

  return { isValid: true };
}

/**
 * Validate stock for exit movement
 */
export function validateExitStock(
  availableB6: number,
  availableB12: number,
  requestedB6: number,
  requestedB12: number
): QuantityValidation {
  const b6Sufficient = isStockSufficient(availableB6, requestedB6);
  const b12Sufficient = isStockSufficient(availableB12, requestedB12);

  if (!b6Sufficient || !b12Sufficient) {
    const details: string[] = [];
    if (!b6Sufficient) {
      details.push(`B6: ${formatNumber(requestedB6)} demandé, ${formatNumber(availableB6)} disponible`);
    }
    if (!b12Sufficient) {
      details.push(`B12: ${formatNumber(requestedB12)} demandé, ${formatNumber(availableB12)} disponible`);
    }

    return {
      isValid: false,
      error: `Stock insuffisant:\n${details.join('\n')}`,
    };
  }

  return { isValid: true };
}
