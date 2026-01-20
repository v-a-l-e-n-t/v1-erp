import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import {
    StockMovement,
    StockClient,
    BottleType,
    STOCK_CLIENT_ORDER,
    STOCK_CLIENT_LABELS,
    BOTTLE_TYPE_LABELS,
} from '@/types/stock';
import { loadStockMovements } from '@/utils/stockStorage';

interface SigmaStockIndicatorProps {
    refreshTrigger?: number;
}

interface StockByClientType {
    B6: number;
    B12: number;
}

export const SigmaStockIndicator = ({ refreshTrigger }: SigmaStockIndicatorProps) => {
    const [stocksByClient, setStocksByClient] = useState<Record<StockClient, StockByClientType>>({
        PI: { B6: 0, B12: 0 },
        TOTAL: { B6: 0, B12: 0 },
        VIVO: { B6: 0, B12: 0 }
    });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const allMovements = await loadStockMovements();
        
        // Filtrer les mouvements SIGMA
        const sigmaMovements = allMovements.filter(m => m.category === 'sigma');
        
        // Calculer le stock par client et type de bouteille
        const stocks: Record<StockClient, StockByClientType> = {
            PI: { B6: 0, B12: 0 },
            TOTAL: { B6: 0, B12: 0 },
            VIVO: { B6: 0, B12: 0 }
        };
        
        sigmaMovements.forEach(m => {
            if (!m.client) return;
            const client = m.client as StockClient;
            const bottleType = m.bottle_type as 'B6' | 'B12';
            
            if (bottleType !== 'B6' && bottleType !== 'B12') return;
            
            if (m.movement_type === 'entree') {
                stocks[client][bottleType] += m.quantity;
            } else if (m.movement_type === 'sortie') {
                stocks[client][bottleType] -= m.quantity;
            } else if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
                // Pour l'inventaire, on prend le stock réel comme nouvelle valeur
                stocks[client][bottleType] = m.stock_reel;
            }
        });
        
        setStocksByClient(stocks);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-4 mb-6">
                {STOCK_CLIENT_ORDER.map((client) => (
                    <Card key={client} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-5 bg-slate-200 rounded w-24"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-slate-200 rounded w-16"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            {STOCK_CLIENT_ORDER.map((client) => {
                const clientStock = stocksByClient[client];
                const totalStock = clientStock.B6 + clientStock.B12;
                const hasStock = totalStock > 0;

                return (
                    <Card 
                        key={client} 
                        className={`border-2 ${hasStock ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                {STOCK_CLIENT_LABELS[client]}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className={`text-2xl font-bold ${hasStock ? 'text-green-700' : 'text-muted-foreground'}`}>
                                    {totalStock.toLocaleString('fr-FR')}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">btles</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Badge 
                                        variant={clientStock.B6 > 0 ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        B6: {clientStock.B6.toLocaleString('fr-FR')}
                                    </Badge>
                                    <Badge 
                                        variant={clientStock.B12 > 0 ? 'default' : 'secondary'}
                                        className="text-xs"
                                    >
                                        B12: {clientStock.B12.toLocaleString('fr-FR')}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
