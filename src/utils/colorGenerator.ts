// Generate distinct colors dynamically using HSL color wheel
// Golden ratio used for optimal hue distribution

const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

// Predefined colors for known clients (important to keep consistent)
export const CLIENT_COLORS: Record<string, string> = {
  'TOTAL ENERGIES': '#ef4444',
  'PETRO IVOIRE': '#f97316',
  'VIVO ENERGIES': '#10b981',
};

// Generate a visually distinct color based on index
export function generateColor(index: number, saturation = 70, lightness = 55): string {
  // Use golden ratio for optimal distribution
  const hue = ((index * GOLDEN_RATIO_CONJUGATE) % 1) * 360;
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

// Generate colors for a list of items, sorted by importance (e.g., tonnage)
export function generateColorMap<T extends { id: string; value: number }>(
  items: T[]
): Map<string, string> {
  const colorMap = new Map<string, string>();
  
  // Sort by value descending - most active get most distinct colors
  const sortedItems = [...items].sort((a, b) => b.value - a.value);
  
  sortedItems.forEach((item, index) => {
    colorMap.set(item.id, generateColor(index));
  });
  
  return colorMap;
}

// Convert HSL string to hex for Mapbox
export function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#f97316'; // fallback orange
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert hex to RGB object for gradients
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 249, g: 115, b: 22 }; // fallback orange
}
