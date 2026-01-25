import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DepotLubStock,
  StockClientType,
  BottleType,
  CLIENT_LABELS,
  CLIENT_COLORS,
  ALL_CLIENTS,
  ALL_BOTTLE_TYPES,
} from '@/types/stock';
import {
  incrementDepotLubStock,
  updateDepotLubStockThreshold,
  updateDepotLubStock,
  canReduceDepotLubStock,
} from '@/lib/stock';
import { formatNumber } from '@/lib/stockCalculations';

interface DepotLubConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stocks: DepotLubStock[];
  onStockUpdated: () => void;
}

interface ClientFormData {
  b6_increment: string;
  b12_increment: string;
  b6_threshold: string;
  b12_threshold: string;
}

type FormDataState = Record<StockClientType, ClientFormData>;

const DEFAULT_THRESHOLD = '100';

export const DepotLubConfigModal: React.FC<DepotLubConfigModalProps> = ({
  open,
  onOpenChange,
  stocks,
  onStockUpdated,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Initialize form data for all clients
  const getInitialFormData = (): FormDataState => {
    const initial: FormDataState = {} as FormDataState;
    ALL_CLIENTS.forEach((client) => {
      const b6Stock = stocks.find(s => s.client === client && s.bottle_type === 'B6');
      const b12Stock = stocks.find(s => s.client === client && s.bottle_type === 'B12');
      initial[client] = {
        b6_increment: '',
        b12_increment: '',
        b6_threshold: b6Stock?.alert_threshold?.toString() || DEFAULT_THRESHOLD,
        b12_threshold: b12Stock?.alert_threshold?.toString() || DEFAULT_THRESHOLD,
      };
    });
    return initial;
  };

  const [formData, setFormData] = useState<FormDataState>(getInitialFormData());

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
    }
  }, [open, stocks]);

  const getClientStock = (client: StockClientType, bottleType: BottleType): number => {
    const stock = stocks.find(s => s.client === client && s.bottle_type === bottleType);
    return stock?.current_stock ?? 0;
  };

  const handleFormChange = (
    client: StockClientType,
    field: keyof ClientFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [client]: {
        ...prev[client],
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const updates: Promise<void>[] = [];

      for (const client of ALL_CLIENTS) {
        const clientData = formData[client];

        // Handle B6 increment
        const b6Increment = parseInt(clientData.b6_increment, 10) || 0;
        const b12Increment = parseInt(clientData.b12_increment, 10) || 0;

        if (b6Increment > 0 || b12Increment > 0) {
          updates.push(incrementDepotLubStock(client, b6Increment, b12Increment));
        }

        // Handle threshold updates
        const b6Threshold = parseInt(clientData.b6_threshold, 10);
        const b12Threshold = parseInt(clientData.b12_threshold, 10);

        const currentB6Stock = stocks.find(s => s.client === client && s.bottle_type === 'B6');
        const currentB12Stock = stocks.find(s => s.client === client && s.bottle_type === 'B12');

        if (b6Threshold && b6Threshold !== (currentB6Stock?.alert_threshold ?? 100)) {
          updates.push(updateDepotLubStockThreshold(client, 'B6', b6Threshold));
        }

        if (b12Threshold && b12Threshold !== (currentB12Stock?.alert_threshold ?? 100)) {
          updates.push(updateDepotLubStockThreshold(client, 'B12', b12Threshold));
        }
      }

      if (updates.length === 0) {
        toast({
          title: 'Aucune modification',
          description: 'Aucune valeur à mettre à jour',
        });
        return;
      }

      await Promise.all(updates);

      toast({
        title: 'Stock Dépôt LUB mis à jour',
        description: 'Les modifications ont été enregistrées',
      });

      onStockUpdated();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Configuration Stock Dépôt LUB</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {ALL_CLIENTS.map((client) => {
            const colors = CLIENT_COLORS[client];
            const clientData = formData[client];
            const currentB6 = getClientStock(client, 'B6');
            const currentB12 = getClientStock(client, 'B12');

            return (
              <Card key={client} className={`${colors.bg} border-l-4 ${colors.border}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-lg ${colors.text}`}>
                    {CLIENT_LABELS[client]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* B6 Row */}
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">B6:</span>
                      <span className="text-sm text-muted-foreground">
                        Stock actuel: <strong>{formatNumber(currentB6)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Ajouter:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={clientData.b6_increment}
                        onChange={(e) => handleFormChange(client, 'b6_increment', e.target.value)}
                        className="w-24 h-8"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Seuil alerte:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={clientData.b6_threshold}
                        onChange={(e) => handleFormChange(client, 'b6_threshold', e.target.value)}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {clientData.b6_increment && parseInt(clientData.b6_increment, 10) > 0 && (
                        <span className="text-green-600">
                          = {formatNumber(currentB6 + parseInt(clientData.b6_increment, 10))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* B12 Row */}
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">B12:</span>
                      <span className="text-sm text-muted-foreground">
                        Stock actuel: <strong>{formatNumber(currentB12)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Ajouter:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={clientData.b12_increment}
                        onChange={(e) => handleFormChange(client, 'b12_increment', e.target.value)}
                        className="w-24 h-8"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Seuil alerte:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={clientData.b12_threshold}
                        onChange={(e) => handleFormChange(client, 'b12_threshold', e.target.value)}
                        className="w-24 h-8"
                      />
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {clientData.b12_increment && parseInt(clientData.b12_increment, 10) > 0 && (
                        <span className="text-green-600">
                          = {formatNumber(currentB12 + parseInt(clientData.b12_increment, 10))}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSaveAll} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DepotLubConfigModal;
