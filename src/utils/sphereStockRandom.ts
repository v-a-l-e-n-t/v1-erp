import {
  CAPACITE_VOLUMIQUE_L,
  type SphereId,
  type SphereInputStrings,
} from '@/utils/sphereStockCompute';

/**
 * Génère un jeu de données aléatoire mais physiquement cohérent
 * pour une sphère donnée. Utilisé par le bouton de debug Ctrl+Shift+Z.
 */
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function frFixed(n: number, d: number): string {
  return n
    .toLocaleString('fr-FR', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      useGrouping: false,
    })
    .replace(/[^0-9,-]/g, (c) => (c === ',' ? ',' : c));
}

export function buildRandomSphereInput(sphereId: SphereId): SphereInputStrings {
  // --- Densité produit à 15°C : ~0,57–0,59
  const densite15 = rand(0.572, 0.589);

  // --- Jauge : pourcentage de remplissage 5–95 % de la capacité
  // On utilise un "jauge max" raisonnable selon la sphère (~0–10 m).
  // Pour rester réaliste on choisit une jauge entre 1000 et 9800 mm.
  const jauge = Math.round(rand(1500, 9800));

  // Sphère 1 : pas de 1 mm. Sphères 2 et 3 : pas de 10 mm.
  const isS01 = sphereId === 'S01';
  const hMin = isS01 ? jauge : Math.floor(jauge / 10) * 10;
  const hMax = isS01 ? '' : jauge % 10 === 0 ? '' : Math.ceil(jauge / 10) * 10;

  // --- Volumes : on simule un barémage linéaire approximatif.
  // capacité_litre / hauteur_max_mm ~= L par mm de jauge.
  // Pour rester simple, on dit que la jauge max correspondant à 100% est ~10000mm.
  const litresPerMm = CAPACITE_VOLUMIQUE_L[sphereId] / 10000;
  const vMin = Math.round((typeof hMin === 'number' ? hMin : Number(hMin)) * litresPerMm);
  const vMax =
    hMax === ''
      ? '' // pas de borne max si la jauge tombe pile sur un palier
      : Math.round((Number(hMax)) * litresPerMm);

  // --- Températures : 18–30°C
  const tLiq = rand(18, 30);
  const tGaz = rand(18, 30);

  // Encadrement liquide (entier au-dessus / en-dessous)
  const tLiqInt = Number.isInteger(tLiq);
  const tLiqMin = tLiqInt ? Math.round(tLiq) : Math.floor(tLiq);
  const tLiqMax = tLiqInt ? '' : Math.ceil(tLiq);

  // Encadrement gaz (par pas de 0,5)
  const tGazRound = Math.round(tGaz * 2) / 2;
  const tGazIsHalf = Number.isInteger(tGaz * 2);
  const tGazMin = tGazIsHalf ? tGazRound : Math.floor(tGaz * 2) / 2;
  const tGazMax = tGazIsHalf ? '' : Math.ceil(tGaz * 2) / 2;

  // --- Densités butane liquide à T° : ~566–582 (kg/m³ × 1000 environ)
  // On encadre autour d'une valeur centrée selon T°.
  const dLiqCenter = 583 - (tLiq - 15) * 0.7;
  const dLiqMin = dLiqCenter + rand(-0.5, 0.5);
  const dLiqMax = dLiqMin - rand(0.7, 1.0); // décroît avec la T°

  // --- Densités air sec à T° : ~1,17–1,18 kg/m³ → en table ils sont en 10⁻⁴
  const dGazCenter = 1.1820 - (tGaz - 15) * 0.0006;
  const dGazMin = dGazCenter;
  const dGazMax = dGazMin - rand(0.0003, 0.0006);

  // --- Pression : 0,5 – 2,5 bar
  const pression = rand(0.6, 2.4);

  return {
    densite15: frFixed(densite15, 4),
    jauge: String(jauge),
    hMin: String(hMin),
    hMax: hMax === '' ? '' : String(hMax),
    vMin: String(vMin),
    vMax: vMax === '' ? '' : String(vMax),
    tLiq: frFixed(tLiq, 2),
    tLiqMin: String(tLiqMin),
    tLiqMax: tLiqMax === '' ? '' : String(tLiqMax),
    dLiqMin: frFixed(dLiqMin, 4),
    dLiqMax: frFixed(dLiqMax, 4),
    tGaz: frFixed(tGaz, 2),
    tGazMin: String(tGazMin),
    tGazMax: tGazMax === '' ? '' : String(tGazMax),
    dGazMin: frFixed(dGazMin, 4),
    dGazMax: frFixed(dGazMax, 4),
    pression: frFixed(pression, 3),
  };
}
