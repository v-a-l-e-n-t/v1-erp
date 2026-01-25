import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Settings, Package, ArrowDownUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DepotLubStock,
  StockClientType,
  StockMovement,
  CLIENT_LABELS,
  ALL_CLIENTS,
  getStockStatus,
  STOCK_STATUS_COLORS,
  STOCK_STATUS_TEXT_COLORS,
  CLIENT_COLORS,
} from '@/types/stock';
import { getDepotLubDashboardData, getStockMovements } from '@/lib/stock';
import { formatNumber } from '@/lib/stockCalculations';
import DepotLubConfigModal from './DepotLubConfigModal';

const DEFAULT_THRESHOLD = 100;

export const DepotLubDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<DepotLubStock[]>([]);
  const [totalB6, setTotalB6] = useState(0);
  const [totalB12, setTotalB12] = useState(0);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [depotLubMovements, setDepotLubMovements] = useState<StockMovement[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardData, movementsData] = await Promise.all([
        getDepotLubDashboardData(),
        getStockMovements('bouteilles_neuves', 'petro_ivoire', { type: 'month', month: new Date() }, 50, 0),
      ]);
      setStocks(dashboardData.stocks);
      setTotalB6(dashboardData.totalB6);
      setTotalB12(dashboardData.totalB12);
      setDepotLubMovements(movementsData.movements.filter(m =>
        m.source_warehouse === 'depot_lub' || m.destination_warehouse === 'depot_lub'
      ));
    } catch (error) {
      console.error('Error loading Dépôt LUB data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données Dépôt LUB',
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

  const cumulTotal = totalB6 + totalB12;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Stock Dépôt LUB</h2>
        </div>
        <Button onClick={() => setConfigModalOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurer Stock
        </Button>
      </div>

      {/* Cumul Card - Prominent */}
      <Card className="bg-gradient-to-r from-primary/20 to-amber-100 border-2 border-primary">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <span className="text-sm text-muted-foreground font-medium">Cumul B6</span>
              <p className="text-3xl font-bold text-primary">{formatNumber(totalB6)}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <span className="text-sm text-muted-foreground font-medium">Cumul B12</span>
              <p className="text-3xl font-bold text-amber-600">{formatNumber(totalB12)}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <span className="text-sm font-semibold text-foreground">CUMUL TOTAL</span>
              <p className="text-4xl font-black text-foreground">{formatNumber(cumulTotal)}</p>
              <span className="text-xs text-muted-foreground">bouteilles</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Cards with specific colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ALL_CLIENTS.map((client) => {
          const b6Stock = getClientStock(client, 'B6');
          const b12Stock = getClientStock(client, 'B12');
          const b6Threshold = getClientThreshold(client, 'B6');
          const b12Threshold = getClientThreshold(client, 'B12');
          const hasStock = b6Stock > 0 || b12Stock > 0;
          const colors = CLIENT_COLORS[client];

          return (
            <Card
              key={client}
              className={`transition-all border-l-4 ${colors.border} ${
                !hasStock ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className={`pb-2 ${colors.bg}`}>
                <CardTitle className={`text-lg flex items-center justify-between ${colors.text}`}>
                  {CLIENT_LABELS[client]}
                  {!hasStock && (
                    <Badge variant="secondary" className="text-xs">
                      Non configuré
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
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
                      <span className={`font-semibold ${colors.text}`}>
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

      {/* Depot LUB Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowDownUp className="w-5 h-5" />
            Mouvements Dépôt LUB - Bouteilles Neuves
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">B6</TableHead>
                <TableHead className="text-right">B12</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depotLubMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun mouvement Dépôt LUB enregistré
                  </TableCell>
                </TableRow>
              ) : (
                depotLubMovements.slice(0, 10).map((movement) => {
                  const isEntry = movement.source_warehouse === 'depot_lub';
                  return (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {format(parseISO(movement.movement_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={CLIENT_COLORS[movement.client].text}>
                          {CLIENT_LABELS[movement.client]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isEntry ? 'default' : 'secondary'}>
                          {isEntry ? 'Entrée BN' : 'Sortie Dépôt LUB'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(movement.quantity_b6)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(movement.quantity_b12)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DepotLubConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        stocks={stocks}
        onStockUpdated={loadData}
      />
    </div>
  );
};

export default DepotLubDashboard;
