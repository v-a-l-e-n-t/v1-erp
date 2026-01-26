import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Pencil, Trash2, Save, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReceptionData {
  id: string;
  date: string;
  client: string;
  poids_kg: number;
}

const CLIENT_LABELS: Record<string, string> = {
  'TOTAL_ENERGIES': 'Total Énergies',
  'PETRO_IVOIRE': 'Petro Ivoire',
  'VIVO_ENERGIES': 'Vivo Énergies'
};

interface ReceptionsHistoryTableProps {
  filterType: 'all' | 'year' | 'month' | 'period' | 'day';
  selectedYear: number;
  selectedMonth: string;
  selectedDate: Date | undefined;
  dateRange: DateRange | undefined;
  onFilterChange: (type: 'all' | 'year' | 'month' | 'period' | 'day', year?: number, month?: string, date?: Date, range?: DateRange) => void;
  availableMonths: string[];
  availableYears: number[];
}

const ReceptionsHistoryTable = ({
  filterType,
  selectedYear,
  selectedMonth,
  selectedDate,
  dateRange,
  onFilterChange,
  availableMonths,
  availableYears
}: ReceptionsHistoryTableProps) => {
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<ReceptionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ date: string; client: string; poids_kg: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReception, setNewReception] = useState<{ date: string; client: string; poids_kg: number }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    client: 'TOTAL_ENERGIES',
    poids_kg: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Mois disponibles pour l'année sélectionnée (pour le filtre mois)
  const availableMonthsForYear = useMemo(() => {
    if (filterType !== 'month') return [];
    // Générer les 12 mois de l'année sélectionnée
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse(); // Plus récent en premier
  }, [selectedYear, filterType]);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const BATCH_SIZE = 1000;
        const allEntries: ReceptionData[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let query: any = (supabase as any).from('receptions_clients').select('*');

          if (filterType === 'all') {
            // Pas de filtre, récupérer toutes les données
          } else if (filterType === 'year') {
            query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
          } else if (filterType === 'month' && selectedMonth) {
            const [y, m] = selectedMonth.split('-').map(Number);
            const start = `${y}-${String(m).padStart(2, '0')}-01`;
            const endDateObj = endOfMonth(new Date(y, m - 1, 1));
            const end = format(endDateObj, 'yyyy-MM-dd');
            query = query.gte('date', start).lte('date', end);
          } else if (filterType === 'day' && selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            query = query.eq('date', dateStr);
          } else if (filterType === 'period' && dateRange?.from) {
            const fromStr = format(dateRange.from, 'yyyy-MM-dd');
            const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
            query = query.gte('date', fromStr).lte('date', toStr);
          }

          query = query.order('date', { ascending: false }).range(offset, offset + BATCH_SIZE - 1);

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            allEntries.push(...data);
            hasMore = data.length === BATCH_SIZE;
            offset += BATCH_SIZE;
          } else {
            hasMore = false;
          }
        }

        setEntries(allEntries);
      } catch (error: any) {
        console.error('Error fetching receptions history:', error);
        toast.error('Erreur lors du chargement de l\'historique');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (filterClient !== 'all') {
      filtered = filtered.filter(e => e.client === filterClient);
    }
    return filtered;
  }, [entries, filterClient]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange, filterClient]);

  // Paginated entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));

  const handleSave = async () => {
    if (!editingId || !editingData) return;
    try {
      const { error } = await (supabase as any)
        .from('receptions_clients')
        .update({
          date: editingData.date,
          client: editingData.client,
          poids_kg: editingData.poids_kg
        })
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Réception modifiée avec succès');
      setEditingId(null);
      setEditingData(null);
      // Recharger les données
      const fetchEntries = async () => {
        let query: any = (supabase as any).from('receptions_clients').select('*');
        if (filterType === 'year') {
          query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
        } else if (filterType === 'month' && selectedMonth) {
          const [y, m] = selectedMonth.split('-').map(Number);
          const start = `${y}-${String(m).padStart(2, '0')}-01`;
          const endDateObj = endOfMonth(new Date(y, m - 1, 1));
          const end = format(endDateObj, 'yyyy-MM-dd');
          query = query.gte('date', start).lte('date', end);
        } else if (filterType === 'day' && selectedDate) {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          query = query.eq('date', dateStr);
        } else if (filterType === 'period' && dateRange?.from) {
          const fromStr = format(dateRange.from, 'yyyy-MM-dd');
          const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
          query = query.gte('date', fromStr).lte('date', toStr);
        }
        query = query.order('date', { ascending: false });
        const { data } = await query;
        setEntries(data || []);
      };
      fetchEntries();
    } catch (error: any) {
      console.error('Error updating reception:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await (supabase as any)
        .from('receptions_clients')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success('Réception supprimée avec succès');
      setDeleteId(null);
      // Recharger les données
      const fetchEntries = async () => {
        let query: any = (supabase as any).from('receptions_clients').select('*');
        if (filterType === 'year') {
          query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
        } else if (filterType === 'month' && selectedMonth) {
          const [y, m] = selectedMonth.split('-').map(Number);
          const start = `${y}-${String(m).padStart(2, '0')}-01`;
          const endDateObj = endOfMonth(new Date(y, m - 1, 1));
          const end = format(endDateObj, 'yyyy-MM-dd');
          query = query.gte('date', start).lte('date', end);
        } else if (filterType === 'day' && selectedDate) {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          query = query.eq('date', dateStr);
        } else if (filterType === 'period' && dateRange?.from) {
          const fromStr = format(dateRange.from, 'yyyy-MM-dd');
          const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
          query = query.gte('date', fromStr).lte('date', toStr);
        }
        query = query.order('date', { ascending: false });
        const { data } = await query;
        setEntries(data || []);
      };
      fetchEntries();
    } catch (error: any) {
      console.error('Error deleting reception:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddReception = async () => {
    if (!newReception.date || !newReception.client || newReception.poids_kg <= 0) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('receptions_clients')
        .insert([{
          date: newReception.date,
          client: newReception.client,
          poids_kg: newReception.poids_kg
        }]);

      if (error) throw error;
      
      toast.success('Réception enregistrée avec succès');
      setIsAddModalOpen(false);
      setNewReception({
        date: format(new Date(), 'yyyy-MM-dd'),
        client: 'TOTAL_ENERGIES',
        poids_kg: 0
      });
      
      // Recharger les données
      const fetchEntries = async () => {
        setLoading(true);
        try {
          const BATCH_SIZE = 1000;
          const allEntries: ReceptionData[] = [];
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            let query: any = (supabase as any).from('receptions_clients').select('*');

            if (filterType === 'all') {
              // Pas de filtre, récupérer toutes les données
            } else if (filterType === 'year') {
              query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
            } else if (filterType === 'month' && selectedMonth) {
              const [y, m] = selectedMonth.split('-').map(Number);
              const start = `${y}-${String(m).padStart(2, '0')}-01`;
              const endDateObj = endOfMonth(new Date(y, m - 1, 1));
              const end = format(endDateObj, 'yyyy-MM-dd');
              query = query.gte('date', start).lte('date', end);
            } else if (filterType === 'day' && selectedDate) {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              query = query.eq('date', dateStr);
            } else if (filterType === 'period' && dateRange?.from) {
              const fromStr = format(dateRange.from, 'yyyy-MM-dd');
              const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
              query = query.gte('date', fromStr).lte('date', toStr);
            }

            query = query.order('date', { ascending: false }).range(offset, offset + BATCH_SIZE - 1);

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
              allEntries.push(...data);
              hasMore = data.length === BATCH_SIZE;
              offset += BATCH_SIZE;
            } else {
              hasMore = false;
            }
          }

          setEntries(allEntries);
        } catch (error: any) {
          console.error('Error fetching receptions history:', error);
          toast.error('Erreur lors du chargement de l\'historique');
        } finally {
          setLoading(false);
        }
      };
      fetchEntries();
    } catch (error: any) {
      console.error('Error adding reception:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Saisie
        </Button>
        <span className="text-sm font-semibold">Filtres:</span>
        
        <Select value={filterType} onValueChange={(v: 'all' | 'year' | 'month' | 'period' | 'day') => onFilterChange(v)}>
          <SelectTrigger className="h-8 sm:h-9 w-[140px] sm:w-[160px] text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="year">Année</SelectItem>
            <SelectItem value="month">Mois</SelectItem>
            <SelectItem value="period">Période</SelectItem>
            <SelectItem value="day">Jour</SelectItem>
          </SelectContent>
        </Select>

        {filterType === 'year' && (
          <Select value={selectedYear.toString()} onValueChange={v => onFilterChange('year', Number(v))}>
            <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterType === 'month' && (
          <>
            <Select value={selectedYear.toString()} onValueChange={v => onFilterChange('month', Number(v))}>
              <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={v => onFilterChange('month', selectedYear, v)}>
              <SelectTrigger className="h-8 sm:h-9 w-[160px] sm:w-[180px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonthsForYear.map(month => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {filterType === 'day' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 sm:h-9 w-[160px] sm:w-[180px] justify-start text-left font-normal text-xs sm:text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => onFilterChange('day', undefined, undefined, date)}
                locale={fr}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        )}

        {filterType === 'period' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 sm:h-9 w-[250px] sm:w-[300px] justify-start text-left font-normal text-xs sm:text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'PPP', { locale: fr })} - ${format(dateRange.to, 'PPP', { locale: fr })}`
                  ) : (
                    format(dateRange.from, 'PPP', { locale: fr })
                  )
                ) : (
                  'Sélectionner une période'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => onFilterChange('period', undefined, undefined, undefined, range)}
                locale={fr}
                disabled={{ after: new Date() }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-8 sm:h-9 w-[180px] text-xs sm:text-sm">
            <SelectValue placeholder="Tous les clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
            <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
            <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
          </SelectContent>
        </Select>

        {/* Indicateur du nombre de répartitions */}
        <div className="ml-auto">
          {loading ? (
            <span className="text-sm text-muted-foreground">Chargement...</span>
          ) : (
            <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
              {filteredEntries.length} répartition{filteredEntries.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Chargement...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Aucune réception trouvée avec ces filtres</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Poids (Kg)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    {editingId === entry.id && editingData ? (
                      <>
                        <TableCell>
                          <Input
                            type="date"
                            value={editingData.date}
                            onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editingData.client}
                            onValueChange={(v) => setEditingData({ ...editingData, client: v })}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                              <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                              <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingData.poids_kg}
                            onChange={(e) => setEditingData({ ...editingData, poids_kg: parseFloat(e.target.value) || 0 })}
                            className="text-right"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={handleSave}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditingData(null); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                        <TableCell>{CLIENT_LABELS[entry.client] || entry.client}</TableCell>
                        <TableCell className="text-right">{entry.poids_kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(entry.id);
                                setEditingData({
                                  date: entry.date,
                                  client: entry.client,
                                  poids_kg: entry.poids_kg
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(entry.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {filteredEntries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredEntries.length)} sur {filteredEntries.length} entrées
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px] text-xs">
                    <SelectValue placeholder={itemsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">par page</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette réception ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de saisie de réception */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle réception</DialogTitle>
            <DialogDescription>
              Saisissez les informations de la réception à enregistrer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newReception.date}
                onChange={(e) => setNewReception({ ...newReception, date: e.target.value })}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={newReception.client}
                onValueChange={(value) => setNewReception({ ...newReception, client: value })}
              >
                <SelectTrigger id="client" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                  <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                  <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poids">Poids (Kg)</Label>
              <Input
                id="poids"
                type="number"
                value={newReception.poids_kg || ''}
                onChange={(e) => setNewReception({ ...newReception, poids_kg: parseFloat(e.target.value) || 0 })}
                step="0.1"
                min="0"
                placeholder="0.0"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewReception({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  client: 'TOTAL_ENERGIES',
                  poids_kg: 0
                });
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddReception}
              disabled={isSubmitting || !newReception.date || !newReception.client || newReception.poids_kg <= 0}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceptionsHistoryTable;
