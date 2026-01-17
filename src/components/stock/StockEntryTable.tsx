import { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
  StockSite,
  MOVEMENT_TYPE_LABELS,
  STOCK_SITE_LABELS
} from '@/types/stock';
import { format, subDays } from 'date-fns';
import { Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateTheoreticalStock } from '@/utils/stockCalculations';
import { loadStockMovements } from '@/utils/stockStorage';

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
  const [newSite, setNewSite] = useState<StockSite>('depot_vrac');
  const [newOperation, setNewOperation] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newStockReel, setNewStockReel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);

  // Charger tous les mouvements pour les calculs
  useEffect(() => {
    loadStockMovements().then(setAllMovements);
  }, [movements]);

  // Trier les mouvements par date
  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
  }, [movements]);

  // Calculer le stock avec la logique Excel
  const movementsWithStock = useMemo(() => {
    const result: Array<StockMovement & { stockAvant: number; stockApres: number }> = [];
    
    // Filtrer les mouvements pertinents pour cette combinaison
    const relevantMovements = allMovements.filter(m => 
      m.category === category &&
      m.bottle_type === bottleType &&
      (client ? m.client === client : true)
    );

    sortedMovements.forEach((movement, index) => {
      // Calculer le stock théorique avant ce mouvement
      // Utiliser la date du mouvement précédent (ou date actuelle - 1 jour si premier mouvement)
      let dateAvant: string;
      if (index > 0) {
        // Utiliser la date du mouvement précédent
        const prevDate = new Date(sortedMovements[index - 1].date);
        // Si même date, utiliser la date précédente moins 1 seconde pour être avant
        if (sortedMovements[index - 1].date === movement.date) {
          dateAvant = format(subDays(prevDate, 1), 'yyyy-MM-dd');
        } else {
          dateAvant = sortedMovements[index - 1].date;
        }
      } else {
        // Premier mouvement : utiliser la date actuelle - 1 jour
        dateAvant = format(subDays(new Date(movement.date), 1), 'yyyy-MM-dd');
      }
      
      const stockAvant = calculateTheoreticalStock(
        relevantMovements,
        movement.category,
        movement.site,
        movement.bottle_type,
        movement.client,
        dateAvant
      );

      // Calculer le stock après ce mouvement selon la logique Excel
      let stockApres = stockAvant;
      
      if (movement.movement_type === 'inventaire' && movement.stock_reel !== undefined) {
        // Pour un inventaire, réinitialiser au stock réel (logique Excel)
        stockApres = movement.stock_reel;
      } else if (movement.movement_type === 'entree' || movement.movement_type === 'transfert') {
        stockApres = stockAvant + movement.quantity;
      } else if (movement.movement_type === 'sortie') {
        stockApres = stockAvant - movement.quantity;
      }

      result.push({
        ...movement,
        stockAvant,
        stockApres
      });
    });

    return result;
  }, [sortedMovements, allMovements, category, bottleType, client]);

  // Calculer le stock théorique actuel pour affichage
  const currentTheoreticalStock = useMemo(() => {
    if (allMovements.length === 0) return 0;
    
    // Calculer pour le site sélectionné
    return calculateTheoreticalStock(
      allMovements,
      category,
      newSite,
      bottleType,
      client
    );
  }, [allMovements, category, newSite, bottleType, client]);

  // Calculer les totaux
  const totals = useMemo(() => {
    let totalEntrees = 0;
    let totalSorties = 0;
    let stockFinal = 0;

    movementsWithStock.forEach(m => {
      if (m.movement_type === 'entree' || m.movement_type === 'transfert') {
        totalEntrees += m.quantity;
      } else if (m.movement_type === 'sortie') {
        totalSorties += m.quantity;
      }
    });

    // Stock final = dernier stock après
    if (movementsWithStock.length > 0) {
      stockFinal = movementsWithStock[movementsWithStock.length - 1].stockApres;
    } else {
      stockFinal = currentTheoreticalStock;
    }

    return { totalEntrees, totalSorties, stockFinal };
  }, [movementsWithStock, currentTheoreticalStock]);

  const handleAdd = async () => {
    // Validation
    if (!newQuantity && newType !== 'inventaire') {
      toast.error('Quantité requise');
      return;
    }

    if (newType === 'inventaire' && !newStockReel) {
      toast.error('Stock réel requis pour un inventaire');
      return;
    }

    const quantityNum = parseInt(newQuantity) || 0;
    const stockReelNum = parseInt(newStockReel) || 0;

    if (quantityNum < 0) {
      toast.error('La quantité ne peut pas être négative');
      return;
    }

    if (newType === 'inventaire' && stockReelNum < 0) {
      toast.error('Le stock réel ne peut pas être négatif');
      return;
    }

    // Valider la date (ne pas être dans le futur)
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      toast.error('La date ne peut pas être dans le futur');
      return;
    }

    setIsSubmitting(true);
    try {
      const movementData: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'> = {
        date: newDate,
        category,
        site: newSite,
        movement_type: newType,
        bottle_type: bottleType,
        quantity: quantityNum,
        client: client,
        motif: (newType === 'sortie' ? newOperation : undefined),
        provenance: (newType === 'entree' ? newOperation : undefined),
        destination: (newType === 'transfert' || newType === 'sortie' ? newOperation : undefined),
        stock_reel: newType === 'inventaire' ? stockReelNum : undefined,
      };

      await onAddMovement(movementData);

      // Reset form
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

  const getEcart = (m: StockMovement & { stockAvant: number }) => {
    if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
      // Écart = stock réel - stock théorique avant inventaire (logique Excel)
      if (m.ecart !== undefined) {
        return m.ecart;
      }
      return m.stock_reel - m.stockAvant;
    }
    return null;
  };

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
              <TableHead className="w-[100px] border-r">DATE</TableHead>
              <TableHead className="w-[100px] border-r">SITE</TableHead>
              <TableHead className="w-[120px] border-r">TYPE DE MVT</TableHead>
              <TableHead className="border-r">DESTINATION / PROVENANCE</TableHead>
              <TableHead className="text-right w-[100px] border-r bg-blue-50/50">QUANTITE</TableHead>
              <TableHead className="text-right w-[100px] border-r bg-gray-50/50">STOCK AVANT</TableHead>
              <TableHead className="text-right w-[120px] border-r bg-blue-100/50">STOCK FINAL</TableHead>
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
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </TableCell>
              <TableCell className="p-1">
                <Select value={newSite} onValueChange={(v) => setNewSite(v as StockSite)}>
                  <SelectTrigger className="h-8 border-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STOCK_SITE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1">
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger className="h-8 border-slate-300 text-xs">
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
                  className="h-8 border-slate-300 text-xs"
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
                  min="0"
                />
              </TableCell>
              <TableCell className="text-right text-muted-foreground bg-gray-50/20 text-xs">
                <span className="text-muted-foreground">
                  Stock actuel: <span className="font-semibold text-blue-700">{currentTheoreticalStock.toLocaleString('fr-FR')}</span>
                </span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground bg-blue-50/20 text-xs">
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
                  min="0"
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
            {movementsWithStock.map((movement) => {
              const ecart = getEcart(movement);
              return (
                <TableRow key={movement.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium border-r">
                    {format(new Date(movement.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="border-r text-xs">
                    {STOCK_SITE_LABELS[movement.site]}
                  </TableCell>
                  <TableCell className="border-r">
                    <span className={cn(
                      "font-medium text-xs",
                      movement.movement_type === 'entree' && "text-blue-600",
                      movement.movement_type === 'sortie' && "text-red-600",
                      movement.movement_type === 'inventaire' && "text-orange-600",
                      movement.movement_type === 'transfert' && "text-purple-600"
                    )}>
                      {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                    </span>
                  </TableCell>
                  <TableCell className="border-r uppercase text-xs">
                    {getOperationText(movement)}
                  </TableCell>
                  <TableCell className="text-right font-medium border-r bg-blue-50/30">
                    {movement.movement_type !== 'inventaire' && movement.quantity.toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right border-r bg-gray-50/30 text-sm">
                    {movement.stockAvant.toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right font-bold border-r bg-blue-100/30">
                    {movement.stockApres.toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right border-r">
                    {movement.stock_reel?.toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {ecart !== null && (
                      <Badge 
                        variant={ecart > 0 ? 'default' : ecart < 0 ? 'destructive' : 'secondary'}
                        className={cn(
                          "font-bold text-xs",
                          ecart > 0 && "bg-green-600 hover:bg-green-700",
                          ecart < 0 && "bg-red-600 hover:bg-red-700",
                          ecart === 0 && "bg-gray-400"
                        )}
                      >
                        {ecart > 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')}
                      </Badge>
                    )}
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
              );
            })}

            {/* Totals Row */}
            {movementsWithStock.length > 0 && (
              <TableRow className="bg-slate-200 font-bold border-t-2 border-slate-400">
                <TableCell colSpan={4} className="text-right border-r">
                  TOTAUX
                </TableCell>
                <TableCell className="text-right border-r bg-blue-50/50">
                  <div className="space-y-0.5">
                    <div className="text-green-600">+{totals.totalEntrees.toLocaleString('fr-FR')}</div>
                    <div className="text-red-600">-{totals.totalSorties.toLocaleString('fr-FR')}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right border-r bg-gray-50/50">
                  -
                </TableCell>
                <TableCell className="text-right border-r bg-blue-100/50 text-lg">
                  {totals.stockFinal.toLocaleString('fr-FR')}
                </TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
