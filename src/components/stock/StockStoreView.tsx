import { useState, useEffect } from 'react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StockEntryTable } from './StockEntryTable';
import { StockMovement, StockCategory, StockClient, BottleType, BOTTLE_TYPE_LABELS } from '@/types/stock';
import { loadStockMovements, saveStockMovement, deleteStockMovement } from '@/utils/stockStorage';
import { useAudit } from '@/hooks/useAudit';

interface StockStoreViewProps {
    category: StockCategory;
}

export const StockStoreView = ({ category }: StockStoreViewProps) => {
    const [activeClient, setActiveClient] = useState<StockClient>('PI');
    const [activeBottleType, setActiveBottleType] = useState<BottleType>('B6');
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const { logAction } = useAudit();

    const loadData = async () => {
        setLoading(true);
        const allMovements = await loadStockMovements();
        // Filter by current category, client, AND bottle type
        const filtered = allMovements.filter(m =>
            m.category === category &&
            (activeClient ? m.client === activeClient : true) &&
            m.bottle_type === activeBottleType
        );
        setMovements(filtered);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [category, activeClient, activeBottleType]);

    const handleAddMovement = async (movementData: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newMovement: StockMovement = {
                ...movementData,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const result = await saveStockMovement(newMovement);

            if (result.success) {
                await logAction({
                    table_name: 'stock_movements',
                    record_id: newMovement.id,
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
        if (confirm('Supprimer ce mouvement ?')) {
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
        }
    };

    return (
        <div className="space-y-6">
            {/* Bottle Type Selector - Critical for Logic */}
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <span className="font-medium text-sm">Type de Bouteille :</span>
                <Select value={activeBottleType} onValueChange={(v) => setActiveBottleType(v as BottleType)}>
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(BOTTLE_TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Tabs value={activeClient || 'PI'} onValueChange={(v) => setActiveClient(v as StockClient)}>
                <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 gap-6">
                    <TabsTrigger
                        value="PI"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
                    >
                        Petro Ivoire
                    </TabsTrigger>
                    <TabsTrigger
                        value="TOTAL"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
                    >
                        Total Energies
                    </TabsTrigger>
                    <TabsTrigger
                        value="VIVO"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
                    >
                        VIVO Energy
                    </TabsTrigger>
                </TabsList>

                <Card className="mt-6 border-none shadow-none ring-1 ring-border">
                    <CardContent className="p-0">
                        <StockEntryTable
                            category={category}
                            client={activeClient}
                            bottleType={activeBottleType}
                            movements={movements}
                            onAddMovement={handleAddMovement}
                            onDeleteMovement={handleDeleteMovement}
                        />
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
};
