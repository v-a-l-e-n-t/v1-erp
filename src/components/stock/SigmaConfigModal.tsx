import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SigmaStock,
  StockClientType,
  BottleType,
  CLIENT_LABELS,
  ALL_CLIENTS,
  ALL_BOTTLE_TYPES,
} from '@/types/stock';
import { updateDepotLubStock, canReduceDepotLubStock } from '@/lib/stock';
import { formatNumber } from '@/lib/stockCalculations';

interface SigmaConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stocks: SigmaStock[];
  onStockUpdated: () => void;
}

export const SigmaConfigModal: React.FC<SigmaConfigModalProps> = ({
  open,
  onOpenChange,
  stocks,
  onStockUpdated,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client: '' as StockClientType | '',
    bottle_type: '' as BottleType | '',
    quantity: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    stock: SigmaStock | null;
    error?: string;
  }>({ open: false, stock: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.bottle_type || !formData.quantity) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseInt(formData.quantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      toast({
        title: 'Erreur',
        description: 'La quantité doit être un nombre positif',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await updateDepotLubStock(
        formData.client as StockClientType,
        formData.bottle_type as BottleType,
        quantity
      );
      toast({
        title: 'Stock Dépôt LUB mis à jour',
        description: `${CLIENT_LABELS[formData.client as StockClientType]} - ${formData.bottle_type}: ${formatNumber(quantity)}`,
      });
      setFormData({ client: '', bottle_type: '', quantity: '' });
      onStockUpdated();
    } catch (error) {
      console.error('Error updating Dépôt LUB stock:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le stock Dépôt LUB',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (stock: SigmaStock) => {
    setLoading(true);
    try {
      const result = await canReduceDepotLubStock(stock.client, stock.bottle_type, 0);
      if (!result.can_reduce) {
        setDeleteConfirm({
          open: true,
          stock,
          error: `Impossible de supprimer: ${formatNumber(result.total_used || 0)} bouteilles sont utilisées dans les magasins.`,
        });
      } else {
        setDeleteConfirm({ open: true, stock: stock });
      }
    } catch (error) {
      console.error('Error checking stock:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier le stock',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.stock || deleteConfirm.error) {
      setDeleteConfirm({ open: false, stock: null });
      return;
    }

    setLoading(true);
    try {
      await updateDepotLubStock(
        deleteConfirm.stock.client,
        deleteConfirm.stock.bottle_type,
        0
      );
      toast({
        title: 'Stock Dépôt LUB supprimé',
        description: `${CLIENT_LABELS[deleteConfirm.stock.client]} - ${deleteConfirm.stock.bottle_type}`,
      });
      onStockUpdated();
    } catch (error) {
      console.error('Error deleting Dépôt LUB stock:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le stock Dépôt LUB',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteConfirm({ open: false, stock: null });
    }
  };

  const getStockForClientAndType = (client: StockClientType, bottleType: BottleType) => {
    const stock = stocks.find(s => s.client === client && s.bottle_type === bottleType);
    return stock?.current_stock ?? 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuration Stock Dépôt LUB</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={formData.client}
                  onValueChange={(value) =>
                    setFormData({ ...formData, client: value as StockClientType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CLIENTS.map((client) => (
                      <SelectItem key={client} value={client}>
                        {CLIENT_LABELS[client]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type Bouteille</Label>
                <Select
                  value={formData.bottle_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bottle_type: value as BottleType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_BOTTLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter / Mettre à jour
            </Button>
          </form>

          <div className="mt-6">
            <h4 className="font-medium mb-3">Stocks configurés</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">B6</TableHead>
                  <TableHead className="text-center">B12</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_CLIENTS.map((client) => {
                  const b6Stock = getStockForClientAndType(client, 'B6');
                  const b12Stock = getStockForClientAndType(client, 'B12');
                  const hasStock = b6Stock > 0 || b12Stock > 0;

                  if (!hasStock) return null;

                  return (
                    <TableRow key={client}>
                      <TableCell className="font-medium">
                        {CLIENT_LABELS[client]}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(b6Stock)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(b12Stock)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const stock = stocks.find(
                              (s) => s.client === client && s.bottle_type === 'B6'
                            );
                            if (stock) handleDeleteClick(stock);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {stocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucun stock configuré
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, stock: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteConfirm.error ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Suppression impossible
                </>
              ) : (
                'Confirmer la suppression'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.error ? (
                <span className="text-red-600">{deleteConfirm.error}</span>
              ) : (
                `Voulez-vous vraiment supprimer le stock Dépôt LUB pour ${
                  deleteConfirm.stock
                    ? CLIENT_LABELS[deleteConfirm.stock.client]
                    : ''
                } ?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {!deleteConfirm.error && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SigmaConfigModal;
