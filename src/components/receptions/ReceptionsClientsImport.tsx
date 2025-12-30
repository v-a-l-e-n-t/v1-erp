import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReceptionsClientsImportProps {
  onImportComplete?: () => void;
}

// Mapping des noms de clients du CSV vers les noms normalisés
const CLIENT_MAPPING: Record<string, string> = {
  "TOTALENERGIES MARKETING COTE D'IVOIRE": "TOTAL_ENERGIES",
  "PETRO IVOIRE": "PETRO_IVOIRE",
  "VIVO ENERGY CÔTE D'IVOIRE": "VIVO_ENERGIES"
};

export function ReceptionsClientsImport({ onImportComplete }: ReceptionsClientsImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Parser CSV avec séparateur virgule
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Convertir date DD/MM/YYYY vers YYYY-MM-DD
  const parseDate = (dateStr: string): string | null => {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Convertir poids (enlever les espaces et convertir en nombre)
  const parsePoids = (poidsStr: string): number => {
    const cleaned = poidsStr.replace(/\s/g, ''); // Enlever les espaces
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Normaliser le nom du client
  const normalizeClient = (client: string): string => {
    const trimmed = client.trim();
    return CLIENT_MAPPING[trimmed] || trimmed;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportComplete(false);
    
    try {
      toast.info('Lecture du fichier CSV...');
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Fichier CSV vide ou invalide');
      }

      const headers = parseCSVLine(lines[0]);
      const dataLines = lines.slice(1);

      // Vérifier les colonnes attendues
      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
      const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'));
      const poidsIndex = headers.findIndex(h => h.toLowerCase().includes('poids'));

      if (dateIndex === -1 || clientIndex === -1 || poidsIndex === -1) {
        throw new Error('Colonnes manquantes. Attendu: Date, Client, Poids reçu');
      }

      toast.info('Extraction des données...');
      
      const receptionsData: Array<{
        date: string;
        client: string;
        poids_kg: number;
      }> = [];
      
      let skippedCount = 0;
      
      for (const line of dataLines) {
        const values = parseCSVLine(line);
        if (values.length < headers.length) continue;
        
        const dateStr = values[dateIndex]?.trim();
        const clientStr = values[clientIndex]?.trim();
        const poidsStr = values[poidsIndex]?.trim();

        if (!dateStr || !clientStr || !poidsStr) {
          skippedCount++;
          continue;
        }

        const date = parseDate(dateStr);
        if (!date) {
          skippedCount++;
          continue;
        }

        const poids = parsePoids(poidsStr);
        if (poids <= 0) {
          skippedCount++;
          continue;
        }

        const client = normalizeClient(clientStr);

        receptionsData.push({
          date,
          client,
          poids_kg: poids
        });
      }

      console.log(`${receptionsData.length} réceptions extraites, ${skippedCount} lignes ignorées`);
      
      if (receptionsData.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      setProgress({ current: 0, total: receptionsData.length });

      toast.info(`Import de ${receptionsData.length} réceptions...`);

      // Insérer par lots de 100
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < receptionsData.length; i += batchSize) {
        const batch = receptionsData.slice(i, i + batchSize);
        
        const { error } = await (supabase as any)
          .from('receptions_clients')
          .insert(batch);

        if (error) {
          console.error(`Erreur lot ${i / batchSize + 1}:`, error);
          throw error;
        }
        
        inserted += batch.length;
        setProgress({ current: inserted, total: receptionsData.length });
        console.log(`Progression: ${inserted}/${receptionsData.length}`);
      }

      setImportComplete(true);
      toast.success(`Import terminé! ${inserted} réceptions importées avec succès`);
      if (skippedCount > 0) {
        toast.warning(`${skippedCount} lignes ont été ignorées (données invalides)`);
      }
      onImportComplete?.();
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
          {importComplete ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Upload className="h-5 w-5" />}
          Importer les réceptions depuis CSV
        </CardTitle>
        <CardDescription>
          {importComplete 
            ? `Import terminé avec succès! ${progress.current} réceptions importées`
            : 'Sélectionnez le fichier CSV (Date, Client, Poids reçu) à importer'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!importComplete && (
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={isImporting}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
            {isImporting && progress.total > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Progression: {progress.current} / {progress.total} réceptions
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
