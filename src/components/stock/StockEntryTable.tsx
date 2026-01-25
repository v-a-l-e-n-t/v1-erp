import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WarehouseType,
  StockClientType,
  StockMovement,
  StockInventory,
  MovementType,
  BottleOrigin,
  TheoreticalStock,
  DateFilterOptions,
  MOVEMENT_TYPE_LABELS,
  BOTTLE_ORIGIN_LABELS,
  BOTTLE_NATURE_LABELS,
  WAREHOUSE_LABELS,
  ALL_WAREHOUSES_FOR_TRANSFERS,
  DATE_FILTER_LABELS,
} from '@/types/stock';
import {
  getStockMovements,
  createStockMovement,
  updateStockMovement,
  deleteStockMovement,
  getTheoreticalStock,
  getLastInventory,
} from '@/lib/stock';
import { formatNumber, validateMovementQuantities } from '@/lib/stockCalculations';

interface StockEntryTableProps {
  warehouse: WarehouseType;
  client: StockClientType;
}

const ITEMS_PER_PAGE = 30;

export const StockEntryTable: React.FC<StockEntryTableProps> = ({
  warehouse,
  client,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilterOptions>({
    type: 'month',
    month: new Date(),
  });
  const [theoreticalStock, setTheoreticalStock] = useState<TheoreticalStock | null>(null);
  const [lastInventory, setLastInventory] = useState<StockInventory | null>(null);

  const [formData, setFormData] = useState({
    movement_type: 'entree' as MovementType,
    movement_date: format(new Date(), 'yyyy-MM-dd'),
    bon_number: '',
    origin: '' as BottleOrigin | '',
    quantity_b6: '',
    quantity_b12: '',
    destination_warehouse: '' as WarehouseType | '',
    source_warehouse: '' as WarehouseType | '',
    notes: '',
  });

  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    movement: StockMovement | null;
  }>({ open: false, movement: null });

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    details?: { available_b6?: number; available_b12?: number; required_b6?: number; required_b12?: number };
  }>({ open: false, title: '', message: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [movementsData, stockData, inventoryData] = await Promise.all([
        getStockMovements(
          warehouse,
          client,
          dateFilter,
          ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
        ),
        getTheoreticalStock(warehouse, client),
        getLastInventory(warehouse, client),
      ]);

      setMovements(movementsData.movements);
      setTotalCount(movementsData.totalCount);
      setTheoreticalStock(stockData);
      setLastInventory(inventoryData);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les mouvements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouse, client, dateFilter, currentPage]);

  const resetForm = () => {
    setFormData({
      movement_type: 'entree',
      movement_date: format(new Date(), 'yyyy-MM-dd'),
      bon_number: '',
      origin: '',
      quantity_b6: '',
      quantity_b12: '',
      destination_warehouse: '',
      source_warehouse: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantityB6 = parseInt(formData.quantity_b6, 10) || 0;
    const quantityB12 = parseInt(formData.quantity_b12, 10) || 0;

    const validation = validateMovementQuantities(quantityB6, quantityB12);
    if (!validation.isValid) {
      toast({
        title: 'Erreur de validation',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const movementDate = new Date(formData.movement_date);
    if (movementDate > new Date()) {
      toast({
        title: 'Erreur',
        description: 'Les dates futures ne sont pas autorisées',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createStockMovement(
        warehouse,
        client,
        formData.movement_type,
        movementDate,
        quantityB6,
        quantityB12,
        formData.bon_number || undefined,
        formData.origin as BottleOrigin || undefined,
        formData.destination_warehouse as WarehouseType || undefined,
        formData.source_warehouse as WarehouseType || undefined,
        formData.notes || undefined
      );

      if (!result.success) {
        setErrorDialog({
          open: true,
          title: 'Stock insuffisant',
          message: result.error || 'Erreur lors de la création du mouvement',
          details: result.details,
        });
        return;
      }

      toast({
        title: 'Mouvement créé',
        description: `${MOVEMENT_TYPE_LABELS[formData.movement_type]} enregistrée`,
      });

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le mouvement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (movement: StockMovement) => {
    setEditingMovement(movement);
    setFormData({
      movement_type: movement.movement_type,
      movement_date: movement.movement_date,
      bon_number: movement.bon_number || '',
      origin: movement.origin || '',
      quantity_b6: movement.quantity_b6.toString(),
      quantity_b12: movement.quantity_b12.toString(),
      destination_warehouse: movement.destination_warehouse || '',
      source_warehouse: movement.source_warehouse || '',
      notes: movement.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingMovement) return;

    const quantityB6 = parseInt(formData.quantity_b6, 10) || 0;
    const quantityB12 = parseInt(formData.quantity_b12, 10) || 0;

    const validation = validateMovementQuantities(quantityB6, quantityB12);
    if (!validation.isValid) {
      toast({
        title: 'Erreur de validation',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await updateStockMovement(
        editingMovement.id,
        formData.movement_type,
        new Date(formData.movement_date),
        quantityB6,
        quantityB12,
        formData.bon_number || undefined,
        formData.origin as BottleOrigin || undefined,
        formData.destination_warehouse as WarehouseType || undefined,
        formData.source_warehouse as WarehouseType || undefined,
        formData.notes || undefined
      );

      if (!result.success) {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de modifier le mouvement',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Mouvement modifié',
        description: 'Les modifications ont été enregistrées',
      });

      setEditModalOpen(false);
      setEditingMovement(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating movement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le mouvement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (movement: StockMovement) => {
    setDeleteConfirm({ open: true, movement });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.movement) return;

    setLoading(true);
    try {
      const result = await deleteStockMovement(deleteConfirm.movement.id);

      if (!result.success) {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de supprimer le mouvement',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Mouvement supprimé',
        description: result.deleted_linked_id
          ? 'Le mouvement et son mouvement lié ont été supprimés'
          : 'Le mouvement a été supprimé',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le mouvement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteConfirm({ open: false, movement: null });
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (dateFilter.type !== 'month') return;
    const currentMonth = dateFilter.month || new Date();
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setDateFilter({ ...dateFilter, month: newDate });
    setCurrentPage(0);
  };

  const handleDateFilterChange = (newFilter: DateFilterOptions) => {
    setDateFilter(newFilter);
    setCurrentPage(0);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getMovementTypeBadge = (type: MovementType) => {
    const variants: Record<MovementType, 'default' | 'secondary' | 'outline'> = {
      entree: 'default',
      sortie: 'secondary',
      inventaire: 'outline',
    };
    return (
      <Badge variant={variants[type]} className="text-xs">
        {MOVEMENT_TYPE_LABELS[type]}
      </Badge>
    );
  };

  const renderGap = (gap: number) => {
    if (gap === 0) {
      return <span className="text-muted-foreground font-mono">0</span>;
    }
    if (gap > 0) {
      return <span className="text-red-600 font-mono font-semibold">-{formatNumber(gap)}</span>;
    }
    return <span className="text-green-600 font-mono font-semibold">+{formatNumber(Math.abs(gap))}</span>;
  };

  const b6Gap = theoreticalStock && lastInventory 
    ? theoreticalStock.b6 - lastInventory.quantity_b6 
    : 0;
  const b12Gap = theoreticalStock && lastInventory 
    ? theoreticalStock.b12 - lastInventory.quantity_b12 
    : 0;

  if (loading && movements.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theoretical Stock Display */}
      {theoreticalStock && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary font-medium">Stock Théorique B6</span>
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(theoreticalStock.b6)}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700 font-medium">Stock Théorique B12</span>
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(theoreticalStock.b12)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouveau mouvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, movement_type: value as MovementType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree">Entrée</SelectItem>
                    <SelectItem value="sortie">Sortie</SelectItem>
                    <SelectItem value="inventaire">Inventaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.movement_date}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setFormData({ ...formData, movement_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>N° Bon</Label>
                <Input
                  value={formData.bon_number}
                  onChange={(e) =>
                    setFormData({ ...formData, bon_number: e.target.value })
                  }
                  placeholder="Optionnel"
                />
              </div>

              {/* Provenance - Pour les entrées */}
              {formData.movement_type === 'entree' && (
                <div className="space-y-2">
                  <Label>Provenance</Label>
                  <Select
                    value={formData.source_warehouse}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source_warehouse: value as WarehouseType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_WAREHOUSES_FOR_TRANSFERS.filter((w) => w !== warehouse).map((w) => (
                        <SelectItem key={w} value={w}>
                          {WAREHOUSE_LABELS[w]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destination - Pour les sorties */}
              {formData.movement_type === 'sortie' && (
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select
                    value={formData.destination_warehouse}
                    onValueChange={(value) =>
                      setFormData({ ...formData, destination_warehouse: value as WarehouseType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_WAREHOUSES_FOR_TRANSFERS.filter((w) => w !== warehouse).map((w) => (
                        <SelectItem key={w} value={w}>
                          {WAREHOUSE_LABELS[w]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Nature - Pour les entrées */}
              {formData.movement_type === 'entree' && (
                <div className="space-y-2">
                  <Label>Nature</Label>
                  <Select
                    value={formData.origin}
                    onValueChange={(value) =>
                      setFormData({ ...formData, origin: value as BottleOrigin })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fabrique">Fabriqué</SelectItem>
                      <SelectItem value="requalifie">Requalifié</SelectItem>
                      <SelectItem value="ventes">Ventes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>B6</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_b6}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_b6: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>B12</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_b12}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_b12: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={loading} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Date Filter Section */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Période:</Label>
          </div>

          <Select
            value={dateFilter.type}
            onValueChange={(value) =>
              handleDateFilterChange({ ...dateFilter, type: value as DateFilterOptions['type'] })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute période</SelectItem>
              <SelectItem value="year">Année</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
              <SelectItem value="range">Période</SelectItem>
              <SelectItem value="day">Jour</SelectItem>
            </SelectContent>
          </Select>

          {/* Year filter */}
          {dateFilter.type === 'year' && (
            <Select
              value={(dateFilter.year || new Date().getFullYear()).toString()}
              onValueChange={(value) =>
                handleDateFilterChange({ ...dateFilter, year: parseInt(value) })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month filter */}
          {dateFilter.type === 'month' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {format(dateFilter.month || new Date(), 'MMMM yyyy', { locale: fr })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                disabled={(dateFilter.month || new Date()) >= new Date()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Date range filter */}
          {dateFilter.type === 'range' && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Du:</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={dateFilter.startDate ? format(dateFilter.startDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    handleDateFilterChange({
                      ...dateFilter,
                      startDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Au:</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={dateFilter.endDate ? format(dateFilter.endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    handleDateFilterChange({
                      ...dateFilter,
                      endDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Specific day filter */}
          {dateFilter.type === 'day' && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">Date:</Label>
              <Input
                type="date"
                className="w-40"
                value={dateFilter.specificDate ? format(dateFilter.specificDate, 'yyyy-MM-dd') : ''}
                onChange={(e) =>
                  handleDateFilterChange({
                    ...dateFilter,
                    specificDate: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
              />
            </div>
          )}
        </div>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>N° Bon</TableHead>
                <TableHead>Origine/Dest.</TableHead>
                <TableHead className="text-right bg-primary/5">B6 Qté</TableHead>
                <TableHead className="text-right bg-primary/5">B6 Stock</TableHead>
                <TableHead className="text-right bg-primary/5">B6 Inv</TableHead>
                <TableHead className="text-right bg-primary/5">Écart B6</TableHead>
                <TableHead className="text-right bg-amber-50">B12 Qté</TableHead>
                <TableHead className="text-right bg-amber-50">B12 Stock</TableHead>
                <TableHead className="text-right bg-amber-50">B12 Inv</TableHead>
                <TableHead className="text-right bg-amber-50">Écart B12</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    Aucun mouvement pour ce mois
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => {
                  const isInventory = movement.movement_type === 'inventaire';
                  return (
                    <TableRow key={movement.id} className={isInventory ? 'bg-slate-50' : ''}>
                      <TableCell>
                        {format(parseISO(movement.movement_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.bon_number || '-'}
                      </TableCell>
                      <TableCell>
                        {movement.origin && (
                          <Badge variant="outline" className="text-xs">
                            {BOTTLE_ORIGIN_LABELS[movement.origin]}
                          </Badge>
                        )}
                        {movement.destination_warehouse && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowRightLeft className="w-3 h-3" />
                            {WAREHOUSE_LABELS[movement.destination_warehouse]}
                          </div>
                        )}
                        {movement.source_warehouse && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowRightLeft className="w-3 h-3" />
                            De: {WAREHOUSE_LABELS[movement.source_warehouse]}
                          </div>
                        )}
                        {!movement.origin && !movement.destination_warehouse && !movement.source_warehouse && '-'}
                      </TableCell>
                      {/* B6 Columns */}
                      <TableCell className="text-right font-mono bg-primary/5">
                        {isInventory ? '-' : formatNumber(movement.quantity_b6)}
                      </TableCell>
                      <TableCell className="text-right font-mono bg-primary/5">
                        {theoreticalStock ? formatNumber(theoreticalStock.b6) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono bg-primary/5">
                        {isInventory ? formatNumber(movement.quantity_b6) : (lastInventory ? formatNumber(lastInventory.quantity_b6) : '-')}
                      </TableCell>
                      <TableCell className="text-right bg-primary/5">
                        {isInventory ? renderGap(theoreticalStock ? theoreticalStock.b6 - movement.quantity_b6 : 0) : (lastInventory ? renderGap(b6Gap) : '-')}
                      </TableCell>
                      {/* B12 Columns */}
                      <TableCell className="text-right font-mono bg-amber-50">
                        {isInventory ? '-' : formatNumber(movement.quantity_b12)}
                      </TableCell>
                      <TableCell className="text-right font-mono bg-amber-50">
                        {theoreticalStock ? formatNumber(theoreticalStock.b12) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono bg-amber-50">
                        {isInventory ? formatNumber(movement.quantity_b12) : (lastInventory ? formatNumber(lastInventory.quantity_b12) : '-')}
                      </TableCell>
                      <TableCell className="text-right bg-amber-50">
                        {isInventory ? renderGap(theoreticalStock ? theoreticalStock.b12 - movement.quantity_b12 : 0) : (lastInventory ? renderGap(b12Gap) : '-')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(movement)}
                            disabled={loading}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(movement)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} sur {totalPages} ({totalCount} mouvements)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le mouvement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Type de mouvement */}
              <div className="space-y-2">
                <Label>Type de mouvement</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, movement_type: value as MovementType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree">Entrée</SelectItem>
                    <SelectItem value="sortie">Sortie</SelectItem>
                    <SelectItem value="inventaire">Inventaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.movement_date}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) =>
                    setFormData({ ...formData, movement_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>N° Bon</Label>
                <Input
                  value={formData.bon_number}
                  onChange={(e) =>
                    setFormData({ ...formData, bon_number: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Provenance (pour entrées) */}
              {formData.movement_type === 'entree' && (
                <div className="space-y-2">
                  <Label>Provenance</Label>
                  <Select
                    value={formData.source_warehouse || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source_warehouse: value as WarehouseType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_WAREHOUSES_FOR_TRANSFERS.filter((w) => w !== editingMovement?.warehouse).map((w) => (
                        <SelectItem key={w} value={w}>
                          {WAREHOUSE_LABELS[w]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destination (pour sorties) */}
              {formData.movement_type === 'sortie' && (
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select
                    value={formData.destination_warehouse || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, destination_warehouse: value as WarehouseType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_WAREHOUSES_FOR_TRANSFERS.filter((w) => w !== editingMovement?.warehouse).map((w) => (
                        <SelectItem key={w} value={w}>
                          {WAREHOUSE_LABELS[w]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Nature (pour entrées) */}
              {formData.movement_type === 'entree' && (
                <div className="space-y-2">
                  <Label>Nature</Label>
                  <Select
                    value={formData.origin || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, origin: value as BottleOrigin })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fabrique">Fabriqué</SelectItem>
                      <SelectItem value="requalifie">Requalifié</SelectItem>
                      <SelectItem value="ventes">Ventes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>B6</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_b6}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_b6: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>B12</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_b12}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_b12: e.target.value })
                  }
                />
              </div>
            </div>

            {editingMovement?.linked_movement_id && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Ce mouvement est lié à un transfert. Les modifications seront appliquées aux deux mouvements.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSubmit} disabled={loading}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, movement: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer ce mouvement ?
              {deleteConfirm.movement?.linked_movement_id && (
                <span className="block mt-2 text-yellow-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Ce mouvement est lié à un transfert. Les deux mouvements seront supprimés.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog (Stock Insufficient) */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => !open && setErrorDialog({ open: false, title: '', message: '' })}
      >
        <AlertDialogContent className="border-red-200 bg-red-50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-600">
              {errorDialog.message}
              {errorDialog.details && (
                <div className="mt-3 p-3 bg-white rounded border border-red-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {errorDialog.details.available_b6 !== undefined && (
                      <>
                        <span>B6 disponible:</span>
                        <span className="font-mono">{formatNumber(errorDialog.details.available_b6)}</span>
                      </>
                    )}
                    {errorDialog.details.required_b6 !== undefined && (
                      <>
                        <span>B6 demandé:</span>
                        <span className="font-mono">{formatNumber(errorDialog.details.required_b6)}</span>
                      </>
                    )}
                    {errorDialog.details.available_b12 !== undefined && (
                      <>
                        <span>B12 disponible:</span>
                        <span className="font-mono">{formatNumber(errorDialog.details.available_b12)}</span>
                      </>
                    )}
                    {errorDialog.details.required_b12 !== undefined && (
                      <>
                        <span>B12 demandé:</span>
                        <span className="font-mono">{formatNumber(errorDialog.details.required_b12)}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockEntryTable;
