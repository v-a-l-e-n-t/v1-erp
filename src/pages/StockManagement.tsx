import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockMovementForm from '@/components/StockMovementForm';
import { StockMovement } from '@/types/stock';
import { saveStockMovement, loadStockMovements, deleteStockMovement, updateStockMovement } from '@/utils/stockStorage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Edit, Trash2, List, Package, History } from 'lucide-react';
import { toast } from 'sonner';
import { useAudit } from '@/hooks/useAudit';
import { AuditHistoryDialog } from '@/components/AuditHistoryDialog';
import {
  STOCK_CATEGORY_LABELS,
  STOCK_SITE_LABELS,
  MOVEMENT_TYPE_LABELS,
  BOTTLE_TYPE_LABELS,
  STOCK_CLIENT_LABELS
} from '@/types/stock';

const StockManagement = () => {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [activeTab, setActiveTab] = useState('new');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { logAction } = useAudit();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadStockMovements();
    setMovements(loaded);
    setLoading(false);
  };

  const handleSave = async (movement: StockMovement) => {
    try {
      if (editingMovement) {
        // Mode édition
        const result = await updateStockMovement(editingMovement.id, movement);
        if (result.success && result.data) {
          await logAction({
            table_name: 'stock_movements',
            record_id: editingMovement.id,
            action: 'UPDATE',
            details: movement
          });
          toast.success('Mouvement mis à jour avec succès');
          setEditingMovement(null);
          setIsFormDialogOpen(false);
          setActiveTab('list');
          await loadData();
        } else {
          toast.error(result.error || 'Erreur lors de la mise à jour');
        }
      } else {
        // Nouveau mouvement
        const result = await saveStockMovement(movement);
        if (result.success && result.data) {
          await logAction({
            table_name: 'stock_movements',
            record_id: result.data.id,
            action: 'CREATE',
            details: movement
          });
          toast.success('Mouvement enregistré avec succès');
          setIsFormDialogOpen(false);
          await loadData();
        } else {
          toast.error(result.error || 'Erreur lors de l\'enregistrement');
        }
      }
    } catch (error: any) {
      console.error('Error saving movement:', error);
      toast.error('Erreur lors de l\'enregistrement du mouvement');
    }
  };

  const handleEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    setIsFormDialogOpen(true);
    setActiveTab('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      return;
    }

    const result = await deleteStockMovement(id);
    if (result.success) {
      await logAction({
        table_name: 'stock_movements',
        record_id: id,
        action: 'DELETE',
        details: {}
      });
      toast.success('Mouvement supprimé');
      await loadData();
    } else {
      toast.error(result.error || 'Erreur lors de la suppression');
    }
  };

  const handleCancelEdit = () => {
    setEditingMovement(null);
    setIsFormDialogOpen(false);
    setActiveTab('list');
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      entree: 'default',
      sortie: 'destructive',
      inventaire: 'secondary',
      transfert: 'outline'
    };
    return (
      <Badge variant={variants[type] || 'outline'}>
        {MOVEMENT_TYPE_LABELS[type as keyof typeof MOVEMENT_TYPE_LABELS]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Gestion de Stock</h1>
              <p className="text-sm text-muted-foreground mt-2">Gestion des mouvements de bouteilles GPL</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Retour au Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Mouvement
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Historique ({movements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Nouveau mouvement de stock</CardTitle>
                <CardDescription>
                  Enregistrez un nouveau mouvement (entrée, sortie, inventaire ou transfert)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StockMovementForm
                  onSave={handleSave}
                  onCancel={() => setActiveTab('list')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Historique des mouvements</CardTitle>
                <CardDescription>
                  Consultez et gérez tous les mouvements de stock enregistrés
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : movements.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun mouvement enregistré</p>
                    <Button
                      className="mt-4"
                      onClick={() => setActiveTab('new')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Créer le premier mouvement
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Catégorie</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Bouteille</TableHead>
                          <TableHead className="text-right">Quantité</TableHead>
                          <TableHead>Mouvement</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-medium">
                              {format(new Date(movement.date), 'dd/MM/yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              {STOCK_CATEGORY_LABELS[movement.category]}
                            </TableCell>
                            <TableCell>
                              {STOCK_SITE_LABELS[movement.site]}
                            </TableCell>
                            <TableCell>
                              {BOTTLE_TYPE_LABELS[movement.bottle_type]}
                            </TableCell>
                            <TableCell className="text-right">
                              {movement.quantity.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              {getMovementTypeBadge(movement.movement_type)}
                            </TableCell>
                            <TableCell>
                              {movement.client ? STOCK_CLIENT_LABELS[movement.client] : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2 items-center">
                                <AuditHistoryDialog
                                  tableName="stock_movements"
                                  recordId={movement.id}
                                  recordTitle={`Mouvement du ${format(new Date(movement.date), 'dd/MM/yyyy')}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(movement)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(movement.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
        </Tabs>
      </main>

      {/* Dialog pour l'édition */}
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCancelEdit();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMovement ? 'Modifier le mouvement' : 'Nouveau mouvement'}
            </DialogTitle>
          </DialogHeader>
          <StockMovementForm
            onSave={handleSave}
            editMovement={editingMovement || undefined}
            onCancel={handleCancelEdit}
          />
        </DialogContent>
      </Dialog>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Gestion de Stock GPL</p>
        </div>
      </footer>
    </div>
  );
};

export default StockManagement;
