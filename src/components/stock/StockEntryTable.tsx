import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  StockMovement,
  StockCategory,
  StockClient,
  MovementType,
  BottleType,
  MOVEMENT_TYPE_LABELS
} from '@/types/stock';
import { format } from 'date-fns';
import { Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StockEntryTableProps {
  category: StockCategory;
  client: StockClient;
  bottleType: BottleType;
  movements: StockMovement[];
  onAddMovement: (movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteMovement: (id: string) => Promise<void>;
}

export const StockEntryTable = ({
  category,
  client,
  bottleType,
  movements,
  onAddMovement,
  onDeleteMovement
}: StockEntryTableProps) => {
  // --- New Entry State ---
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newType, setNewType] = useState<MovementType>('entree');
  // Bottle Type is now passed as prop
  const [newOperation, setNewOperation] = useState(''); // Maps to 'motif' or 'provenance/destination'
  const [newQuantity, setNewQuantity] = useState('');
  const [newStockReel, setNewStockReel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter movements for the current view (already filtered by parent, but sorting is good)
  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [movements]);

  // Calculate totals and running balance
  let runningStock = 0;

  const movementsWithBalance = sortedMovements.map(m => {
    if (m.movement_type === 'entree') runningStock += m.quantity;
    if (m.movement_type === 'sortie') runningStock -= m.quantity;
    // Inventaire logic: Does it reset stock?
    // Assumption: Inventory implies a check. If there is an ecart, it might imply an adjustment.
    // For now, "Stock Final" is the theoretical running balance.
    // The "Ecart" shows the diff.

    return { ...m, currentStock: runningStock };
  });

  const handleAdd = async () => {
    if (!newQuantity && newType !== 'inventaire') {
      toast.error('Quantité requise');
      return;
    }

    setIsSubmitting(true);
    try {
      const quantityNum = parseInt(newQuantity) || 0;

      const movementData: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'> = {
        date: newDate,
        category,
        site: 'depot_vrac', // Default or need logic?
        movement_type: newType,
        bottle_type: bottleType, // Use the active bottle type
        quantity: quantityNum,
        client: client,
        // Map operation to fields based on type
        motif: (newType === 'sortie' ? newOperation : undefined),
        provenance: (newType === 'entree' ? newOperation : undefined),
        destination: (newType === 'transfert' || newType === 'sortie' ? newOperation : undefined),

        stock_reel: newType === 'inventaire' ? parseInt(newStockReel) : undefined,
      };

      await onAddMovement(movementData);

      // Reset form (keep date?)
      setNewOperation('');
      setNewQuantity('');
      setNewStockReel('');
      toast.success('Mouvement ajouté');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEcart = (m: any) => {
    if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
      // Ecart = Reel - Stock Theorique (StockFinal here is theoretical running balance)
      return m.stock_reel - m.currentStock;
    }
    return null;
  };

  // Helper to determine styling for Operation column
  const getOperationText = (m: StockMovement) => {
    if (m.movement_type === 'inventaire') return 'INVENTAIRE';
    return m.motif || m.provenance || m.destination || '-';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-none border-b">
        <Table>
          <TableHeader className="bg-slate-100 uppercase text-xs font-bold text-slate-700">
            <TableRow>
              <TableHead className="w-[120px] border-r">DATE</TableHead>
              <TableHead className="w-[120px] border-r">TYPE DE MVT</TableHead>
              <TableHead className="border-r">DESTINATION / PROVENANCE</TableHead>
              <TableHead className="text-right w-[100px] border-r bg-blue-50/50">QUANTITE</TableHead>
              <TableHead className="text-right w-[120px] border-r bg-blue-100/50">QTÉ STOCK FINAL</TableHead>
              <TableHead className="text-right w-[100px] border-r">INVENTAIRE</TableHead>
              <TableHead className="text-right w-[80px]">ECART</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Input Row for Quick Add */}
            <TableRow className="bg-slate-50 border-b-2 border-slate-200">
              <TableCell className="p-1">
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="h-8 border-slate-300"
                />
              </TableCell>
              <TableCell className="p-1">
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger className="h-8 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1">
                <Input
                  placeholder={newType === 'sortie' ? 'Destination...' : 'Provenance...'}
                  value={newOperation}
                  onChange={e => setNewOperation(e.target.value)}
                  className="h-8 border-slate-300"
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  type="number"
                  placeholder="0"
                  value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                  className="h-8 text-right border-slate-300"
                  disabled={newType === 'inventaire'}
                />
              </TableCell>
              <TableCell className="text-right text-muted-foreground bg-blue-50/20">
                -
              </TableCell>
              <TableCell className="p-1">
                <Input
                  type="number"
                  placeholder="Inv."
                  value={newStockReel}
                  onChange={e => setNewStockReel(e.target.value)}
                  className="h-8 text-right border-slate-300"
                  disabled={newType !== 'inventaire'}
                />
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="p-1 text-center">
                <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleAdd} disabled={isSubmitting}>
                  <Save className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>

            {/* Existing Movements */}
            {movementsWithBalance.map((movement) => (
              <TableRow key={movement.id} className="hover:bg-muted/50">
                <TableCell className="font-medium border-r">
                  {format(new Date(movement.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="border-r">
                  <span className={cn(
                    "font-medium",
                    movement.movement_type === 'entree' && "text-blue-600",
                    movement.movement_type === 'sortie' && "text-red-600",
                    movement.movement_type === 'inventaire' && "text-orange-600"
                  )}>
                    {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                  </span>
                </TableCell>
                <TableCell className="border-r uppercase text-sm">
                  {getOperationText(movement)}
                </TableCell>
                <TableCell className="text-right font-medium border-r bg-blue-50/30">
                  {movement.movement_type !== 'inventaire' && movement.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-bold border-r bg-blue-100/30">
                  {movement.currentStock.toLocaleString()}
                </TableCell>
                <TableCell className="text-right border-r">
                  {movement.stock_reel?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const ecart = getEcart(movement);
                    if (ecart === null) return null;
                    return (
                      <span className={cn(
                        "font-bold",
                        ecart > 0 ? "text-green-600" : ecart < 0 ? "text-red-600" : "text-gray-400"
                      )}>
                        {ecart > 0 ? '+' : ''}{ecart}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteMovement(movement.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
