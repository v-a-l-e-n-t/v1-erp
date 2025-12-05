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
    navire: r.navire || '',
    reception_no: r.reception_no || ''
  }));
  const reception_gpl = receptions.reduce((sum, r) => sum.plus(r.quantity), new Decimal(0));

  // Calculate sorties vrac total
  const sorties_vrac_simam = new Decimal(formData.sorties_vrac_simam || 0);
  const sorties_vrac_petro_ivoire = new Decimal(formData.sorties_vrac_petro_ivoire || 0);
  const sorties_vrac_vivo_energies = new Decimal(formData.sorties_vrac_vivo_energies || 0);
  const sorties_vrac_total_energies = new Decimal(formData.sorties_vrac_total_energies || 0);
  const sorties_vrac = sorties_vrac_simam
    .plus(sorties_vrac_petro_ivoire)
    .plus(sorties_vrac_vivo_energies)
    .plus(sorties_vrac_total_energies);

  // Calculate sorties conditionnées total
  const sorties_conditionnees_petro_ivoire = new Decimal(formData.sorties_conditionnees_petro_ivoire || 0);
  const sorties_conditionnees_vivo_energies = new Decimal(formData.sorties_conditionnees_vivo_energies || 0);
  const sorties_conditionnees_total_energies = new Decimal(formData.sorties_conditionnees_total_energies || 0);
  const sorties_conditionnees = sorties_conditionnees_petro_ivoire
    .plus(sorties_conditionnees_vivo_energies)
    .plus(sorties_conditionnees_total_energies);

  // Calculate fuyardes total
  const fuyardes_petro_ivoire = new Decimal(formData.fuyardes_petro_ivoire || 0);
  const fuyardes_vivo_energies = new Decimal(formData.fuyardes_vivo_energies || 0);
  const fuyardes_total_energies = new Decimal(formData.fuyardes_total_energies || 0);
  const fuyardes = fuyardes_petro_ivoire
    .plus(fuyardes_vivo_energies)
    .plus(fuyardes_total_energies);
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
    sorties_vrac_simam: sorties_vrac_simam.toNumber(),
    sorties_vrac_petro_ivoire: sorties_vrac_petro_ivoire.toNumber(),
    sorties_vrac_vivo_energies: sorties_vrac_vivo_energies.toNumber(),
    sorties_vrac_total_energies: sorties_vrac_total_energies.toNumber(),
    sorties_vrac: sorties_vrac.toNumber(),
    sorties_conditionnees_petro_ivoire: sorties_conditionnees_petro_ivoire.toNumber(),
    sorties_conditionnees_vivo_energies: sorties_conditionnees_vivo_energies.toNumber(),
    sorties_conditionnees_total_energies: sorties_conditionnees_total_energies.toNumber(),
    sorties_conditionnees: sorties_conditionnees.toNumber(),
    fuyardes_petro_ivoire: fuyardes_petro_ivoire.toNumber(),
    fuyardes_vivo_energies: fuyardes_vivo_energies.toNumber(),
    fuyardes_total_energies: fuyardes_total_energies.toNumber(),
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

export const getWorkingDaysInMonth = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i).getDay();
    if (d !== 0) count++; // 0 is Sunday
  }
  return count;
};

export const getWorkingDaysPassed = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();

  // If selected month is future, return 0
  if (today.getFullYear() < year || (today.getFullYear() === year && today.getMonth() < month)) return 0;

  // If selected month is past, return total working days in that month
  if (today.getFullYear() > year || (today.getFullYear() === year && today.getMonth() > month)) {
    return getWorkingDaysInMonth(date);
  }

  // Current month: count working days up to today
  const currentDay = today.getDate();
  let count = 0;
  for (let i = 1; i <= currentDay; i++) {
    const d = new Date(year, month, i).getDay();
    if (d !== 0) count++;
  }
  return count;
};
