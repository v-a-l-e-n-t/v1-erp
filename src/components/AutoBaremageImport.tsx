import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export function AutoBaremageImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportComplete(false);
    
    try {
      toast.info('Lecture du fichier Excel...');
      
      // Lire le fichier Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      toast.info('Extraction des données...');
      
      // Extraire les données
      const calibrationData: Array<{ sphere_number: number; height_mm: number; capacity_l: number }> = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        
        const heightValue = row[0];
        const capacityValue = row[1];
        
        if (typeof heightValue === 'number' || (typeof heightValue === 'string' && heightValue.trim() !== '')) {
          let height: number;
          let capacity: number;
          
          // Parser la hauteur
          if (typeof heightValue === 'number') {
            height = heightValue;
          } else if (typeof heightValue === 'string') {
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

      console.log(`${calibrationData.length} entrées extraites`);
      
      if (calibrationData.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      setProgress({ current: 0, total: calibrationData.length });

      // Supprimer les anciennes données
      toast.info('Suppression des anciennes données...');
      const { error: deleteError } = await (supabase as any)
        .from('sphere_calibration')
        .delete()
        .eq('sphere_number', 1);

      if (deleteError && !deleteError.message.includes('no rows')) {
        console.error('Erreur suppression:', deleteError);
      }

      // Insérer par lots de 500
      const batchSize = 500;
      let inserted = 0;

      toast.info(`Import de ${calibrationData.length} entrées...`);

      for (let i = 0; i < calibrationData.length; i += batchSize) {
        const batch = calibrationData.slice(i, i + batchSize);
        
        const { error } = await (supabase as any)
          .from('sphere_calibration')
          .insert(batch);

        if (error) {
          console.error(`Erreur lot ${i / batchSize + 1}:`, error);
          throw error;
        }
        
        inserted += batch.length;
        setProgress({ current: inserted, total: calibrationData.length });
        console.log(`Progression: ${inserted}/${calibrationData.length}`);
      }

      setImportComplete(true);
      toast.success(`Import terminé! ${inserted} entrées importées avec succès`);
    } catch (error: any) {
      console.error('Erreur import:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
      setImportComplete(false);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {importComplete ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Upload className="h-5 w-5" />}
          Importer le barémage complet S1
        </CardTitle>
        <CardDescription>
          {importComplete 
            ? `Import terminé avec succès! ${progress.current} entrées importées`
            : 'Sélectionnez le fichier Excel bareme_S1.xlsx pour importer toutes les données'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!importComplete && (
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={isImporting}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
            {isImporting && progress.total > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Progression: {progress.current} / {progress.total} entrées
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {importComplete && (
          <Button onClick={() => { setImportComplete(false); setProgress({ current: 0, total: 0 }); }} variant="outline" className="w-full">
            Réimporter
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
