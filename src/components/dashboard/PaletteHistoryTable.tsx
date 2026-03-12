import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, FileSpreadsheet, ChevronsUpDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

const CLIENT_LABELS: Record<string, string> = {
  PETRO_IVOIRE: 'PETRO IVOIRE',
  TOTAL_ENERGIES: 'TOTAL ENERGIES',
  VIVO_ENERGY: 'VIVO ENERGY',
};

export interface PaletteEntry {
  id: string;
  date: string;
  client: string;
  mandataire_id: string;
  capacite: number;
  num_camion: string | null;
  b6: number;
  b12: number;
  b28: number;
  b38: number;
  palette_b6_normale: number;
  palette_b6_courte: number;
  palette_b12_ordinaire: number;
  palette_b12_superpo: number;
  mandataires?: { nom: string } | null;
}

type EditingData = {
  date: string;
  client: string;
  mandataire_id: string;
  capacite: number;
  num_camion: string;
  b6: number;
  b12: number;
  b28: number;
  b38: number;
  palette_b6_normale: number;
  palette_b6_courte: number;
  palette_b12_ordinaire: number;
  palette_b12_superpo: number;
};

interface Mandataire {
  id: string;
  nom: string;
}

interface PaletteHistoryTableProps {
  filterType: 'all' | 'year' | 'month' | 'period' | 'day';
  selectedYear: number;
  selectedMonth: string;
  selectedDate: Date | undefined;
  dateRange: DateRange | undefined;
  onFilterChange: (type: 'all' | 'year' | 'month' | 'period' | 'day', year?: number, month?: string, date?: Date, range?: DateRange) => void;
}

const PaletteHistoryTable = ({
  filterType, selectedYear, selectedMonth, selectedDate, dateRange, onFilterChange
}: PaletteHistoryTableProps) => {
  const [entries, setEntries] = useState<PaletteEntry[]>([]);
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const [editingEntry, setEditingEntry] = useState<PaletteEntry | null>(null);
  const [editingData, setEditingData] = useState<EditingData | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<PaletteEntry | null>(null);
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterMandataire, setFilterMandataire] = useState<string>('all');
  const [filterMandataireOpen, setFilterMandataireOpen] = useState(false);
  const [mandataireSearch, setMandataireSearch] = useState('');

  const availableYearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const availableMonthsForYear = useMemo(() => {
    if (filterType !== 'month') return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear, filterType]);

  useEffect(() => {
    fetchMandataires();
  }, []);

  useEffect(() => {
    fetchEntries();
    setCurrentPage(1);
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  const fetchMandataires = async () => {
    const { data } = await (supabase as any).from('mandataires').select('id, nom').order('nom');
    if (data) setMandataires(data);
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('palette_entries')
        .select('*, mandataires(nom)')
        .order('date', { ascending: false });

      if (filterType === 'year') {
        query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
      } else if (filterType === 'month') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = format(endOfMonth(new Date(y, m - 1, 1)), 'yyyy-MM-dd');
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (filterType === 'day' && selectedDate) {
        query = query.eq('date', format(selectedDate, 'yyyy-MM-dd'));
      } else if (filterType === 'period' && dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        query = query.gte('date', fromStr).lte('date', toStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as PaletteEntry[]);
    } catch (error) {
      console.error('Error fetching palette entries:', error);
      toast.error('Erreur lors du chargement de l\'historique palette');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    setCurrentPage(1);
    return entries.filter(e => {
      if (filterClient !== 'all' && e.client !== filterClient) return false;
      if (filterMandataire !== 'all' && e.mandataire_id !== filterMandataire) return false;
      return true;
    });
  }, [entries, filterClient, filterMandataire]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pagedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const getMandataireNom = (entry: PaletteEntry) =>
    (entry.mandataires as any)?.nom ?? mandataires.find(m => m.id === entry.mandataire_id)?.nom ?? '—';

  const handleEdit = (entry: PaletteEntry) => {
    setEditingEntry(entry);
    setEditingData({
      date: entry.date,
      client: entry.client,
      mandataire_id: entry.mandataire_id,
      capacite: entry.capacite,
      num_camion: entry.num_camion ?? '',
      b6: entry.b6,
      b12: entry.b12,
      b28: entry.b28,
      b38: entry.b38,
      palette_b6_normale: entry.palette_b6_normale,
      palette_b6_courte: entry.palette_b6_courte,
      palette_b12_ordinaire: entry.palette_b12_ordinaire,
      palette_b12_superpo: entry.palette_b12_superpo,
    });
    setMandataireSearch('');
  };

  const filteredMandatairesInEdit = useMemo(() => {
    if (!mandataireSearch.trim()) return mandataires;
    const q = mandataireSearch.toLowerCase();
    return mandataires.filter(m => m.nom.toLowerCase().includes(q));
  }, [mandataires, mandataireSearch]);

  const handleSave = async () => {
    if (!editingEntry || !editingData) return;
    try {
      const { error } = await (supabase as any)
        .from('palette_entries')
        .update({
          date: editingData.date,
          client: editingData.client,
          mandataire_id: editingData.mandataire_id,
          capacite: editingData.capacite,
          num_camion: editingData.num_camion || null,
          b6: editingData.b6,
          b12: editingData.b12,
          b28: editingData.b28,
          b38: editingData.b38,
          palette_b6_normale: editingData.palette_b6_normale,
          palette_b6_courte: editingData.palette_b6_courte,
          palette_b12_ordinaire: editingData.palette_b12_ordinaire,
          palette_b12_superpo: editingData.palette_b12_superpo,
        })
        .eq('id', editingEntry.id);

      if (error) throw error;
      toast.success('Entrée modifiée avec succès');
      setEditingEntry(null);
      setEditingData(null);
      fetchEntries();
    } catch (error) {
      console.error('Error updating palette entry:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    try {
      const { error } = await (supabase as any)
        .from('palette_entries')
        .delete()
        .eq('id', deletingEntry.id);
      if (error) throw error;
      toast.success('Entrée supprimée avec succès');
      setDeletingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Error deleting palette entry:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExportExcel = () => {
    if (filteredEntries.length === 0) { toast.error('Aucune donnée à exporter'); return; }
    try {
      const exportData = filteredEntries.map(e => ({
        'Date': format(new Date(e.date), 'dd/MM/yyyy'),
        'Client': CLIENT_LABELS[e.client] ?? e.client,
        'Mandataire': getMandataireNom(e),
        'Capacité (Kg)': e.capacite,
        'N° Camion': e.num_camion ?? '',
        'B6': e.b6,
        'B12': e.b12,
        'B28': e.b28,
        'B38': e.b38,
        'Palette B6 Normale': e.palette_b6_normale,
        'Palette B6 Courte': e.palette_b6_courte,
        'Palette B12 Ordinaire': e.palette_b12_ordinaire,
        'Palette B12 Superpo': e.palette_b12_superpo,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 14 }, { wch: 12 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historique Palette');
      XLSX.writeFile(wb, `historique-palette-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Export Excel réussi');
    } catch {
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  return (
    <div>
      {/* Filtres */}
      <div className="mb-4 p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">Filtres :</span>

          <Select value={filterType} onValueChange={(v: any) => onFilterChange(v)}>
            <SelectTrigger className="h-8 sm:h-9 w-[140px] sm:w-[160px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="h-8 sm:h-9 w-[100px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYearsList.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}

          {filterType === 'month' && (
            <>
              <Select value={selectedYear.toString()} onValueChange={v => onFilterChange('month', Number(v))}>
                <SelectTrigger className="h-8 sm:h-9 w-[100px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{availableYearsList.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={v => onFilterChange('month', selectedYear, v)}>
                <SelectTrigger className="h-8 sm:h-9 w-[160px] text-xs sm:text-sm"><SelectValue /></SelectTrigger>
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
                <Button variant="outline" className="h-8 sm:h-9 w-[160px] justify-start text-left font-normal text-xs sm:text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={d => onFilterChange('day', undefined, undefined, d)} locale={fr} disabled={{ after: new Date() }} />
              </PopoverContent>
            </Popover>
          )}

          {filterType === 'period' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 sm:h-9 w-[250px] justify-start text-left font-normal text-xs sm:text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to
                      ? `${format(dateRange.from, 'PPP', { locale: fr })} - ${format(dateRange.to, 'PPP', { locale: fr })}`
                      : format(dateRange.from, 'PPP', { locale: fr })
                  ) : 'Sélectionner une période'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={dateRange} onSelect={r => onFilterChange('period', undefined, undefined, undefined, r)} locale={fr} disabled={{ after: new Date() }} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          )}

          <Select value={filterClient} onValueChange={v => { setFilterClient(v); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous les clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {Object.entries(CLIENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre mandataire — combobox avec recherche intégrée */}
          <Popover open={filterMandataireOpen} onOpenChange={setFilterMandataireOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-8 sm:h-9 w-[220px] justify-between text-xs sm:text-sm font-normal">
                <span className="truncate">
                  {filterMandataire === 'all'
                    ? 'Tous les mandataires'
                    : mandataires.find(m => m.id === filterMandataire)?.nom ?? 'Mandataire'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher..." />
                <CommandList>
                  <CommandEmpty>Aucun résultat</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => { setFilterMandataire('all'); setFilterMandataireOpen(false); }}>
                      <Check className={cn('mr-2 h-4 w-4', filterMandataire === 'all' ? 'opacity-100' : 'opacity-0')} />
                      Tous les mandataires
                    </CommandItem>
                    {mandataires.map(m => (
                      <CommandItem key={m.id} value={m.nom} onSelect={() => { setFilterMandataire(m.id); setFilterMandataireOpen(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', filterMandataire === m.id ? 'opacity-100' : 'opacity-0')} />
                        {m.nom}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredEntries.length === 0} className="ml-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
          </Button>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
      ) : (
        <div ref={tableRef} className="overflow-x-auto bg-white p-4 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mandataire</TableHead>
                <TableHead className="text-right">Capacité (Kg)</TableHead>
                <TableHead>N° Camion</TableHead>
                <TableHead className="text-center">B6</TableHead>
                <TableHead className="text-center">B12</TableHead>
                <TableHead className="text-center">B28</TableHead>
                <TableHead className="text-center">B38</TableHead>
                <TableHead className="text-center">Plt B6 Norm.</TableHead>
                <TableHead className="text-center">Plt B6 Courte</TableHead>
                <TableHead className="text-center">Plt B12 Ord.</TableHead>
                <TableHead className="text-center">Plt B12 Sup.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(entry)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setDeletingEntry(entry)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="whitespace-nowrap">{CLIENT_LABELS[entry.client] ?? entry.client}</TableCell>
                  <TableCell className="whitespace-nowrap">{getMandataireNom(entry)}</TableCell>
                  <TableCell className="text-right">{entry.capacite.toLocaleString('fr-FR')}</TableCell>
                  <TableCell>{entry.num_camion ?? '—'}</TableCell>
                  <TableCell className="text-right">{entry.b6.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.b12.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.b28.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.b38.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.palette_b6_normale.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.palette_b6_courte.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.palette_b12_ordinaire.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right">{entry.palette_b12_superpo.toLocaleString('fr-FR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm text-muted-foreground">
              <span>
                {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} sur {filteredEntries.length} entrées
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >«</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >‹</Button>
                <span className="px-3 font-medium">Page {currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >›</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >»</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale d'édition */}
      <Dialog open={!!editingEntry} onOpenChange={open => { if (!open) { setEditingEntry(null); setEditingData(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'entrée palette</DialogTitle>
          </DialogHeader>

          {editingData && (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">

              {/* Date */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Date</Label>
                <Input
                  type="date"
                  value={editingData.date}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setEditingData({ ...editingData, date: e.target.value })}
                  className="w-40"
                />
              </div>

              {/* Client */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Client</Label>
                <Select value={editingData.client} onValueChange={v => setEditingData({ ...editingData, client: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLIENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mandataire avec recherche */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Mandataire / Transporteur</Label>
                <Input
                  placeholder="Rechercher..."
                  value={mandataireSearch}
                  onChange={e => setMandataireSearch(e.target.value)}
                  className="h-8 text-sm mb-1"
                />
                <Select value={editingData.mandataire_id} onValueChange={v => setEditingData({ ...editingData, mandataire_id: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{mandataires.find(m => m.id === editingData.mandataire_id)?.nom ?? 'Sélectionner'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-52 overflow-y-auto">
                    {filteredMandatairesInEdit.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Capacité + N° Camion */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Capacité (Kg)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingData.capacite}
                    onChange={e => setEditingData({ ...editingData, capacite: parseInt(e.target.value) || 0 })}
                    className="h-8 text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">N° Camion</Label>
                  <Input
                    value={editingData.num_camion}
                    onChange={e => setEditingData({ ...editingData, num_camion: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Bouteilles */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-primary">Bouteilles</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['b6', 'b12', 'b28', 'b38'] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{field.toUpperCase()}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editingData[field]}
                        onChange={e => setEditingData({ ...editingData, [field]: parseInt(e.target.value) || 0 })}
                        className="h-8 text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Palettes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-primary">Palettes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { field: 'palette_b6_normale' as const, label: 'B6 Normale' },
                    { field: 'palette_b6_courte' as const, label: 'B6 Courte' },
                    { field: 'palette_b12_ordinaire' as const, label: 'B12 Ordinaire' },
                    { field: 'palette_b12_superpo' as const, label: 'B12 Superpo' },
                  ].map(({ field, label }) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editingData[field]}
                        onChange={e => setEditingData({ ...editingData, [field]: parseInt(e.target.value) || 0 })}
                        className="h-8 text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingEntry(null); setEditingData(null); }}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!deletingEntry} onOpenChange={open => { if (!open) setDeletingEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer l'entrée du <strong>{deletingEntry ? format(new Date(deletingEntry.date), 'dd/MM/yyyy') : ''}</strong> — {deletingEntry ? CLIENT_LABELS[deletingEntry.client] ?? deletingEntry.client : ''} ?
              <br />Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaletteHistoryTable;
