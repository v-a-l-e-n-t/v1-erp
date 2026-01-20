import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import {
    SigmaStock,
    StockClient,
    STOCK_CLIENT_ORDER,
    STOCK_CLIENT_LABELS,
    BOTTLE_TYPE_LABELS,
} from '@/types/stock';
import { loadSigmaStocks } from '@/utils/stockStorage';

interface SigmaStockIndicatorProps {
    refreshTrigger?: number;
}

export const SigmaStockIndicator = ({ refreshTrigger }: SigmaStockIndicatorProps) => {
    const [stocks, setStocks] = useState<SigmaStock[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const data = await loadSigmaStocks();
        setStocks(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    // Grouper les stocks par client
    const stocksByClient = STOCK_CLIENT_ORDER.reduce((acc, client) => {
        acc[client] = stocks.filter(s => s.client === client);
        return acc;
    }, {} as Record<StockClient, SigmaStock[]>);

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
                const clientStocks = stocksByClient[client] || [];
                const totalStock = clientStocks.reduce((sum, s) => sum + s.current_stock, 0);
                const hasStock = clientStocks.length > 0;

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
                            {hasStock ? (
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold text-green-700">
                                        {totalStock.toLocaleString('fr-FR')}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">btles</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {clientStocks.map((s) => (
                                            <Badge 
                                                key={s.id} 
                                                variant={s.current_stock > 0 ? 'default' : 'destructive'}
                                                className="text-xs"
                                            >
                                                {BOTTLE_TYPE_LABELS[s.bottle_type]}: {s.current_stock.toLocaleString('fr-FR')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-orange-600 text-sm">
                                    Non configuré
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
