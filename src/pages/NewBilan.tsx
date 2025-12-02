import { useState, useEffect } from 'react';
import BilanForm from '@/components/BilanForm';
import { BilanEntriesImport } from '@/components/BilanEntriesImport';
import { BilanEntry } from '@/types/balance';
import { loadEntries, saveEntry, updateEntry } from '@/utils/storage';
import { calculateBilan, formatNumberValue, getNatureBadgeVariant } from '@/utils/calculations';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Plus, Upload, List } from 'lucide-react';

const NewBilan = () => {
  const [entries, setEntries] = useState<BilanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<BilanEntry | null>(null);
  const [activeTab, setActiveTab] = useState('new');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadEntries();
    setEntries(loaded);
    setLoading(false);
  };

  const handleSave = async (calculatedData: ReturnType<typeof calculateBilan>, entryId?: string) => {
    if (entryId && editingEntry) {
      // Mode édition
      const updatedEntry: BilanEntry = {
        ...editingEntry,
        ...calculatedData,
        updated_at: new Date().toISOString(),
      };
      const success = await updateEntry(updatedEntry);
      
      if (success) {
        toast.success('Bilan mis à jour avec succès', {
          description: `Bilan ${calculatedData.nature} de ${formatNumberValue(calculatedData.bilan)} Kg`,
        });
        setEditingEntry(null);
        setActiveTab('list');
        await loadData();
      } else {
        toast.error('Erreur lors de la mise à jour du bilan');
      }
    } else {
      // Nouveau bilan
      const newEntry: Omit<BilanEntry, 'user_id'> = {
        id: crypto.randomUUID(),
        ...calculatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const success = await saveEntry(newEntry);
      
      if (success) {
        toast.success('Bilan enregistré avec succès', {
          description: `Bilan ${calculatedData.nature} de ${formatNumberValue(calculatedData.bilan)} Kg`,
        });
        await loadData();
      } else {
        toast.error('Erreur lors de l\'enregistrement du bilan');
      }
    }
  };

  const handleEdit = (entry: BilanEntry) => {
    setEditingEntry(entry);
    setActiveTab('edit');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setActiveTab('list');
  };

  // Vérifier si une entrée a des détails par client manquants
  const hasIncompleteClientDetails = (entry: BilanEntry) => {
    const hasVracTotal = entry.sorties_vrac > 0;
    const hasVracDetails = (entry.sorties_vrac_simam || 0) + (entry.sorties_vrac_petro_ivoire || 0) + 
                          (entry.sorties_vrac_vivo_energies || 0) + (entry.sorties_vrac_total_energies || 0) > 0;
    
    const hasCondTotal = entry.sorties_conditionnees > 0;
    const hasCondDetails = (entry.sorties_conditionnees_petro_ivoire || 0) + 
                          (entry.sorties_conditionnees_vivo_energies || 0) + 
                          (entry.sorties_conditionnees_total_energies || 0) > 0;
    
    const hasFuyardesTotal = entry.fuyardes > 0;
    const hasFuyardesDetails = (entry.fuyardes_petro_ivoire || 0) + 
                              (entry.fuyardes_vivo_energies || 0) + 
                              (entry.fuyardes_total_energies || 0) > 0;
    
    return (hasVracTotal && !hasVracDetails) || 
           (hasCondTotal && !hasCondDetails) || 
           (hasFuyardesTotal && !hasFuyardesDetails);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Bilan Matière GPL</h1>
            <p className="text-sm text-muted-foreground mt-2">Gestion des bilans journaliers</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Bilan
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Historique ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </TabsTrigger>
            {editingEntry && (
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                Modifier
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="new">
            <BilanForm 
              onSave={handleSave} 
              previousEntry={entries[0]}
            />
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Bilans</CardTitle>
                <CardDescription>
                  Cliquez sur une entrée pour la modifier et compléter les détails par client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : entries.length === 0 ? (
                  <p className="text-muted-foreground">Aucun bilan enregistré</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Stock Initial</TableHead>
                          <TableHead className="text-right">Réceptions</TableHead>
                          <TableHead className="text-right">Sorties Vrac</TableHead>
                          <TableHead className="text-right">Sorties Cond.</TableHead>
                          <TableHead className="text-right">Fuyardes</TableHead>
                          <TableHead className="text-right">Stock Final</TableHead>
                          <TableHead className="text-right">Bilan</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.stock_initial)}</TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.reception_gpl)}</TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.sorties_vrac)}</TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.sorties_conditionnees)}</TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.fuyardes)}</TableCell>
                            <TableCell className="text-right">{formatNumberValue(entry.stock_final)}</TableCell>
                            <TableCell className="text-right">
                              <span className={entry.nature === 'Positif' ? 'text-green-600' : entry.nature === 'Négatif' ? 'text-red-600' : ''}>
                                {formatNumberValue(entry.bilan)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {hasIncompleteClientDetails(entry) ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  Incomplet
                                </Badge>
                              ) : (
                                <Badge variant={getNatureBadgeVariant(entry.nature)}>
                                  {entry.nature}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <BilanEntriesImport onImportComplete={loadData} />
          </TabsContent>

          {editingEntry && (
            <TabsContent value="edit">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Modification du bilan du {format(new Date(editingEntry.date), 'dd MMMM yyyy', { locale: fr })}
                  </h2>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Annuler
                  </Button>
                </div>
                <BilanForm 
                  onSave={handleSave} 
                  editEntry={editingEntry}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bilan Matière GPL</p>
        </div>
      </footer>
    </div>
  );
};

export default NewBilan;