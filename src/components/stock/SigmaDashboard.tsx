import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Package, TrendingDown, ArrowRight, Settings, RefreshCw } from 'lucide-react';
import {
    SigmaStock,
    StockMovement,
    StockClient,
    STOCK_CLIENT_ORDER,
    STOCK_CLIENT_LABELS,
    BOTTLE_TYPE_LABELS,
    STOCK_CATEGORY_LABELS,
    MOVEMENT_TYPE_LABELS,
} from '@/types/stock';
import { loadSigmaStocks, loadStockMovements } from '@/utils/stockStorage';
import { SigmaStockConfigModal } from './SigmaStockConfigModal';

export const SigmaDashboard = () => {
    const [stocks, setStocks] = useState<SigmaStock[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [filterClient, setFilterClient] = useState<StockClient | 'all'>('all');

    const loadData = async () => {
        setLoading(true);
        const [sigmaStocks, allMovements] = await Promise.all([
            loadSigmaStocks(),
            loadStockMovements()
        ]);
        setStocks(sigmaStocks);
        
        // Filtrer les mouvements d'entrée dans les autres magasins (= sorties de SIGMA)
        // Ce sont les mouvements qui consomment le stock SIGMA
        const sigmaRelatedMovements = allMovements.filter(m => 
            m.movement_type === 'entree' && m.category !== 'sigma'
        );
        setMovements(sigmaRelatedMovements);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Grouper les stocks par client
    const stocksByClient = STOCK_CLIENT_ORDER.reduce((acc, client) => {
        acc[client] = stocks.filter(s => s.client === client);
        return acc;
    }, {} as Record<StockClient, SigmaStock[]>);

    // Filtrer les mouvements par client si nécessaire
    const filteredMovements = filterClient === 'all' 
        ? movements 
        : movements.filter(m => m.client === filterClient);

    // Trier par date décroissante
    const sortedMovements = [...filteredMovements].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculer les totaux de sorties par magasin
    const sortiesByCategory = movements.reduce((acc, m) => {
        if (!acc[m.category]) {
            acc[m.category] = { B6: 0, B12: 0 };
        }
        if (m.bottle_type === 'B6') {
            acc[m.category].B6 += m.quantity;
        } else if (m.bottle_type === 'B12') {
            acc[m.category].B12 += m.quantity;
        }
        return acc;
    }, {} as Record<string, { B6: number; B12: number }>);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-2">
                                <div className="h-5 bg-slate-200 rounded w-24"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-12 bg-slate-200 rounded"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête avec bouton config */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Tableau de bord SIGMA</h2>
                    <p className="text-sm text-muted-foreground">
                        Suivi du stock source et traçabilité des distributions
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadData}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Actualiser
                    </Button>
                    <Button onClick={() => setConfigModalOpen(true)}>
                        <Settings className="h-4 w-4 mr-1" />
                        Configurer Stock
                    </Button>
                </div>
            </div>

            {/* Cartes de stock par client */}
            <div className="grid grid-cols-3 gap-4">
                {STOCK_CLIENT_ORDER.map((client) => {
                    const clientStocks = stocksByClient[client] || [];
                    const b6Stock = clientStocks.find(s => s.bottle_type === 'B6');
                    const b12Stock = clientStocks.find(s => s.bottle_type === 'B12');
                    const totalInitial = clientStocks.reduce((sum, s) => sum + s.initial_stock, 0);
                    const totalCurrent = clientStocks.reduce((sum, s) => sum + s.current_stock, 0);
                    const hasStock = clientStocks.length > 0;

                    return (
                        <Card 
                            key={client} 
                            className={`border-2 ${hasStock ? 'border-blue-200' : 'border-orange-200 bg-orange-50/30'}`}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {STOCK_CLIENT_LABELS[client]}
                                    </span>
                                    {hasStock && (
                                        <Badge variant={totalCurrent > 0 ? 'default' : 'destructive'}>
                                            {totalCurrent > 0 ? 'Disponible' : 'Épuisé'}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {hasStock ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-slate-50 p-2 rounded">
                                                <div className="text-xs text-muted-foreground">B6</div>
                                                <div className="font-bold text-lg">
                                                    {b6Stock?.current_stock?.toLocaleString('fr-FR') || 0}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    / {b6Stock?.initial_stock?.toLocaleString('fr-FR') || 0} initial
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded">
                                                <div className="text-xs text-muted-foreground">B12</div>
                                                <div className="font-bold text-lg">
                                                    {b12Stock?.current_stock?.toLocaleString('fr-FR') || 0}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    / {b12Stock?.initial_stock?.toLocaleString('fr-FR') || 0} initial
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                                            <span>Total distribué:</span>
                                            <span className="font-medium text-red-600">
                                                -{(totalInitial - totalCurrent).toLocaleString('fr-FR')} btles
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-orange-600 text-sm font-medium">Non configuré</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Cliquez sur "Configurer Stock" pour définir le stock initial
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Résumé des distributions par magasin */}
            {Object.keys(sortiesByCategory).length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Distributions par magasin
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(sortiesByCategory).map(([category, totals]) => (
                                <div key={category} className="bg-slate-50 px-3 py-2 rounded-lg border">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        {STOCK_CATEGORY_LABELS[category as keyof typeof STOCK_CATEGORY_LABELS] || category}
                                    </div>
                                    <div className="flex gap-2">
                                        {totals.B6 > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                B6: {totals.B6.toLocaleString('fr-FR')}
                                            </Badge>
                                        )}
                                        {totals.B12 > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                                B12: {totals.B12.toLocaleString('fr-FR')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Historique des mouvements */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Historique des sorties SIGMA
                        </CardTitle>
                        <Select 
                            value={filterClient} 
                            onValueChange={(v) => setFilterClient(v as StockClient | 'all')}
                        >
                            <SelectTrigger className="w-[180px] h-8">
                                <SelectValue placeholder="Filtrer par client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les clients</SelectItem>
                                {STOCK_CLIENT_ORDER.map((c) => (
                                    <SelectItem key={c} value={c}>{STOCK_CLIENT_LABELS[c]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {sortedMovements.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Aucun mouvement enregistré
                        </div>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Date</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Quantité</TableHead>
                                        <TableHead>N° Bon</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedMovements.slice(0, 50).map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-mono text-xs">
                                                {new Date(m.date).toLocaleDateString('fr-FR')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {m.client ? STOCK_CLIENT_LABELS[m.client] : '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {STOCK_CATEGORY_LABELS[m.category]}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {BOTTLE_TYPE_LABELS[m.bottle_type]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-red-600 font-semibold">
                                                -{m.quantity.toLocaleString('fr-FR')}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {m.bon_numero || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {sortedMovements.length > 50 && (
                                <div className="text-center py-2 text-xs text-muted-foreground">
                                    Affichage des 50 derniers mouvements sur {sortedMovements.length}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de configuration */}
            <SigmaStockConfigModal 
                open={configModalOpen} 
                onOpenChange={(open) => {
                    setConfigModalOpen(open);
                    if (!open) loadData(); // Recharger après fermeture
                }} 
            />
        </div>
    );
};
