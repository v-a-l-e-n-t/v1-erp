/**
 * Script pour extraire et préparer les données de barémage depuis le fichier parsé
 */

import { supabase } from '@/integrations/supabase/client';

// Données extraites du fichier Excel (hauteur 0-18184mm)
const baremageData = `
0,2706.3
1,2724.1
2,2742.0
3,2759.8
4,2777.6
5,2795.4
6,2813.3
7,2831.1
8,2848.9
9,2866.7
10,2884.6
`;
// ... (Les données complètes seraient ici, mais c'est trop long pour un fichier TypeScript)

/**
 * Fonction pour importer les données de barémage depuis le document parsé
 */
export async function importBaremageFromParsedDocument(documentContent: string): Promise<void> {
  console.log('Extraction des données...');
  
  const lines = documentContent.split('\n');
  const calibrationData: Array<{ sphere_number: number; height_mm: number; capacity_l: number }> = [];
  
  for (const line of lines) {
    // Format: |hauteur|capacité|
    const match = line.match(/\|([\d,]+)\|([\d,]+\.?\d*)\|/);
    if (match) {
      const heightStr = match[1].replace(/,/g, '');
      const capacityStr = match[2].replace(/,/g, '');
      
      const height = parseFloat(heightStr);
      const capacity = parseFloat(capacityStr);
      
      if (!isNaN(height) && !isNaN(capacity)) {
        calibrationData.push({
          sphere_number: 1,
          height_mm: Math.floor(height),
          capacity_l: capacity
        });
      }
    }
    // Cas spécial pour hauteur 0 (ligne avec "|-|")
    else if (line.includes('|-|')) {
      const capacityMatch = line.match(/\|-\|([\d,]+\.?\d*)\|/);
      if (capacityMatch) {
        const capacity = parseFloat(capacityMatch[1].replace(/,/g, ''));
        if (!isNaN(capacity)) {
          calibrationData.push({
            sphere_number: 1,
            height_mm: 0,
            capacity_l: capacity
          });
        }
      }
    }
  }
  
  console.log(`${calibrationData.length} entrées extraites`);
  
  if (calibrationData.length === 0) {
    throw new Error('Aucune donnée valide trouvée dans le document');
  }
  
  // Supprimer les anciennes données
  console.log('Suppression des anciennes données...');
    const { error: deleteError } = await (supabase as any)
      .from('sphere_calibration')
      .delete()
      .eq('sphere_number', 1);
  
  if (deleteError) {
    console.error('Erreur lors de la suppression:', deleteError);
  }
  
  // Insérer par lots de 500
  const batchSize = 500;
  let inserted = 0;
  
  for (let i = 0; i < calibrationData.length; i += batchSize) {
    const batch = calibrationData.slice(i, i + batchSize);
    
    console.log(`Import du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(calibrationData.length / batchSize)}...`);
    
      const { error } = await (supabase as any)
        .from('sphere_calibration')
        .insert(batch);
    
    if (error) {
      console.error(`Erreur lors de l'insertion du lot ${i / batchSize + 1}:`, error);
      throw error;
    }
    
    inserted += batch.length;
    console.log(`Progression: ${inserted}/${calibrationData.length}`);
  }
  
  console.log(`Import terminé avec succès! ${inserted} entrées importées.`);
}
