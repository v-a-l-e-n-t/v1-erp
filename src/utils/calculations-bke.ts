import { BilanBkeEntry, BilanBkeFormData } from '@/types/balance-bke';
import Decimal from 'decimal.js';

// Configure Decimal.js pour une précision maximale (20 décimales par défaut)
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

export const calculateBilanBke = (formData: BilanBkeFormData): Omit<BilanBkeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> => {
  // Parse values using Decimal.js for maximum precision (already in kg)
  // À Bouaké : bac_stockage au lieu de spheres, pas de réservoirs
  const bac_stockage_initial = new Decimal(formData.bac_stockage_initial || 0);
  const bouteilles_initial = new Decimal(formData.bouteilles_initial || 0);

  // Process receptions with precise decimal arithmetic (already in kg)
  const receptions = formData.receptions.map(r => ({
    quantity: new Decimal(r.quantity || 0).toNumber(),
    client: r.client || '',
    reception_no: r.reception_no || ''
  }));
  const reception_gpl = receptions.reduce((sum, r) => sum.plus(r.quantity), new Decimal(0));

  // PAS de sorties vrac à Bouaké

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

  const bac_stockage_final = new Decimal(formData.bac_stockage_final || 0);
  const bouteilles_final = new Decimal(formData.bouteilles_final || 0);

  // Calculate totals with precise decimal arithmetic
  // À Bouaké : pas de réservoirs
  const stock_initial = bac_stockage_initial.plus(bouteilles_initial);
  // Pas de sorties vrac, donc cumul_sorties = conditionnées + fuyardes
  const cumul_sorties = sorties_conditionnees.plus(fuyardes);
  const stock_final = bac_stockage_final.plus(bouteilles_final);

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
    bac_stockage_initial: bac_stockage_initial.toNumber(),
    bouteilles_initial: bouteilles_initial.toNumber(),
    stock_initial: stock_initial.toNumber(),
    receptions,
    reception_gpl: reception_gpl.toNumber(),
    sorties_conditionnees_petro_ivoire: sorties_conditionnees_petro_ivoire.toNumber(),
    sorties_conditionnees_vivo_energies: sorties_conditionnees_vivo_energies.toNumber(),
    sorties_conditionnees_total_energies: sorties_conditionnees_total_energies.toNumber(),
    sorties_conditionnees: sorties_conditionnees.toNumber(),
    fuyardes_petro_ivoire: fuyardes_petro_ivoire.toNumber(),
    fuyardes_vivo_energies: fuyardes_vivo_energies.toNumber(),
    fuyardes_total_energies: fuyardes_total_energies.toNumber(),
    fuyardes: fuyardes.toNumber(),
    cumul_sorties: cumul_sorties.toNumber(),
    bac_stockage_final: bac_stockage_final.toNumber(),
    bouteilles_final: bouteilles_final.toNumber(),
    stock_final: stock_final.toNumber(),
    stock_theorique: stock_theorique.toNumber(),
    bilan: bilan.toNumber(),
    nature,
    // PAS d'agents à Bouaké
    notes: formData.notes,
  };
};

// Réutiliser les fonctions de formatage du module principal
export { formatNumber, formatNumberValue, getNatureColor, getNatureBadgeVariant } from './calculations';
