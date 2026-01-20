import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
    SigmaStock,
    StockClient,
    BottleType,
    STOCK_CLIENT_ORDER,
    STOCK_CLIENT_LABELS,
    BOTTLE_TYPE_LABELS,
} from '@/types/stock';
import { loadSigmaStocks, saveSigmaStock, deleteSigmaStock } from '@/utils/stockStorage';

interface SigmaStockConfigModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SigmaStockConfigModal = ({ open, onOpenChange }: SigmaStockConfigModalProps) => {
    const [stocks, setStocks] = useState<SigmaStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Formulaire d'ajout (simplifié: Client, Type, Quantité)
    const [newClient, setNewClient] = useState<StockClient>('PI');
    const [newBottleType, setNewBottleType] = useState<BottleType>('B6');
    const [newInitialStock, setNewInitialStock] = useState('');

    const loadData = async () => {
        setLoading(true);
        const data = await loadSigmaStocks();
        setStocks(data);
        setLoading(false);
    };

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const handleAdd = async () => {
        if (!newInitialStock || parseInt(newInitialStock) < 0) {
            toast.error('Veuillez saisir un stock initial valide');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await saveSigmaStock(
                newClient,
                newBottleType,
                parseInt(newInitialStock)
            );

            if (result.success) {
                toast.success('Stock SIGMA configuré');
                setNewInitialStock('');
                await loadData();
            } else {
                toast.error(result.error || 'Erreur lors de la configuration');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la configuration');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette configuration de stock SIGMA ?')) return;

        const result = await deleteSigmaStock(id);
        if (result.success) {
            toast.success('Configuration supprimée');
            await loadData();
        } else {
            toast.error(result.error || 'Erreur lors de la suppression');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuration du Stock SIGMA
                    </DialogTitle>
                    <DialogDescription>
                        Configurez le stock initial SIGMA par client, type de bouteille et origine.
                        Ce stock sera utilisé pour alimenter les autres magasins.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Formulaire d'ajout */}
                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <h4 className="font-medium mb-3">Ajouter / Modifier un stock</h4>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs">Client</Label>
                                <Select value={newClient || ''} onValueChange={(v) => setNewClient(v as StockClient)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STOCK_CLIENT_ORDER.map((c) => (
                                            <SelectItem key={c} value={c}>{STOCK_CLIENT_LABELS[c]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Type Bouteille</Label>
                                <Select value={newBottleType} onValueChange={(v) => setNewBottleType(v as BottleType)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(['B6', 'B12'] as BottleType[]).map((bt) => (
                                            <SelectItem key={bt} value={bt}>{BOTTLE_TYPE_LABELS[bt]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Quantité</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={newInitialStock}
                                    onChange={(e) => setNewInitialStock(e.target.value)}
                                    className="h-9"
                                    min="0"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleAdd}
                                    disabled={isSubmitting}
                                    className="h-9 w-full"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Ajouter
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tableau des stocks configurés */}
                    <div>
                        <h4 className="font-medium mb-3">Stocks SIGMA configurés</h4>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Chargement...
                            </div>
                        ) : stocks.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                                Aucun stock SIGMA configuré
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Type Bouteille</TableHead>
                                        <TableHead className="text-right">Stock Initial</TableHead>
                                        <TableHead className="text-right">Stock Actuel</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stocks.map((stock) => (
                                        <TableRow key={stock.id}>
                                            <TableCell className="font-medium">
                                                {stock.client ? STOCK_CLIENT_LABELS[stock.client] : '-'}
                                            </TableCell>
                                            <TableCell>{BOTTLE_TYPE_LABELS[stock.bottle_type]}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {stock.initial_stock.toLocaleString('fr-FR')}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                <span className={stock.current_stock <= 0 ? 'text-red-600' : 'text-green-600'}>
                                                    {stock.current_stock.toLocaleString('fr-FR')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(stock.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
