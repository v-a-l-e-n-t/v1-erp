import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { StockEntryTable } from './StockEntryTable';
import { SigmaStockIndicator } from './SigmaStockIndicator';
import { StockMovement, StockCategory, StockClient, STOCK_CLIENT_LABELS, STOCK_CLIENT_ORDER, STOCK_CATEGORY_LABELS } from '@/types/stock';
import { loadStockMovements, saveStockMovement, deleteStockMovement, getLinkedMovement, decrementSigmaStock } from '@/utils/stockStorage';
import { useAudit } from '@/hooks/useAudit';
import { toast } from 'sonner';

interface StockStoreViewProps {
    category: StockCategory;
}

export const StockStoreView = ({ category }: StockStoreViewProps) => {
    const [activeClient, setActiveClient] = useState<StockClient>('PI');
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const { logAction } = useAudit();

    // État pour le dialogue de suppression
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [movementToDelete, setMovementToDelete] = useState<string | null>(null);
    const [linkedMovement, setLinkedMovement] = useState<StockMovement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
                // Décrémenter le stock SIGMA pour les entrées dans Bouteilles Neuves uniquement
                if (movementData.movement_type === 'entree' && category === 'bouteilles_neuves' && movementData.client) {
                    await decrementSigmaStock(
                        movementData.client,
                        movementData.bottle_type,
                        movementData.quantity
                    );
                }

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

    // Ouvrir le dialogue de confirmation de suppression
    const handleDeleteMovement = async (id: string) => {
        setMovementToDelete(id);
        // Vérifier s'il y a un mouvement lié
        const linked = await getLinkedMovement(id);
        setLinkedMovement(linked);
        setDeleteDialogOpen(true);
    };

    // Supprimer uniquement le mouvement sélectionné (sans cascade)
    const handleDeleteSingle = async () => {
        if (!movementToDelete) return;
        
        setIsDeleting(true);
        try {
            const result = await deleteStockMovement(movementToDelete, false);
            if (result.success) {
                await logAction({
                    table_name: 'stock_movements',
                    record_id: movementToDelete,
                    action: 'DELETE',
                    details: { cascade: false }
                });
                toast.success('Mouvement supprimé');
                await loadData();
            }
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la suppression');
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setMovementToDelete(null);
            setLinkedMovement(null);
        }
    };

    // Supprimer le mouvement et son mouvement lié (cascade)
    const handleDeleteBoth = async () => {
        if (!movementToDelete) return;
        
        setIsDeleting(true);
        try {
            const result = await deleteStockMovement(movementToDelete, true);
            if (result.success) {
                await logAction({
                    table_name: 'stock_movements',
                    record_id: movementToDelete,
                    action: 'DELETE',
                    details: { cascade: true, deletedLinked: result.deletedLinked }
                });
                toast.success(result.deletedLinked ? 'Les 2 mouvements ont été supprimés' : 'Mouvement supprimé');
                await loadData();
            }
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la suppression');
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setMovementToDelete(null);
            setLinkedMovement(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Indicateurs de stock SIGMA (visible uniquement dans l'onglet SIGMA) */}
            {category === 'sigma' && (
                <SigmaStockIndicator />
            )}

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

            {/* Dialogue de confirmation de suppression */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Confirmer la suppression
                        </DialogTitle>
                        <DialogDescription>
                            {linkedMovement ? (
                                <div className="space-y-2 mt-2">
                                    <p className="text-amber-600 font-medium">
                                        ⚠️ Ce mouvement est lié à un autre mouvement inter-magasins
                                    </p>
                                    <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                                        <p><strong>Mouvement lié :</strong></p>
                                        <p>• Magasin : {STOCK_CATEGORY_LABELS[linkedMovement.category]}</p>
                                        <p>• Type : {linkedMovement.movement_type === 'entree' ? 'Entrée' : 'Sortie'}</p>
                                        <p>• Quantité : {linkedMovement.quantity} {linkedMovement.bottle_type}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Voulez-vous supprimer uniquement ce mouvement ou les deux ?
                                    </p>
                                </div>
                            ) : (
                                <p>Êtes-vous sûr de vouloir supprimer ce mouvement ?</p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Annuler
                        </Button>
                        {linkedMovement ? (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={handleDeleteSingle}
                                    disabled={isDeleting}
                                >
                                    Supprimer ce mouvement uniquement
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteBoth}
                                    disabled={isDeleting}
                                >
                                    Supprimer les 2 mouvements
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteBoth}
                                disabled={isDeleting}
                            >
                                Supprimer
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
