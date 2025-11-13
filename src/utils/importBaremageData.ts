/**
 * Fonction utilitaire pour importer les données de barémage depuis le fichier parsé
 */

export interface BaremageDataRow {
  height: string;
  capacity: string;
}

/**
 * Parse le contenu du document pour extraire les données de barémage
 */
export function parseBaremageDocument(content: string): BaremageDataRow[] {
  const lines = content.split('\n');
  const data: BaremageDataRow[] = [];
  
  for (const line of lines) {
    // Chercher les lignes au format |hauteur|capacité|
    const match = line.match(/\|(\d+[\d,]*)\|([\d,]+\.?\d*)\|/);
    if (match) {
      const height = match[1].replace(/,/g, '');
      const capacity = match[2];
      data.push({ height, capacity });
    }
    // Gérer aussi le cas de la ligne 0 avec "-"
    else if (line.includes('|-|')) {
      const capacityMatch = line.match(/\|-\|([\d,]+\.?\d*)\|/);
      if (capacityMatch) {
        data.push({ height: '0', capacity: capacityMatch[1] });
      }
    }
  }
  
  return data;
}

/**
 * Appelle l'edge function pour importer les données
 */
export async function importBaremageToDatabase(data: BaremageDataRow[]): Promise<{ success: boolean; message: string; imported?: number }> {
  try {
    const response = await fetch('/functions/v1/import-baremage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Import error:', error);
    return {
      success: false,
      message: error.message || 'Une erreur est survenue lors de l\'import'
    };
  }
}
