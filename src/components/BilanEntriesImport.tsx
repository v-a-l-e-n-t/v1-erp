import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BilanEntriesImportProps {
  onImportComplete?: () => void;
}

export function BilanEntriesImport({ onImportComplete }: BilanEntriesImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
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

      toast.info('Extraction des données...');
      
      const bilansData: any[] = [];
      
      // Liste des champs numériques
      const numericFields = [
        'stock_initial', 'reception_gpl', 'sorties_vrac', 'sorties_conditionnees', 
        'fuyardes', 'cumul_sorties', 'stock_theorique', 'stock_final', 'bilan',
        'spheres_initial', 'bouteilles_initial', 'reservoirs_initial',
        'spheres_final', 'bouteilles_final', 'reservoirs_final',
        // Nouveaux champs par client (peuvent être absents dans l'ancien CSV)
        'sorties_vrac_simam', 'sorties_vrac_petro_ivoire', 'sorties_vrac_vivo_energies', 'sorties_vrac_total_energies',
        'sorties_conditionnees_petro_ivoire', 'sorties_conditionnees_vivo_energies', 'sorties_conditionnees_total_energies',
        'fuyardes_petro_ivoire', 'fuyardes_vivo_energies', 'fuyardes_total_energies'
      ];
      
      for (const line of dataLines) {
        const values = parseCSVLine(line);
        if (values.length < headers.length) continue;
        
        const entry: any = {};
        
        // Initialiser tous les champs par client à 0 par défaut
        entry.sorties_vrac_simam = 0;
        entry.sorties_vrac_petro_ivoire = 0;
        entry.sorties_vrac_vivo_energies = 0;
        entry.sorties_vrac_total_energies = 0;
        entry.sorties_conditionnees_petro_ivoire = 0;
        entry.sorties_conditionnees_vivo_energies = 0;
        entry.sorties_conditionnees_total_energies = 0;
        entry.fuyardes_petro_ivoire = 0;
        entry.fuyardes_vivo_energies = 0;
        entry.fuyardes_total_energies = 0;
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          
          if (header === 'id' || header === 'user_id') {
            entry[header] = value || null;
          } else if (header === 'date') {
            entry[header] = value;
          } else if (header === 'receptions') {
            try {
              const parsedReceptions = value ? JSON.parse(value) : [];
              // Mapper l'ancien format (provenance) vers le nouveau format (navire, reception_no)
              entry[header] = parsedReceptions.map((r: any) => ({
                quantity: r.quantity || 0,
                navire: r.navire || r.provenance || '', // Si ancien format, provenance -> navire
                reception_no: r.reception_no || '' // reception_no à remplir manuellement
              }));
            } catch {
              entry[header] = [];
            }
          } else if (header === 'nature' || header === 'notes') {
            entry[header] = value || (header === 'nature' ? 'Neutre' : null);
          } else if (header === 'created_at' || header === 'updated_at') {
            entry[header] = value;
          } else if (numericFields.includes(header)) {
            entry[header] = value ? parseFloat(value) : 0;
          } else {
            entry[header] = value || null;
          }
        });
        
        bilansData.push(entry);
      }

      console.log(`${bilansData.length} entrées extraites`);
      
      if (bilansData.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      setProgress({ current: 0, total: bilansData.length });

      toast.info(`Import de ${bilansData.length} entrées...`);

      // Insérer par lots de 50
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < bilansData.length; i += batchSize) {
        const batch = bilansData.slice(i, i + batchSize);
        
        const { error } = await (supabase as any)
          .from('bilan_entries')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          console.error(`Erreur lot ${i / batchSize + 1}:`, error);
          throw error;
        }
        
        inserted += batch.length;
        setProgress({ current: inserted, total: bilansData.length });
        console.log(`Progression: ${inserted}/${bilansData.length}`);
      }

      setImportComplete(true);
      toast.success(`Import terminé! ${inserted} entrées importées avec succès`);
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
          {importComplete ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Upload className="h-5 w-5" />}
          Importer les bilans depuis CSV
        </CardTitle>
        <CardDescription>
          {importComplete 
            ? `Import terminé avec succès! ${progress.current} entrées importées`
            : 'Sélectionnez le fichier CSV contenant les données des bilans à importer'}
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
