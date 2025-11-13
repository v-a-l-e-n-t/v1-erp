import Decimal from 'decimal.js';

// Configure Decimal.js pour précision maximale
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

// Constantes
const CAPACITE_STOCKAGE_SPHERE = 3323412.7; // Litres
const DENSITE_BUTANE_GAZEUX_AIR_SEC = 2.004;

export interface SphereInputData {
  sphere_number: number;
  hauteur_mm: number;
  temperature_liquide_c: number;
  temperature_gazeuse_c: number;
  pression_sphere_barg: number;
  densite_d15: number;
  
  // Paramètres température/densité (saisis manuellement)
  tl_min: number;
  tl_max: number;
  d_min: number;
  d_max: number;
  
  // Paramètres température gazeuse/poids spécifique (saisis manuellement)
  tg_min: number;
  tg_max: number;
  ps_min: number;
  ps_max: number;
}

export interface CalibrationPoint {
  height_mm: number;
  capacity_l: number;
}

export interface SphereCalculationResult {
  niveau_produit_mm: number;
  volume_liquide_l: number;
  volume_gazeux_l: number;
  temperature_c: number;
  masse_volumique_butane_kgl: number;
  masse_produit_kg: number;
  masse_total_liquide_kg: number;
  masse_total_gaz_kg: number;
  masse_liquide_gaz_kg: number;
  creux_kg: number;
}

/**
 * Trouve les points d'encadrement pour une hauteur donnée
 * Pour Sphere 1: incrémentation de 1mm
 * Pour Spheres 2 et 3: incrémentation de 10mm
 */
export function findCalibrationBounds(
  calibrationData: CalibrationPoint[],
  hauteur: number,
  sphereNumber: number
): { hmin: number; hmax: number; vlmin: number; vlmax: number } {
  console.log(`🔍 Recherche pour hauteur: ${hauteur}mm, Total données: ${calibrationData.length}`);
  
  // Trier les données par hauteur
  const sorted = [...calibrationData].sort((a, b) => a.height_mm - b.height_mm);
  
  // Pour Sphere 1 (incrémentation de 1mm)
  if (sphereNumber === 1) {
    const hauteurFloor = Math.floor(hauteur);
    console.log(`📏 Hauteur arrondie: ${hauteurFloor}mm`);
    
    // Chercher les bornes immédiatement inférieure et supérieure
    let pointMin = null;
    let pointMax = null;
    
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].height_mm <= hauteurFloor) {
        pointMin = sorted[i];
      }
      if (sorted[i].height_mm >= hauteurFloor && !pointMax) {
        pointMax = sorted[i];
        break;
      }
    }
    
    console.log(`✅ Bornes trouvées - Min: ${pointMin?.height_mm}mm, Max: ${pointMax?.height_mm}mm`);
    
    if (!pointMin || !pointMax) {
      console.error(`❌ Données manquantes! pointMin: ${pointMin}, pointMax: ${pointMax}`);
      console.error(`📊 Premières données: ${sorted[0]?.height_mm}mm, Dernières: ${sorted[sorted.length-1]?.height_mm}mm`);
      throw new Error(`Données de barémage manquantes pour hauteur ${hauteur}mm`);
    }
    
    return {
      hmin: pointMin.height_mm,
      hmax: pointMax.height_mm,
      vlmin: pointMin.capacity_l,
      vlmax: pointMax.capacity_l
    };
  }
  
  // Pour Spheres 2 et 3 (incrémentation de 10mm), on encadre la valeur
  const hmin = Math.floor(hauteur / 10) * 10;
  const hmax = Math.ceil(hauteur / 10) * 10;
  
  const pointMin = sorted.find(p => p.height_mm === hmin);
  const pointMax = sorted.find(p => p.height_mm === hmax);
  
  if (!pointMin || !pointMax) {
    throw new Error(`Données de barémage manquantes pour hauteur ${hauteur}mm`);
  }
  
  return {
    hmin: pointMin.height_mm,
    hmax: pointMax.height_mm,
    vlmin: pointMin.capacity_l,
    vlmax: pointMax.capacity_l
  };
}

/**
 * Calcule le volume liquide en fonction de la hauteur
 * VOL = VLMIN + ((VLMAX - VLMIN) / (HMAX - HMIN)) * (HPS - HMIN)
 */
function calculateVolumeLiquide(
  hps: Decimal,
  hmin: Decimal,
  hmax: Decimal,
  vlmin: Decimal,
  vlmax: Decimal
): Decimal {
  if (hmax.equals(hmin)) {
    return vlmin;
  }
  return vlmin.plus(
    vlmax.minus(vlmin).dividedBy(hmax.minus(hmin)).times(hps.minus(hmin))
  );
}

/**
 * Calcule la densité en fonction de la température liquide
 * DENS = DMIN + ((DMAX - DMIN) / (TLMAX - TLMIN)) * (TLS - TLMIN)
 */
function calculateDensite(
  tls: Decimal,
  tlmin: Decimal,
  tlmax: Decimal,
  dmin: Decimal,
  dmax: Decimal
): Decimal {
  if (tlmax.equals(tlmin)) {
    return dmin;
  }
  return dmin.plus(
    dmax.minus(dmin).dividedBy(tlmax.minus(tlmin)).times(tls.minus(tlmin))
  );
}

/**
 * Calcule le poids spécifique en fonction de la température gazeuse
 * POS = (PSMIN + ((PSMAX - PSMIN) / (TGMAX - TGMIN)) * (TGS - TGMIN)) / 1000
 */
function calculatePoidsSpecifique(
  tgs: Decimal,
  tgmin: Decimal,
  tgmax: Decimal,
  psmin: Decimal,
  psmax: Decimal
): Decimal {
  if (tgmax.equals(tgmin)) {
    return psmin.dividedBy(1000);
  }
  return psmin.plus(
    psmax.minus(psmin).dividedBy(tgmax.minus(tgmin)).times(tgs.minus(tgmin))
  ).dividedBy(1000);
}

/**
 * Calcul complet pour une sphère
 */
export function calculateSphere(
  input: SphereInputData,
  calibrationData: CalibrationPoint[]
): SphereCalculationResult {
  // Conversion en Decimal pour précision maximale
  const hps = new Decimal(input.hauteur_mm);
  const tls = new Decimal(input.temperature_liquide_c);
  const tgs = new Decimal(input.temperature_gazeuse_c);
  const pressionSphereBarg = new Decimal(input.pression_sphere_barg);
  const d15 = new Decimal(input.densite_d15);
  
  const tlmin = new Decimal(input.tl_min);
  const tlmax = new Decimal(input.tl_max);
  const dmin = new Decimal(input.d_min);
  const dmax = new Decimal(input.d_max);
  
  const tgmin = new Decimal(input.tg_min);
  const tgmax = new Decimal(input.tg_max);
  const psmin = new Decimal(input.ps_min);
  const psmax = new Decimal(input.ps_max);
  
  // Trouver les points d'encadrement dans le barémage
  const bounds = findCalibrationBounds(
    calibrationData,
    input.hauteur_mm,
    input.sphere_number
  );
  
  const hmin = new Decimal(bounds.hmin);
  const hmax = new Decimal(bounds.hmax);
  const vlmin = new Decimal(bounds.vlmin);
  const vlmax = new Decimal(bounds.vlmax);
  
  // Calcul du volume liquide
  const volumeLiquide = calculateVolumeLiquide(hps, hmin, hmax, vlmin, vlmax);
  
  // Calcul du volume gazeux
  const capaciteStockage = new Decimal(CAPACITE_STOCKAGE_SPHERE);
  const volumeGazeux = capaciteStockage.minus(volumeLiquide);
  
  // Calcul de la densité
  const dens = calculateDensite(tls, tlmin, tlmax, dmin, dmax);
  
  // MV15 = D15 * 1000, divisé en PE (partie entière) et RE (reste)
  const mv15 = d15.times(1000);
  const pe = mv15.floor(); // Partie entière
  const re = mv15.minus(pe); // Reste
  
  // MVTL = (DENS + RE) / 1000
  const mvtl = dens.plus(re).dividedBy(1000);
  
  // POS = (PSMIN + ((PSMAX - PSMIN) / (TGMAX - TGMIN)) * (TGS - TGMIN)) / 1000
  const pos = calculatePoidsSpecifique(tgs, tgmin, tgmax, psmin, psmax);
  
  // MVAS = ARRONDI(POS, 7) - Masse Volumique Air Sec
  const mvas = pos.toDecimalPlaces(7);
  
  // Pression Absolue (Bar) = Pression sphere + 1.01325
  const pressionAbsolue = pressionSphereBarg.plus(1.01325);
  
  // MVBLTA = ARRONDI(MVTL, 4) - Masse Volumique Butane Liquide à T° Ambiante
  const mvblta = mvtl.toDecimalPlaces(4);
  
  // MASSE DU PRODUIT = ARRONDI(Volume Liquide * MVBLTA, 0)
  const masseProduit = volumeLiquide.times(mvblta);
  
  // MASSE TOTAL LIQUIDE = ARRONDI(Volume Liquide * MVBLTA, 0)
  const masseTotalLiquide = volumeLiquide.times(mvblta);
  const masseTotalLiquideKg = Math.round(masseTotalLiquide.toNumber());
  
  // MASSE TOTAL GAZ = ARRONDI(Volume Gazeux * MVAS * Densité Butane gazeux * Pression Absolue, 0)
  const masseTotalGaz = volumeGazeux
    .times(mvas)
    .times(DENSITE_BUTANE_GAZEUX_AIR_SEC)
    .times(pressionAbsolue);
  const masseTotalGazKg = Math.round(masseTotalGaz.toNumber());
  
  // MASSE LIQUIDE+GAZ = MASSE TOTAL LIQUIDE + MASSE TOTAL GAZ (valeurs arrondies)
  const masseLiquideGazKg = masseTotalLiquideKg + masseTotalGazKg;
  
  // CREUX = 1650000 - (MASSE LIQUIDE+GAZ) (valeur arrondie)
  const creuxKg = 1650000 - masseLiquideGazKg;
  
  return {
    niveau_produit_mm: hps.toNumber(),
    volume_liquide_l: Math.round(volumeLiquide.toNumber()),
    volume_gazeux_l: Math.round(volumeGazeux.toNumber()),
    temperature_c: tls.toNumber(),
    masse_volumique_butane_kgl: mvblta.toNumber(), // ARRONDI(MVTL, 4)
    masse_produit_kg: Math.round(masseProduit.toNumber()), // ARRONDI à 0 décimales
    masse_total_liquide_kg: masseTotalLiquideKg, // Déjà arrondi
    masse_total_gaz_kg: masseTotalGazKg, // Déjà arrondi
    masse_liquide_gaz_kg: masseLiquideGazKg, // Somme des valeurs arrondies
    creux_kg: creuxKg // Calculé avec valeurs arrondies
  };
}

export const formatNumberWithSpaces = (value: number): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
