// =============================================
// STOCK MODULE - Unit Tests for Calculations
// =============================================

import {
  calculateTheoreticalStock,
  sumQuantities,
  subtractQuantities,
  isStockSufficient,
  formatNumber,
  formatStock,
  calculateStockPercentage,
  validateMovementQuantities,
  validateExitStock,
} from './stockCalculations';

describe('Stock Calculations', () => {
  describe('calculateTheoreticalStock', () => {
    it('should calculate theoretical stock correctly', () => {
      expect(calculateTheoreticalStock(100, 50, 30)).toBe(120);
      expect(calculateTheoreticalStock(0, 100, 50)).toBe(50);
      expect(calculateTheoreticalStock(1000, 0, 0)).toBe(1000);
    });

    it('should handle zero values', () => {
      expect(calculateTheoreticalStock(0, 0, 0)).toBe(0);
    });

    it('should handle negative results', () => {
      expect(calculateTheoreticalStock(10, 5, 20)).toBe(-5);
    });

    it('should avoid floating point errors', () => {
      expect(calculateTheoreticalStock(0.1, 0.2, 0.3)).toBe(0);
    });
  });

  describe('sumQuantities', () => {
    it('should sum multiple quantities', () => {
      expect(sumQuantities(10, 20, 30)).toBe(60);
      expect(sumQuantities(100)).toBe(100);
      expect(sumQuantities()).toBe(0);
    });

    it('should handle floating point precision', () => {
      expect(sumQuantities(0.1, 0.2)).toBe(0.3);
    });
  });

  describe('subtractQuantities', () => {
    it('should subtract quantities correctly', () => {
      expect(subtractQuantities(100, 30)).toBe(70);
      expect(subtractQuantities(50, 50)).toBe(0);
      expect(subtractQuantities(10, 20)).toBe(-10);
    });
  });

  describe('isStockSufficient', () => {
    it('should return true when stock is sufficient', () => {
      expect(isStockSufficient(100, 50)).toBe(true);
      expect(isStockSufficient(100, 100)).toBe(true);
    });

    it('should return false when stock is insufficient', () => {
      expect(isStockSufficient(50, 100)).toBe(false);
      expect(isStockSufficient(0, 1)).toBe(false);
    });

    it('should handle zero request', () => {
      expect(isStockSufficient(0, 0)).toBe(true);
      expect(isStockSufficient(100, 0)).toBe(true);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with French locale', () => {
      expect(formatNumber(1000)).toBe('1\u202f000');
      expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatStock', () => {
    it('should format stock with unit', () => {
      expect(formatStock(100)).toBe('100 btl');
      expect(formatStock(1000, 'unités')).toBe('1\u202f000 unités');
    });
  });

  describe('calculateStockPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateStockPercentage(50, 100)).toBe(50);
      expect(calculateStockPercentage(25, 100)).toBe(25);
      expect(calculateStockPercentage(100, 100)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(calculateStockPercentage(50, 0)).toBe(0);
    });

    it('should round to 1 decimal place', () => {
      expect(calculateStockPercentage(1, 3)).toBe(33.3);
    });
  });

  describe('validateMovementQuantities', () => {
    it('should validate positive quantities', () => {
      expect(validateMovementQuantities(10, 0).isValid).toBe(true);
      expect(validateMovementQuantities(0, 10).isValid).toBe(true);
      expect(validateMovementQuantities(10, 10).isValid).toBe(true);
    });

    it('should reject zero quantities', () => {
      const result = validateMovementQuantities(0, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('supérieure à 0');
    });

    it('should reject negative quantities', () => {
      const result = validateMovementQuantities(-1, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('négatives');
    });
  });

  describe('validateExitStock', () => {
    it('should validate when stock is sufficient', () => {
      expect(validateExitStock(100, 100, 50, 50).isValid).toBe(true);
      expect(validateExitStock(100, 100, 100, 100).isValid).toBe(true);
    });

    it('should reject when B6 stock is insufficient', () => {
      const result = validateExitStock(50, 100, 100, 50);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('B6');
    });

    it('should reject when B12 stock is insufficient', () => {
      const result = validateExitStock(100, 50, 50, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('B12');
    });

    it('should reject when both stocks are insufficient', () => {
      const result = validateExitStock(50, 50, 100, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('B6');
      expect(result.error).toContain('B12');
    });
  });
});
