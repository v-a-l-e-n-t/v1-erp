import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Package, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SigmaStock,
  StockClientType,
  CLIENT_LABELS,
  ALL_CLIENTS,
  getStockStatus,
  STOCK_STATUS_COLORS,
  STOCK_STATUS_TEXT_COLORS,
} from '@/types/stock';
import { getSigmaDashboardData } from '@/lib/stock';
import { formatNumber } from '@/lib/stockCalculations';
import SigmaConfigModal from './SigmaConfigModal';

const DEFAULT_THRESHOLD = 100;

export const SigmaDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<SigmaStock[]>([]);
  const [totalB6, setTotalB6] = useState(0);
  const [totalB12, setTotalB12] = useState(0);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSigmaDashboardData();
      setStocks(data.stocks);
      setTotalB6(data.totalB6);
      setTotalB12(data.totalB12);
    } catch (error) {
      console.error('Error loading SIGMA data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données SIGMA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getClientStock = (client: StockClientType, bottleType: 'B6' | 'B12') => {
    const stock = stocks.find(
      (s) => s.client === client && s.bottle_type === bottleType
    );
    return stock?.current_stock ?? 0;
  };

  const getClientThreshold = (client: StockClientType, bottleType: 'B6' | 'B12') => {
    const stock = stocks.find(
      (s) => s.client === client && s.bottle_type === bottleType
    );
    return stock?.alert_threshold ?? DEFAULT_THRESHOLD;
  };

  const renderStockIndicator = (value: number, threshold: number) => {
    const status = getStockStatus(value, threshold);
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${STOCK_STATUS_COLORS[status]}`} />
        <span className={`font-semibold ${STOCK_STATUS_TEXT_COLORS[status]}`}>
          {formatNumber(value)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Stock SIGMA</h2>
          <Badge variant="outline" className="ml-2">
            Total: {formatNumber(totalB6 + totalB12)} btl
          </Badge>
        </div>
        <Button onClick={() => setConfigModalOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurer Stock
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary font-medium">Total B6</span>
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(totalB6)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700 font-medium">Total B12</span>
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(totalB12)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ALL_CLIENTS.map((client) => {
          const b6Stock = getClientStock(client, 'B6');
          const b12Stock = getClientStock(client, 'B12');
          const b6Threshold = getClientThreshold(client, 'B6');
          const b12Threshold = getClientThreshold(client, 'B12');
          const hasStock = b6Stock > 0 || b12Stock > 0;

          return (
            <Card
              key={client}
              className={`transition-all ${
                hasStock ? 'border-l-4 border-l-primary' : 'opacity-60'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {CLIENT_LABELS[client]}
                  {!hasStock && (
                    <Badge variant="secondary" className="text-xs">
                      Non configuré
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">B6</span>
                    {renderStockIndicator(b6Stock, b6Threshold)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">B12</span>
                    {renderStockIndicator(b12Stock, b12Threshold)}
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">
                        {formatNumber(b6Stock + b12Stock)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Légende des indicateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Stock OK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm">Stock faible (&le; seuil)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Épuisé</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SigmaConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        stocks={stocks}
        onStockUpdated={loadData}
      />
    </div>
  );
};

export default SigmaDashboard;
