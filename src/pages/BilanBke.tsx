import { useState, useEffect } from 'react';
import BilanFormBke from '@/components/BilanFormBke';
import { BilanBkeEntry } from '@/types/balance-bke';
import { loadBkeEntries, saveBkeEntry, updateBkeEntry } from '@/utils/storage-bke';
import { calculateBilanBke, formatNumberValue, getNatureBadgeVariant } from '@/utils/calculations-bke';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Plus, List, Loader2 } from 'lucide-react';
import { useAudit } from "@/hooks/useAudit";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import PasswordGate from "@/components/PasswordGate";

const BilanBke = () => {
  const [entries, setEntries] = useState<BilanBkeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<BilanBkeEntry | null>(null);
  const [activeTab, setActiveTab] = useState('new');
  const { logAction } = useAudit();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Vérification de l'authentification (mêmes 3 accès que le dashboard)
  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Check Local Storage (LoginDialog - propriétaire)
      const localAuth = localStorage.getItem("isAuthenticated") === "true";

      // 3. Check Session Storage (PasswordGate)
      const sessionAuth = sessionStorage.getItem("dashboard_authenticated") === "true";

      const authorized = !!session || localAuth || sessionAuth;
      setIsAuthenticated(authorized);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const loaded = await loadBkeEntries();
      setEntries(loaded);
    } catch (error) {
      console.error('Error loading BKE entries:', error);
      toast.error('Erreur lors du chargement des données');
    }
    setLoading(false);
  };

  const handleSave = async (calculatedData: ReturnType<typeof calculateBilanBke>, entryId?: string) => {
    // 1. Get User for Audit
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Inconnu';

    if (entryId && editingEntry) {
      // Mode édition
      const updatedEntry: BilanBkeEntry = {
        ...editingEntry,
        ...calculatedData,
        last_modified_by: userEmail,
        last_modified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const success = await updateBkeEntry(updatedEntry);

      if (success) {
        // Audit Log
        await logAction({
          table_name: 'bilan_bke_entries',
          record_id: entryId,
          action: 'UPDATE',
          details: calculatedData
        });

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
      const newId = crypto.randomUUID();
      const newEntry: Omit<BilanBkeEntry, 'user_id'> = {
        id: newId,
        ...calculatedData,
        last_modified_by: userEmail,
        last_modified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const success = await saveBkeEntry(newEntry);

      if (success) {
        // Audit Log
        await logAction({
          table_name: 'bilan_bke_entries',
          record_id: newId,
          action: 'CREATE',
          details: calculatedData
        });

        toast.success('Bilan enregistré avec succès', {
          description: `Bilan ${calculatedData.nature} de ${formatNumberValue(calculatedData.bilan)} Kg`,
        });
        await loadData();
      } else {
        toast.error('Erreur lors de l\'enregistrement du bilan');
      }
    }
  };

  const handleEdit = (entry: BilanBkeEntry) => {
    setEditingEntry(entry);
    setActiveTab('edit');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setActiveTab('list');
  };

  // Vérifier si une entrée a des détails par client manquants
  const hasIncompleteClientDetails = (entry: BilanBkeEntry) => {
    // Pas de vrac à Bouaké

    const hasCondTotal = entry.sorties_conditionnees > 0;
    const hasCondDetails = (entry.sorties_conditionnees_petro_ivoire || 0) +
      (entry.sorties_conditionnees_vivo_energies || 0) +
      (entry.sorties_conditionnees_total_energies || 0) > 0;

    const hasFuyardesTotal = entry.fuyardes > 0;
    const hasFuyardesDetails = (entry.fuyardes_petro_ivoire || 0) +
      (entry.fuyardes_vivo_energies || 0) +
      (entry.fuyardes_total_energies || 0) > 0;

    return (hasCondTotal && !hasCondDetails) ||
      (hasFuyardesTotal && !hasFuyardesDetails);
  };

  // Afficher un loader pendant la vérification d'authentification
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Afficher le formulaire de mot de passe si non authentifié
  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Bilan Matière GPL - Bouaké</h1>
            <p className="text-sm text-muted-foreground mt-2">Gestion des bilans journaliers - Site de Bouaké</p>
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
            {editingEntry && (
              <TabsTrigger value="edit" className="gap-2">
                <Edit className="h-4 w-4" />
                Modifier
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="new">
            <BilanFormBke
              onSave={handleSave}
              previousEntry={entries[0]}
            />
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Bilans - Bouaké</CardTitle>
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
                          <TableHead className="text-right">Sorties Cond.</TableHead>
                          <TableHead className="text-right">Retour marché</TableHead>
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
                              <div className="flex justify-end gap-2 items-center">
                                <AuditHistoryDialog
                                  tableName="bilan_bke_entries"
                                  recordId={entry.id}
                                  recordTitle={`Bilan du ${format(new Date(entry.date), 'dd/MM/yyyy')}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
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
                <BilanFormBke
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
          <p>&copy; {new Date().getFullYear()} Bilan Matière GPL - Site de Bouaké</p>
        </div>
      </footer>
    </div>
  );
};

export default BilanBke;
