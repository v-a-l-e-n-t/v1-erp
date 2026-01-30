import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ATELIER_CLIENT_LABELS, AtelierClientKey, AtelierEntry, AtelierData, AtelierCategory } from '@/types/atelier';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';

// Interface pour une ligne d'historique transformée
export interface AtelierHistoryRow {
  id: string;
  date: string;
  shift_type: string;
  client: AtelierClientKey;
  // BR = Bouteilles rééprouvées
  br6: number;
  br12: number;
  br28: number;
  br38: number;
  // BV = Bouteilles vidangées
  bv6: number;
  bv12: number;
  bv28: number;
  bv38: number;
  // BHS = Bouteilles HS
  bhs6: number;
  bhs12: number;
  bhs28: number;
  bhs38: number;
  // CPT = Clapet monté
  cpt6: number;
  cpt12: number;
  cpt28: number;
  cpt38: number;
  originalEntry: AtelierEntry; // Référence à l'entrée originale pour la mise à jour
}

interface AtelierHistoryTableProps {
  filterType: 'all' | 'year' | 'month' | 'period' | 'day';
  selectedYear: number;
  selectedMonth: string;
  selectedDate: Date | undefined;
  dateRange: DateRange | undefined;
  onFilterChange: (type: 'all' | 'year' | 'month' | 'period' | 'day', year?: number, month?: string, date?: Date, range?: DateRange) => void;
  availableMonths: string[];
  availableYears: number[];
}

const AtelierHistoryTable = ({
  filterType,
  selectedYear,
  selectedMonth,
  selectedDate,
  dateRange,
  onFilterChange,
  availableMonths,
  availableYears
}: AtelierHistoryTableProps) => {
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<AtelierEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Années disponibles (comme le filtre KPI)
  const availableYearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);
  
  // Mois disponibles pour l'année sélectionnée (pour le filtre mois)
  const availableMonthsForYear = useMemo(() => {
    if (filterType !== 'month') return [];
    // Générer les 12 mois de l'année sélectionnée
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse(); // Plus récent en premier
  }, [selectedYear, filterType]);
  const [editingRow, setEditingRow] = useState<{ id: string; client: AtelierClientKey } | null>(null);
  const [editingData, setEditingData] = useState<{ br6: number; br12: number; br28: number; br38: number; bv6: number; bv12: number; bv28: number; bv38: number; bhs6: number; bhs12: number; bhs28: number; bhs38: number; cpt6: number; cpt12: number; cpt28: number; cpt38: number } | null>(null);
  const [selectedClient, setSelectedClient] = useState<AtelierClientKey | 'all'>('all');
  const [selectedBottleType, setSelectedBottleType] = useState<'BR' | 'BV' | 'BHS' | 'CPT' | 'all'>('all');

  useEffect(() => {
    fetchEntries();
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = (supabase as any).from('atelier_entries').select('*').order('date', { ascending: false });

      if (filterType === 'all') {
        // Pas de filtre, récupérer toutes les données
      } else if (filterType === 'year') {
        query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
      } else if (filterType === 'month') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDateObj = endOfMonth(new Date(y, m - 1, 1));
        const endDate = format(endDateObj, 'yyyy-MM-dd');
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (filterType === 'day' && selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        query = query.eq('date', dateStr);
      } else if (filterType === 'period' && dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        query = query.gte('date', fromStr).lte('date', toStr);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries((data || []) as AtelierEntry[]);
    } catch (error) {
      console.error('Error fetching atelier entries:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  // Transformer les entrées en lignes d'historique (une ligne par entrée x client)
  // Correspondance: BR = bouteilles_reeprouvees, BV = bouteilles_vidangees, BHS = bouteilles_hs, CPT = clapet_monte
  const historyRows = useMemo(() => {
    const rows: AtelierHistoryRow[] = [];
    
    entries.forEach(entry => {
      const data = entry.data as AtelierData;
      (Object.keys(ATELIER_CLIENT_LABELS) as AtelierClientKey[]).forEach(client => {
        const clientData = data[client];
        if (!clientData) return;

        rows.push({
          id: `${entry.id}_${client}`,
          date: entry.date,
          shift_type: entry.shift_type,
          client,
          // BR = Bouteilles rééprouvées
          br6: clientData.bouteilles_reeprouvees?.B6 || 0,
          br12: clientData.bouteilles_reeprouvees?.B12 || 0,
          br28: clientData.bouteilles_reeprouvees?.B28 || 0,
          br38: clientData.bouteilles_reeprouvees?.B38 || 0,
          // BV = Bouteilles vidangées
          bv6: clientData.bouteilles_vidangees?.B6 || 0,
          bv12: clientData.bouteilles_vidangees?.B12 || 0,
          bv28: clientData.bouteilles_vidangees?.B28 || 0,
          bv38: clientData.bouteilles_vidangees?.B38 || 0,
          // BHS = Bouteilles HS
          bhs6: clientData.bouteilles_hs?.B6 || 0,
          bhs12: clientData.bouteilles_hs?.B12 || 0,
          bhs28: clientData.bouteilles_hs?.B28 || 0,
          bhs38: clientData.bouteilles_hs?.B38 || 0,
          // CPT = Clapet monté
          cpt6: clientData.clapet_monte?.B6 || 0,
          cpt12: clientData.clapet_monte?.B12 || 0,
          cpt28: clientData.clapet_monte?.B28 || 0,
          cpt38: clientData.clapet_monte?.B38 || 0,
          originalEntry: entry,
        });
      });
    });

    // Appliquer les filtres
    let filtered = rows;

    // Filtre par client
    if (selectedClient !== 'all') {
      filtered = filtered.filter(row => row.client === selectedClient);
    }

    // Filtre par type de bouteille (afficher uniquement les lignes qui ont des valeurs > 0 pour ce type)
    if (selectedBottleType !== 'all') {
      filtered = filtered.filter(row => {
        switch (selectedBottleType) {
          case 'BR':
            return (row.br6 + row.br12 + row.br28 + row.br38) > 0;
          case 'BV':
            return (row.bv6 + row.bv12 + row.bv28 + row.bv38) > 0;
          case 'BHS':
            return (row.bhs6 + row.bhs12 + row.bhs28 + row.bhs38) > 0;
          case 'CPT':
            return (row.cpt6 + row.cpt12 + row.cpt28 + row.cpt38) > 0;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.client.localeCompare(b.client);
    });
  }, [entries, selectedClient, selectedBottleType]);

  const handleEdit = (row: AtelierHistoryRow) => {
    setEditingRow({ id: row.originalEntry.id!, client: row.client });
    setEditingData({
      br6: row.br6,
      br12: row.br12,
      br28: row.br28,
      br38: row.br38,
      bv6: row.bv6,
      bv12: row.bv12,
      bv28: row.bv28,
      bv38: row.bv38,
      bhs6: row.bhs6,
      bhs12: row.bhs12,
      bhs28: row.bhs28,
      bhs38: row.bhs38,
      cpt6: row.cpt6,
      cpt12: row.cpt12,
      cpt28: row.cpt28,
      cpt38: row.cpt38,
    });
  };

  const handleSave = async (row: AtelierHistoryRow) => {
    if (!editingData) return;

    try {
      const entry = row.originalEntry;
      const data = entry.data as AtelierData;
      const clientData = { ...data[row.client] };

      // Mettre à jour les valeurs
      clientData.bouteilles_reeprouvees = {
        B6: editingData.br6,
        B12: editingData.br12,
        B28: editingData.br28,
        B38: editingData.br38,
      };
      clientData.bouteilles_vidangees = {
        B6: editingData.bv6,
        B12: editingData.bv12,
        B28: editingData.bv28,
        B38: editingData.bv38,
      };
      clientData.bouteilles_hs = {
        B6: editingData.bhs6,
        B12: editingData.bhs12,
        B28: editingData.bhs28,
        B38: editingData.bhs38,
      };
      clientData.clapet_monte = {
        B6: editingData.cpt6,
        B12: editingData.cpt12,
        B28: editingData.cpt28,
        B38: editingData.cpt38,
      };

      const updatedData: AtelierData = {
        ...data,
        [row.client]: clientData,
      };

      const { error } = await (supabase as any)
        .from('atelier_entries')
        .update({
          data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Entrée modifiée avec succès');
      setEditingRow(null);
      setEditingData(null);
      fetchEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditingData(null);
  };

  const handleDelete = async (row: AtelierHistoryRow) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer les données de ${ATELIER_CLIENT_LABELS[row.client]} pour cette entrée ?`)) return;

    try {
      const entry = row.originalEntry;
      const data = entry.data as AtelierData;
      
      // Retirer le client de l'entrée
      const updatedData: AtelierData = { ...data };
      delete updatedData[row.client];

      // Vérifier s'il reste d'autres clients dans l'entrée
      const remainingClients = Object.keys(updatedData).filter(
        key => updatedData[key as AtelierClientKey] && 
        Object.values(updatedData[key as AtelierClientKey]).some(cat => 
          cat && Object.values(cat).some(val => val > 0)
        )
      );

      if (remainingClients.length === 0) {
        // Si aucun client ne reste, supprimer complètement l'entrée
        const { error } = await (supabase as any)
          .from('atelier_entries')
          .delete()
          .eq('id', entry.id);

        if (error) throw error;
        toast.success('Entrée supprimée avec succès');
      } else {
        // Sinon, mettre à jour l'entrée sans ce client
        const { error } = await (supabase as any)
          .from('atelier_entries')
          .update({
            data: updatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;
        toast.success(`Données de ${ATELIER_CLIENT_LABELS[row.client]} supprimées avec succès`);
      }

      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExportExcel = () => {
    if (historyRows.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      // Préparer les données pour l'export
      const exportData = historyRows.map(row => ({
        'Date': format(new Date(row.date), 'dd/MM/yyyy'),
        'Shift': row.shift_type,
        'Client': ATELIER_CLIENT_LABELS[row.client],
        'BR 6kg': row.br6,
        'BR 12kg': row.br12,
        'BR 28kg': row.br28,
        'BR 38kg': row.br38,
        'BV 6kg': row.bv6,
        'BV 12kg': row.bv12,
        'BV 28kg': row.bv28,
        'BV 38kg': row.bv38,
        'BHS 6kg': row.bhs6,
        'BHS 12kg': row.bhs12,
        'BHS 28kg': row.bhs28,
        'BHS 38kg': row.bhs38,
        'CPT 6kg': row.cpt6,
        'CPT 12kg': row.cpt12,
        'CPT 28kg': row.cpt28,
        'CPT 38kg': row.cpt38,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      // Définir les largeurs de colonnes
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 8 },  // Shift
        { wch: 20 }, // Client
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // BR
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // BV
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // BHS
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // CPT
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historique Atelier');

      // Générer le nom du fichier avec la date
      const timestamp = format(new Date(), 'yyyy-MM-dd');
      XLSX.writeFile(wb, `historique-atelier-${timestamp}.xlsx`);

      toast.success('Export Excel réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  return (
    <div>
        {/* Filtres */}
        <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
          <span className="text-sm font-semibold">Filtres:</span>
          
          {/* Filtre temporel - DATE */}
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

          {/* Choix selon le type de filtre temporel */}
          {filterType === 'year' && (
            <Select value={selectedYear.toString()} onValueChange={v => onFilterChange('year', Number(v))}>
              <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYearsList.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
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
                  {availableYearsList.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
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

          {/* Filtre par client - Tous les clients */}
          <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v as AtelierClientKey | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {(Object.keys(ATELIER_CLIENT_LABELS) as AtelierClientKey[]).map(client => (
                <SelectItem key={client} value={client}>
                  {ATELIER_CLIENT_LABELS[client]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre par type de bouteille - Tous les types */}
          <Select value={selectedBottleType} onValueChange={(v) => setSelectedBottleType(v as 'BR' | 'BV' | 'BHS' | 'CPT' | 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="BR">Bouteilles rééprouvées (BR)</SelectItem>
              <SelectItem value="BV">Bouteilles vidangées (BV)</SelectItem>
              <SelectItem value="BHS">Bouteilles HS (BHS)</SelectItem>
              <SelectItem value="CPT">Clapet monté (CPT)</SelectItem>
            </SelectContent>
          </Select>

          {/* Bouton d'export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={historyRows.length === 0}
            className="ml-auto"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
        </div>

        {/* Tableau */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
        ) : historyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">BR6</TableHead>
                  <TableHead className="text-center">BR12</TableHead>
                  <TableHead className="text-center">BR28</TableHead>
                  <TableHead className="text-center">BR38</TableHead>
                  <TableHead className="text-center">BV6</TableHead>
                  <TableHead className="text-center">BV12</TableHead>
                  <TableHead className="text-center">BV28</TableHead>
                  <TableHead className="text-center">BV38</TableHead>
                  <TableHead className="text-center">BHS6</TableHead>
                  <TableHead className="text-center">BHS12</TableHead>
                  <TableHead className="text-center">BHS28</TableHead>
                  <TableHead className="text-center">BHS38</TableHead>
                  <TableHead className="text-center">CPT6</TableHead>
                  <TableHead className="text-center">CPT12</TableHead>
                  <TableHead className="text-center">CPT28</TableHead>
                  <TableHead className="text-center">CPT38</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => (
                  <TableRow key={row.id}>
                    {editingRow?.id === row.originalEntry.id && editingRow.client === row.client ? (
                      <>
                        <TableCell>{format(new Date(row.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{row.shift_type}</TableCell>
                        <TableCell>{ATELIER_CLIENT_LABELS[row.client]}</TableCell>
                        {['br6', 'br12', 'br28', 'br38', 'bv6', 'bv12', 'bv28', 'bv38', 'bhs6', 'bhs12', 'bhs28', 'bhs38', 'cpt6', 'cpt12', 'cpt28', 'cpt38'].map(field => (
                          <TableCell key={field}>
                            <Input
                              type="number"
                              min={0}
                              value={editingData?.[field as keyof typeof editingData] || 0}
                              onChange={(e) => setEditingData({ ...editingData!, [field]: parseInt(e.target.value) || 0 })}
                              className="h-8 w-20 text-right"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(row)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{format(new Date(row.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{row.shift_type}</TableCell>
                        <TableCell>{ATELIER_CLIENT_LABELS[row.client]}</TableCell>
                        <TableCell className="text-right">{row.br6.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.br12.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.br28.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.br38.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bv6.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bv12.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bv28.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bv38.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bhs6.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bhs12.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bhs28.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.bhs38.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.cpt6.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.cpt12.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.cpt28.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{row.cpt38.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(row)}
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
        )}
    </div>
  );
};

export default AtelierHistoryTable;

