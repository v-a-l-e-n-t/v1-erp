// src/utils/filterPersistence.ts
import { DateRange } from 'react-day-picker';

export type FilterType = 'all' | 'year' | 'month' | 'period' | 'day';

export interface FilterState {
  filterType: FilterType;
  selectedYear?: number;
  selectedMonth?: string;
  selectedDate?: string; // ISO string
  dateRange?: {
    from?: string; // ISO string
    to?: string; // ISO string
  };
}

// Sauvegarder les filtres pour une vue spécifique
export const saveFilterState = (viewName: string, state: FilterState) => {
  try {
    localStorage.setItem(`filter_${viewName}`, JSON.stringify(state));
  } catch (error) {
    console.error(`Error saving filter state for ${viewName}:`, error);
  }
};

// Restaurer les filtres pour une vue spécifique
export const loadFilterState = (viewName: string): FilterState | null => {
  try {
    const stored = localStorage.getItem(`filter_${viewName}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error loading filter state for ${viewName}:`, error);
  }
  return null;
};

// Convertir DateRange en format sauvegardable
export const dateRangeToState = (range: DateRange | undefined): { from?: string; to?: string } | undefined => {
  if (!range?.from) return undefined;
  return {
    from: range.from.toISOString(),
    to: range.to?.toISOString()
  };
};

// Convertir l'état sauvegardé en DateRange
export const stateToDateRange = (state?: { from?: string; to?: string }): DateRange | undefined => {
  if (!state?.from) return undefined;
  return {
    from: new Date(state.from),
    to: state.to ? new Date(state.to) : undefined
  };
};

// Convertir string ISO en Date
export const stateToDate = (dateStr?: string): Date | undefined => {
  if (!dateStr) return undefined;
  return new Date(dateStr);
};
