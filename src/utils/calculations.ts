import { BilanEntry, BilanFormData } from '@/types/balance';
import Decimal from 'decimal.js';

// Configure Decimal.js pour une précision maximale (20 décimales par défaut)
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

export const calculateBilan = (formData: BilanFormData): Omit<BilanEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> => {
  // Parse values using Decimal.js for maximum precision (already in kg)
  const spheres_initial = new Decimal(formData.spheres_initial || 0);
  const bouteilles_initial = new Decimal(formData.bouteilles_initial || 0);
  const reservoirs_initial = new Decimal(formData.reservoirs_initial || 0);
  
  // Process receptions with precise decimal arithmetic (already in kg)
  const receptions = formData.receptions.map(r => ({
    quantity: new Decimal(r.quantity || 0).toNumber(),
    provenance: r.provenance
  }));
  const reception_gpl = receptions.reduce((sum, r) => sum.plus(r.quantity), new Decimal(0));
  
  const sorties_vrac = new Decimal(formData.sorties_vrac || 0);
  const sorties_conditionnees = new Decimal(formData.sorties_conditionnees || 0);
  const fuyardes = new Decimal(formData.fuyardes || 0);
  const spheres_final = new Decimal(formData.spheres_final || 0);
  const bouteilles_final = new Decimal(formData.bouteilles_final || 0);
  const reservoirs_final = new Decimal(formData.reservoirs_final || 0);

  // Calculate totals with precise decimal arithmetic
  const stock_initial = spheres_initial.plus(bouteilles_initial).plus(reservoirs_initial);
  const cumul_sorties = sorties_vrac.plus(sorties_conditionnees).plus(fuyardes);
  const stock_final = spheres_final.plus(bouteilles_final).plus(reservoirs_final);

  // Calculate stock théorique with precise decimal arithmetic
  const stock_theorique = stock_initial.plus(reception_gpl).minus(cumul_sorties);

  // Calculate bilan with precise decimal arithmetic
  const bilan = stock_final.minus(stock_theorique);

  // Determine nature (using Decimal comparison)
  let nature: 'Positif' | 'Négatif' | 'Neutre';
  if (bilan.greaterThan(0)) {
    nature = 'Positif';
  } else if (bilan.lessThan(0)) {
    nature = 'Négatif';
  } else {
    nature = 'Neutre';
  }

  // Convert all Decimal values back to numbers for storage
  return {
    date: formData.date,
    spheres_initial: spheres_initial.toNumber(),
    bouteilles_initial: bouteilles_initial.toNumber(),
    reservoirs_initial: reservoirs_initial.toNumber(),
    stock_initial: stock_initial.toNumber(),
    receptions,
    reception_gpl: reception_gpl.toNumber(),
    sorties_vrac: sorties_vrac.toNumber(),
    sorties_conditionnees: sorties_conditionnees.toNumber(),
    fuyardes: fuyardes.toNumber(),
    cumul_sorties: cumul_sorties.toNumber(),
    spheres_final: spheres_final.toNumber(),
    bouteilles_final: bouteilles_final.toNumber(),
    reservoirs_final: reservoirs_final.toNumber(),
    stock_final: stock_final.toNumber(),
    stock_theorique: stock_theorique.toNumber(),
    bilan: bilan.toNumber(),
    nature,
    notes: formData.notes,
  };
};

export const formatNumber = (value: number): string => {
  // Formater avec espaces comme séparateurs de milliers et virgule pour les décimales
  const parts = value.toFixed(3).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1];
  
  // Si pas de décimales significatives, afficher sans décimales
  if (parseFloat('0.' + decimalPart) === 0) {
    return integerPart;
  }
  
  return `${integerPart},${decimalPart}`;
};

// Format number without unit (for exports)
export const formatNumberValue = (value: number): string => {
  const parts = value.toFixed(3).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1];
  
  if (parseFloat('0.' + decimalPart) === 0) {
    return integerPart;
  }
  
  return `${integerPart},${decimalPart}`;
};

export const getNatureColor = (nature: string): string => {
  switch (nature) {
    case 'Positif':
      return 'text-success';
    case 'Négatif':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

export const getNatureBadgeVariant = (nature: string): 'success' | 'destructive' | 'secondary' => {
  switch (nature) {
    case 'Positif':
      return 'success';
    case 'Négatif':
      return 'destructive';
    default:
      return 'secondary';
  }
};
