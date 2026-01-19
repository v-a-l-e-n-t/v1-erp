import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { StockEntryTable } from './StockEntryTable';
import { StockMovement, StockCategory, StockClient, STOCK_CLIENT_LABELS, STOCK_CLIENT_ORDER } from '@/types/stock';
import { loadStockMovements, saveStockMovement, deleteStockMovement } from '@/utils/stockStorage';
import { useAudit } from '@/hooks/useAudit';

interface StockStoreViewProps {
    category: StockCategory;
}

export const StockStoreView = ({ category }: StockStoreViewProps) => {
    const [activeClient, setActiveClient] = useState<StockClient>('PI');
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const { logAction } = useAudit();

    const loadData = async () => {
        setLoading(true);
        const allMovements = await loadStockMovements();
        // Filtrer par catégorie et client
        const filtered = allMovements.filter(m =>
            m.category === category &&
            m.client === activeClient
        );
        setMovements(filtered);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [category, activeClient]);

    const handleAddMovement = async (movementData: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const result = await saveStockMovement(movementData);

            if (result.success && result.data) {
                await logAction({
                    table_name: 'stock_movements',
                    record_id: result.data.id,
                    action: 'CREATE',
                    details: movementData
                });
                await loadData();
            }
        } catch (error) {
            console.error("Failed to add movement", error);
        }
    };

    const handleDeleteMovement = async (id: string) => {
        const result = await deleteStockMovement(id);
        if (result.success) {
            await logAction({
                table_name: 'stock_movements',
                record_id: id,
                action: 'DELETE',
                details: {}
            });
            await loadData();
        }
    };

    return (
        <div className="space-y-4">
            {/* Onglets clients */}
            <Tabs value={activeClient || 'PI'} onValueChange={(v) => setActiveClient(v as StockClient)}>
                <TabsList className="bg-muted h-11 p-1 gap-1">
                    {STOCK_CLIENT_ORDER.map((key) => (
                        <TabsTrigger 
                            key={key} 
                            value={key} 
                            className="px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium"
                        >
                            {STOCK_CLIENT_LABELS[key]}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Tableau de saisie */}
            <Card className="border shadow-sm">
                <CardContent className="p-4">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Chargement...
                        </div>
                    ) : (
                        <StockEntryTable
                            category={category}
                            client={activeClient}
                            movements={movements}
                            onAddMovement={handleAddMovement}
                            onDeleteMovement={handleDeleteMovement}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
