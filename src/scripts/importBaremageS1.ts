/**
 * Script pour importer les données de barémage de la Sphère 1 depuis le fichier Excel
 * À exécuter une seule fois pour peupler la base de données
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export async function importBaremageS1FromFile(file: File): Promise<void> {
  try {
    console.log('Lecture du fichier Excel...');
    
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    console.log('Parsing des données...');
    
    const calibrationData: Array<{ sphere_number: number; height_mm: number; capacity_l: number }> = [];
    
    // Parcourir les données (en ignorant les en-têtes)
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Ignorer les lignes d'en-tête et vides
      if (!row || row.length < 2) continue;
      
      const heightValue = row[0];
      const capacityValue = row[1];
      
      // Vérifier si c'est une ligne de données valide
      if (typeof heightValue === 'number' || (typeof heightValue === 'string' && heightValue.trim() !== '')) {
        let height: number;
        let capacity: number;
        
        // Parser la hauteur
        if (typeof heightValue === 'number') {
          height = heightValue;
        } else if (typeof heightValue === 'string') {
          // Gérer les cas comme "-" pour la hauteur 0
          if (heightValue.trim() === '-') {
            height = 0;
          } else {
            const parsed = parseFloat(heightValue.replace(/,/g, ''));
            if (isNaN(parsed)) continue;
            height = parsed;
          }
        } else {
          continue;
        }
        
        // Parser la capacité
        if (typeof capacityValue === 'number') {
          capacity = capacityValue;
        } else if (typeof capacityValue === 'string') {
          const parsed = parseFloat(capacityValue.replace(/,/g, ''));
          if (isNaN(parsed)) continue;
          capacity = parsed;
        } else {
          continue;
        }
        
        calibrationData.push({
          sphere_number: 1,
          height_mm: Math.floor(height),
          capacity_l: capacity
        });
      }
    }

    console.log(`${calibrationData.length} lignes de données parsées`);

    if (calibrationData.length === 0) {
      throw new Error('Aucune donnée valide trouvée dans le fichier');
    }

    // Insérer par lots de 1000 pour éviter les problèmes de taille de requête
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < calibrationData.length; i += batchSize) {
      const batch = calibrationData.slice(i, i + batchSize);
      
      const { error } = await (supabase as any)
        .from('sphere_calibration')
        .insert(batch);

      if (error) {
        // Si erreur de duplication, on continue
        if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
          throw error;
        }
      }
      
      inserted += batch.length;
      console.log(`${inserted}/${calibrationData.length} lignes insérées`);
    }

    console.log('Import terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    throw error;
  }
}
