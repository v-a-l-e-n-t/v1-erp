import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Trash2, TrendingUp, TrendingDown, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  StockMovement,
  StockCategory,
  StockClient,
  MovementType,
  BottleOrigin,
  MOVEMENT_TYPE_LABELS,
  WAREHOUSE_LIST,
  STOCK_CATEGORY_LABELS,
  BOTTLE_ORIGIN_LABELS,
} from '@/types/stock';
import { checkSigmaStockAvailable } from '@/utils/stockStorage';

interface StockEntryTableProps {
  category: StockCategory;
  client: StockClient;
  movements: StockMovement[];
  onAddMovement: (movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteMovement: (id: string) => Promise<void>;
}

// Structure pour regrouper B6 et B12 sur la même ligne
interface GroupedRow {
  key: string;
  date: string;
  movement_type: MovementType;
  bon_numero?: string;
  provenance_destination?: string;
  bottle_origin?: BottleOrigin;
  b6?: {
    id: string;
    quantity: number;
    stock_theorique: number;
    stock_reel?: number;
    ecart?: number;
  };
  b12?: {
    id: string;
    quantity: number;
    stock_theorique: number;
    stock_reel?: number;
    ecart?: number;
  };
}

export const StockEntryTable = ({
  category,
  client,
  movements,
  onAddMovement,
  onDeleteMovement
}: StockEntryTableProps) => {
  // État du formulaire de saisie
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newType, setNewType] = useState<MovementType>('entree');
  const [newBon, setNewBon] = useState('');
  const [newWarehouse, setNewWarehouse] = useState<StockCategory | ''>('');
  const [newBottleOrigin, setNewBottleOrigin] = useState<BottleOrigin>('fabrique');
  // B6
  const [newQtyB6, setNewQtyB6] = useState('');
  const [newInvB6, setNewInvB6] = useState('');
  // B12
  const [newQtyB12, setNewQtyB12] = useState('');
  const [newInvB12, setNewInvB12] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État pour le popup d'alerte stock SIGMA insuffisant
  const [sigmaAlertOpen, setSigmaAlertOpen] = useState(false);
  const [sigmaAlertMessages, setSigmaAlertMessages] = useState<string[]>([]);

  // Liste des magasins disponibles (exclure le magasin actuel)
  const availableWarehouses = useMemo(() => {
    return WAREHOUSE_LIST.filter(w => w !== category);
  }, [category]);

  // Pour Bouteilles Neuves, définir SIGMA comme provenance par défaut pour les entrées
  useEffect(() => {
    if (category === 'bouteilles_neuves' && newType === 'entree') {
      setNewWarehouse('sigma');
    }
  }, [category, newType]);

  // Mois en cours pour le filtrage du tableau
  const currentMonth = useMemo(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: format(now, 'MMMM yyyy', { locale: fr })
    };
  }, []);

  // Filtrer les mouvements du mois en cours pour l'affichage
  const monthMovements = useMemo(() => {
    return movements.filter(m => {
      const date = new Date(m.date);
      return date >= currentMonth.start && date <= currentMonth.end;
    });
  }, [movements, currentMonth]);

  // Calculer le stock actuel (dernier stock théorique) pour B6 et B12 - basé sur TOUS les mouvements
  const { currentStockB6, currentStockB12 } = useMemo(() => {
    // Trier par date puis par created_at (chronologique)
    const sortedB6 = movements
      .filter(m => m.bottle_type === 'B6')
      .sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    const sortedB12 = movements
      .filter(m => m.bottle_type === 'B12')
      .sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    // Calculer le stock séquentiellement
    let stockB6 = 0;
    sortedB6.forEach(m => {
      if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
        stockB6 = m.stock_reel;
      } else if (m.movement_type === 'entree') {
        stockB6 += m.quantity;
      } else if (m.movement_type === 'sortie') {
        stockB6 -= m.quantity;
      }
    });

    let stockB12 = 0;
    sortedB12.forEach(m => {
      if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
        stockB12 = m.stock_reel;
      } else if (m.movement_type === 'entree') {
        stockB12 += m.quantity;
      } else if (m.movement_type === 'sortie') {
        stockB12 -= m.quantity;
      }
    });

    return { currentStockB6: stockB6, currentStockB12: stockB12 };
  }, [movements]);

  // Calculer les cumuls du mois pour B6 et B12
  const { cumulEntreeB6, cumulSortieB6, cumulEntreeB12, cumulSortieB12 } = useMemo(() => {
    let entreeB6 = 0, sortieB6 = 0, entreeB12 = 0, sortieB12 = 0;
    
    monthMovements.forEach(m => {
      if (m.bottle_type === 'B6') {
        if (m.movement_type === 'entree') entreeB6 += m.quantity;
        else if (m.movement_type === 'sortie') sortieB6 += m.quantity;
      } else if (m.bottle_type === 'B12') {
        if (m.movement_type === 'entree') entreeB12 += m.quantity;
        else if (m.movement_type === 'sortie') sortieB12 += m.quantity;
      }
    });

    return { 
      cumulEntreeB6: entreeB6, 
      cumulSortieB6: sortieB6, 
      cumulEntreeB12: entreeB12, 
      cumulSortieB12: sortieB12 
    };
  }, [monthMovements]);

  // Calculer le stock pour chaque mouvement et regrouper par ligne (mouvements du mois)
  const groupedRows = useMemo(() => {
    const calculateStockForType = (bottleType: 'B6' | 'B12') => {
      // On utilise TOUS les mouvements pour le calcul du stock
      const filtered = movements
        .filter(m => m.bottle_type === bottleType)
        .sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      const result = new Map<string, { stock_before: number; stock_after: number }>();
      let currentStock = 0;

      filtered.forEach(m => {
        const stockBefore = currentStock;
        let stockAfter = stockBefore;

        if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
          stockAfter = m.stock_reel;
        } else if (m.movement_type === 'entree') {
          stockAfter = stockBefore + m.quantity;
        } else if (m.movement_type === 'sortie') {
          stockAfter = stockBefore - m.quantity;
        }

        currentStock = stockAfter;
        result.set(m.id, { stock_before: stockBefore, stock_after: stockAfter });
      });

      return result;
    };

    const stocksB6 = calculateStockForType('B6');
    const stocksB12 = calculateStockForType('B12');

    // Regrouper les mouvements du MOIS par date + type + bon
    const groups = new Map<string, GroupedRow>();

    // On n'affiche que les mouvements du mois en cours
    monthMovements.forEach(m => {
      const key = `${m.date}|${m.movement_type}|${m.bon_numero || ''}`;
      const stockData = m.bottle_type === 'B6' ? stocksB6.get(m.id) : stocksB12.get(m.id);

      const bottleData = {
        id: m.id,
        quantity: m.quantity,
        stock_theorique: stockData?.stock_after || 0,
        stock_reel: m.stock_reel,
        ecart: m.movement_type === 'inventaire' && m.stock_reel !== undefined && stockData
          ? m.stock_reel - stockData.stock_before
          : undefined
      };

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          date: m.date,
          movement_type: m.movement_type,
          bon_numero: m.bon_numero,
          provenance_destination: m.provenance || m.destination,
          bottle_origin: m.bottle_origin,
          b6: m.bottle_type === 'B6' ? bottleData : undefined,
          b12: m.bottle_type === 'B12' ? bottleData : undefined
        });
      } else {
        const existing = groups.get(key)!;
        if (m.bottle_type === 'B6') {
          existing.b6 = bottleData;
        } else if (m.bottle_type === 'B12') {
          existing.b12 = bottleData;
        }
        // Mettre à jour provenance/destination si pas encore défini
        if (!existing.provenance_destination) {
          existing.provenance_destination = m.provenance || m.destination;
        }
        // Mettre à jour bottle_origin si pas encore défini
        if (!existing.bottle_origin) {
          existing.bottle_origin = m.bottle_origin;
        }
      }
    });

    // Trier par date décroissante (plus récent en haut)
    return Array.from(groups.values()).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [movements, monthMovements]);

  // Soumission du formulaire
  const handleSubmit = async () => {
    const hasB6 = newType === 'inventaire' ? !!newInvB6 : !!newQtyB6;
    const hasB12 = newType === 'inventaire' ? !!newInvB12 : !!newQtyB12;

    if (!hasB6 && !hasB12) {
      toast.error('Saisissez au moins une quantité (B6 ou B12)');
      return;
    }

    const qtyB6 = parseInt(newQtyB6) || 0;
    const qtyB12 = parseInt(newQtyB12) || 0;

    // Pour les entrées dans Bouteilles Neuves, vérifier le stock SIGMA AVANT d'enregistrer
    if (newType === 'entree' && category === 'bouteilles_neuves') {
      const insufficientStock: string[] = [];
      
      // Vérifier B6 si nécessaire
      if (hasB6 && qtyB6 > 0) {
        const checkB6 = await checkSigmaStockAvailable(client, 'B6', qtyB6);
        if (!checkB6.available) {
          insufficientStock.push(`B6: demandé ${qtyB6.toLocaleString('fr-FR')}, disponible ${checkB6.currentStock.toLocaleString('fr-FR')}`);
        }
      }
      
      // Vérifier B12 si nécessaire
      if (hasB12 && qtyB12 > 0) {
        const checkB12 = await checkSigmaStockAvailable(client, 'B12', qtyB12);
        if (!checkB12.available) {
          insufficientStock.push(`B12: demandé ${qtyB12.toLocaleString('fr-FR')}, disponible ${checkB12.currentStock.toLocaleString('fr-FR')}`);
        }
      }
      
      // Si stock insuffisant pour B6 et/ou B12, bloquer l'enregistrement
      if (insufficientStock.length > 0) {
        setSigmaAlertMessages(insufficientStock);
        setSigmaAlertOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const promises: Promise<void>[] = [];

      // Mouvement B6
      if (hasB6) {
        const invB6 = parseInt(newInvB6) || 0;

        const movementB6: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'> = {
          date: newDate,
          category,
          site: 'depot_vrac', // Valeur par défaut (ignorée)
          movement_type: newType,
          bottle_type: 'B6',
          quantity: newType === 'inventaire' ? 0 : qtyB6,
          client,
          bon_numero: newBon || undefined,
          bottle_origin: newBottleOrigin,
          provenance: newType === 'entree' && newWarehouse ? STOCK_CATEGORY_LABELS[newWarehouse] : undefined,
          destination: newType === 'sortie' && newWarehouse ? STOCK_CATEGORY_LABELS[newWarehouse] : undefined,
          source_warehouse: newType === 'entree' && newWarehouse ? newWarehouse : undefined,
          destination_warehouse: newType === 'sortie' && newWarehouse ? newWarehouse : undefined,
          stock_theorique: currentStockB6,
          stock_reel: newType === 'inventaire' ? invB6 : undefined,
          ecart: newType === 'inventaire' ? invB6 - currentStockB6 : undefined
        };
        promises.push(onAddMovement(movementB6));
      }

      // Mouvement B12
      if (hasB12) {
        const invB12 = parseInt(newInvB12) || 0;

        const movementB12: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'> = {
          date: newDate,
          category,
          site: 'depot_vrac', // Valeur par défaut (ignorée)
          movement_type: newType,
          bottle_type: 'B12',
          quantity: newType === 'inventaire' ? 0 : qtyB12,
          client,
          bon_numero: newBon || undefined,
          bottle_origin: newBottleOrigin,
          provenance: newType === 'entree' && newWarehouse ? STOCK_CATEGORY_LABELS[newWarehouse] : undefined,
          destination: newType === 'sortie' && newWarehouse ? STOCK_CATEGORY_LABELS[newWarehouse] : undefined,
          source_warehouse: newType === 'entree' && newWarehouse ? newWarehouse : undefined,
          destination_warehouse: newType === 'sortie' && newWarehouse ? newWarehouse : undefined,
          stock_theorique: currentStockB12,
          stock_reel: newType === 'inventaire' ? invB12 : undefined,
          ecart: newType === 'inventaire' ? invB12 - currentStockB12 : undefined
        };
        promises.push(onAddMovement(movementB12));
      }

      await Promise.all(promises);

      // Reset formulaire
      setNewBon('');
      setNewWarehouse('');
      setNewQtyB6('');
      setNewInvB6('');
      setNewQtyB12('');
      setNewInvB12('');
      toast.success('Mouvement(s) enregistré(s)');
    } catch (error: any) {
      console.error(error);
      // Ne pas afficher de toast si c'est une erreur SIGMA (le modal s'affiche déjà)
      if (error?.message !== 'SIGMA_INSUFFICIENT') {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suppression d'une ligne (supprime B6 et B12)
  const handleDelete = async (row: GroupedRow) => {
    if (!confirm('Supprimer ce mouvement ?')) return;
    
    const promises: Promise<void>[] = [];
    if (row.b6) promises.push(onDeleteMovement(row.b6.id));
    if (row.b12) promises.push(onDeleteMovement(row.b12.id));
    await Promise.all(promises);
  };

  return (
    <div className="space-y-4">
      {/* Bandeau récapitulatif (masqué pour SIGMA car les indicateurs sont déjà en haut) */}
      {category !== 'sigma' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* B6 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-800">B6</h3>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Stock Théorique Actuel</div>
                <div className="text-2xl font-bold text-blue-700">{currentStockB6.toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="flex gap-4 text-sm pt-2 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Cumul Entrée:</span>
                <span className="font-semibold text-green-600">+{cumulEntreeB6.toLocaleString('fr-FR')}</span>
              </div>
              <div className="w-px bg-blue-300 mx-2"></div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">Cumul Sortie:</span>
                <span className="font-semibold text-red-600">-{cumulSortieB6.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>
          {/* B12 */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-emerald-800">B12</h3>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Stock Théorique Actuel</div>
                <div className="text-2xl font-bold text-emerald-700">{currentStockB12.toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="flex gap-4 text-sm pt-2 border-t border-emerald-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Cumul Entrée:</span>
                <span className="font-semibold text-green-600">+{cumulEntreeB12.toLocaleString('fr-FR')}</span>
              </div>
              <div className="w-px bg-emerald-300 mx-2"></div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">Cumul Sortie:</span>
                <span className="font-semibold text-red-600">-{cumulSortieB12.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Titre du mois */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground capitalize">
          Mouvements de {currentMonth.label}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead rowSpan={2} className="w-[120px] border-r font-bold">DATE</TableHead>
              <TableHead rowSpan={2} className="w-[100px] border-r font-bold">TYPE MVT</TableHead>
              <TableHead rowSpan={2} className="w-[100px] border-r font-bold">BON</TableHead>
              <TableHead rowSpan={2} className="w-[150px] border-r font-bold">PROV / DEST</TableHead>
              <TableHead rowSpan={2} className="w-[110px] border-r font-bold">TYPE BTLE</TableHead>
              <TableHead colSpan={4} className="text-center border-r bg-blue-50 font-bold">B6</TableHead>
              <TableHead colSpan={4} className="text-center border-r bg-green-50 font-bold">B12</TableHead>
              <TableHead rowSpan={2} className="w-[50px]"></TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-right w-[80px] border-r bg-blue-50/50 text-xs">QTÉ</TableHead>
              <TableHead className="text-right w-[90px] border-r bg-blue-100/50 text-xs">STOCK</TableHead>
              <TableHead className="text-right w-[80px] border-r bg-blue-50/50 text-xs">INV</TableHead>
              <TableHead className="text-right w-[70px] border-r bg-blue-50/50 text-xs">ÉCART</TableHead>
              <TableHead className="text-right w-[80px] border-r bg-green-50/50 text-xs">QTÉ</TableHead>
              <TableHead className="text-right w-[90px] border-r bg-green-100/50 text-xs">STOCK</TableHead>
              <TableHead className="text-right w-[80px] border-r bg-green-50/50 text-xs">INV</TableHead>
              <TableHead className="text-right w-[70px] border-r bg-green-50/50 text-xs">ÉCART</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Ligne de saisie */}
            <TableRow className="bg-yellow-50/50 border-b-2 border-slate-300">
              <TableCell className="p-1">
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="h-9 text-sm"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </TableCell>
              <TableCell className="p-1">
                <Select value={newType} onValueChange={(v: MovementType) => setNewType(v)}>
                  <SelectTrigger className="h-9 text-sm">
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
                  placeholder="N° Bon"
                  value={newBon}
                  onChange={e => setNewBon(e.target.value)}
                  className="h-9 text-sm"
                />
              </TableCell>
              <TableCell className="p-1">
                <Select 
                  value={newWarehouse} 
                  onValueChange={(v: StockCategory | '') => setNewWarehouse(v as StockCategory)}
                  disabled={newType === 'inventaire'}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={newType === 'sortie' ? 'Destination' : 'Provenance'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWarehouses.map((w) => (
                      <SelectItem key={w} value={w}>{STOCK_CATEGORY_LABELS[w]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1">
                <Select 
                  value={newBottleOrigin} 
                  onValueChange={(v: BottleOrigin) => setNewBottleOrigin(v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BOTTLE_ORIGIN_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {/* B6 */}
              <TableCell className="p-1 bg-blue-50/30">
                <Input
                  type="number"
                  placeholder="0"
                  value={newQtyB6}
                  onChange={e => setNewQtyB6(e.target.value)}
                  className="h-9 text-sm text-right"
                  disabled={newType === 'inventaire'}
                  min="0"
                />
              </TableCell>
              <TableCell className="text-right bg-blue-100/30 px-2">
                <span className="font-bold text-blue-700">{currentStockB6.toLocaleString('fr-FR')}</span>
              </TableCell>
              <TableCell className="p-1 bg-blue-50/30">
                <Input
                  type="number"
                  placeholder="Inv"
                  value={newInvB6}
                  onChange={e => setNewInvB6(e.target.value)}
                  className="h-9 text-sm text-right"
                  disabled={newType !== 'inventaire'}
                  min="0"
                />
              </TableCell>
              <TableCell className="text-right bg-blue-50/30 px-2 text-muted-foreground">-</TableCell>
              {/* B12 */}
              <TableCell className="p-1 bg-green-50/30">
                <Input
                  type="number"
                  placeholder="0"
                  value={newQtyB12}
                  onChange={e => setNewQtyB12(e.target.value)}
                  className="h-9 text-sm text-right"
                  disabled={newType === 'inventaire'}
                  min="0"
                />
              </TableCell>
              <TableCell className="text-right bg-green-100/30 px-2">
                <span className="font-bold text-green-700">{currentStockB12.toLocaleString('fr-FR')}</span>
              </TableCell>
              <TableCell className="p-1 bg-green-50/30">
                <Input
                  type="number"
                  placeholder="Inv"
                  value={newInvB12}
                  onChange={e => setNewInvB12(e.target.value)}
                  className="h-9 text-sm text-right"
                  disabled={newType !== 'inventaire'}
                  min="0"
                />
              </TableCell>
              <TableCell className="text-right bg-green-50/30 px-2 text-muted-foreground">-</TableCell>
              <TableCell className="p-1 text-center">
                <Button
                  size="icon"
                  className="h-8 w-8 bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>

            {/* Lignes existantes */}
            {groupedRows.map((row) => (
              <TableRow key={row.key} className="hover:bg-muted/50 text-sm">
                <TableCell className="border-r py-2 font-medium">
                  {format(new Date(row.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="border-r py-2">
                  <span className={cn(
                    "font-medium",
                    row.movement_type === 'entree' && "text-green-600",
                    row.movement_type === 'sortie' && "text-red-600",
                    row.movement_type === 'inventaire' && "text-orange-600"
                  )}>
                    {MOVEMENT_TYPE_LABELS[row.movement_type]}
                  </span>
                </TableCell>
                <TableCell className="border-r py-2 font-mono text-xs">
                  {row.bon_numero || '-'}
                </TableCell>
                <TableCell className="border-r py-2 text-xs">
                  {row.provenance_destination || '-'}
                </TableCell>
                <TableCell className="border-r py-2 text-xs">
                  {row.bottle_origin ? BOTTLE_ORIGIN_LABELS[row.bottle_origin] : '-'}
                </TableCell>
                {/* B6 */}
                <TableCell className={cn(
                  "text-right border-r py-2 font-semibold",
                  row.movement_type === 'entree' && "text-green-600 bg-green-50/30",
                  row.movement_type === 'sortie' && "text-red-600 bg-red-50/30",
                  row.movement_type === 'inventaire' && "text-orange-600 bg-orange-50/30"
                )}>
                  {row.b6 && row.movement_type !== 'inventaire' ? (
                    row.movement_type === 'entree' 
                      ? `+${row.b6.quantity.toLocaleString('fr-FR')}` 
                      : `-${row.b6.quantity.toLocaleString('fr-FR')}`
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-blue-100/20 font-semibold">
                  {row.b6 ? row.b6.stock_theorique.toLocaleString('fr-FR') : '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-blue-50/20">
                  {row.b6?.stock_reel?.toLocaleString('fr-FR') || '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-blue-50/20">
                  {row.b6?.ecart !== undefined ? (
                    <Badge className={cn(
                      "text-xs",
                      row.b6.ecart > 0 && "bg-green-600",
                      row.b6.ecart < 0 && "bg-red-600",
                      row.b6.ecart === 0 && "bg-gray-400"
                    )}>
                      {row.b6.ecart > 0 ? '+' : ''}{row.b6.ecart}
                    </Badge>
                  ) : '-'}
                </TableCell>
                {/* B12 */}
                <TableCell className={cn(
                  "text-right border-r py-2 font-semibold",
                  row.movement_type === 'entree' && "text-green-600 bg-green-50/30",
                  row.movement_type === 'sortie' && "text-red-600 bg-red-50/30",
                  row.movement_type === 'inventaire' && "text-orange-600 bg-orange-50/30"
                )}>
                  {row.b12 && row.movement_type !== 'inventaire' ? (
                    row.movement_type === 'entree' 
                      ? `+${row.b12.quantity.toLocaleString('fr-FR')}` 
                      : `-${row.b12.quantity.toLocaleString('fr-FR')}`
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-green-100/20 font-semibold">
                  {row.b12 ? row.b12.stock_theorique.toLocaleString('fr-FR') : '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-green-50/20">
                  {row.b12?.stock_reel?.toLocaleString('fr-FR') || '-'}
                </TableCell>
                <TableCell className="text-right border-r py-2 bg-green-50/20">
                  {row.b12?.ecart !== undefined ? (
                    <Badge className={cn(
                      "text-xs",
                      row.b12.ecart > 0 && "bg-green-600",
                      row.b12.ecart < 0 && "bg-red-600",
                      row.b12.ecart === 0 && "bg-gray-400"
                    )}>
                      {row.b12.ecart > 0 ? '+' : ''}{row.b12.ecart}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="py-2 text-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {groupedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Aucun mouvement enregistré
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Popup d'alerte stock SIGMA insuffisant */}
      <Dialog open={sigmaAlertOpen} onOpenChange={setSigmaAlertOpen}>
        <DialogContent className="sm:max-w-md border-red-500 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-lg">
              <AlertCircle className="h-6 w-6" />
              Stock SIGMA insuffisant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-3">
                Impossible d'enregistrer ce mouvement. Le stock SIGMA est insuffisant :
              </p>
              <ul className="space-y-2">
                {sigmaAlertMessages.map((msg, i) => (
                  <li key={i} className="flex items-center gap-2 text-red-700">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="font-semibold">{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Veuillez d'abord enregistrer une entrée dans SIGMA ou réduire la quantité demandée.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setSigmaAlertOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
