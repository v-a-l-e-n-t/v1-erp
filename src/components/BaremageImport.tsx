import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { importBaremageS1FromFile } from '@/scripts/importBaremageS1';

export function BaremageImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsImporting(true);
    try {
      await importBaremageS1FromFile(file);
      toast.success('Barémage importé avec succès!');
      setFile(null);
    } catch (error: any) {
      console.error('Erreur import:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importer le barémage S1
        </CardTitle>
        <CardDescription>
          Importer le fichier Excel contenant les données de barémage de la Sphère 1
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={isImporting}
        />
        <Button
          onClick={handleImport}
          disabled={!file || isImporting}
          className="w-full"
        >
          {isImporting ? 'Import en cours...' : 'Importer'}
        </Button>
      </CardContent>
    </Card>
  );
}
