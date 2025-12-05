import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Dashboard from '@/components/Dashboard';
import HistoryTable from '@/components/HistoryTable';
import BilanForm from '@/components/BilanForm';
import { BilanEntry } from '@/types/balance';
import { loadEntries, deleteEntry, updateEntry, exportToExcel, exportToPDF, exportIndividualToPDF } from '@/utils/storage';
import { calculateBilan } from '@/utils/calculations';
import { toast } from 'sonner';
import { BarChart3, FileText, Calculator, ArrowUpRight, ChevronDown, ChevronUp, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CentreEmplisseurView from '@/components/dashboard/CentreEmplisseurView';
import ProductionHistory from '@/components/dashboard/ProductionHistory';
import { ProductionShiftForm } from '@/components/ProductionShiftForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import VentesView from '@/components/dashboard/VentesView';

const DashboardHistorique = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<BilanEntry[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'vrac' | 'emplisseur' | 'sorties'>('overview');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<BilanEntry | null>(null);
  const [productionAnnuelle, setProductionAnnuelle] = useState<number>(0);
  const [sortieVracAnnuelle, setSortieVracAnnuelle] = useState<number>(0);
  const [ventesCE, setVentesCE] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);
  const [isBilansExpanded, setIsBilansExpanded] = useState(false);
  const [isProductionExpanded, setIsProductionExpanded] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Filter state for Centre Emplisseur
  const [filterType, setFilterType] = useState<'month' | 'date' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    return { from: yesterday, to: today };
  });

  // Year filter for annual sections
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // VENTES VRAC ANNUELLE filter state
  const [ventesFilterType, setVentesFilterType] = useState<'month' | 'date' | 'range' | 'year'>('year');
  const [ventesSelectedMonth, setVentesSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [ventesSelectedYear, setVentesSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [ventesSelectedDate, setVentesSelectedDate] = useState<Date | undefined>(undefined);
  const [ventesDateRange, setVentesDateRange] = useState<DateRange | undefined>(undefined);

  // PRODUCTION ANNUELLE CE filter state
  const [productionFilterType, setProductionFilterType] = useState<'month' | 'date' | 'range' | 'year'>('year');
  const [productionSelectedMonth, setProductionSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [productionSelectedYear, setProductionSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [productionSelectedDate, setProductionSelectedDate] = useState<Date | undefined>(undefined);
  const [productionDateRange, setProductionDateRange] = useState<DateRange | undefined>(undefined);

  // VENTES CE filter state
  const [ventesCEFilterType, setVentesCEFilterType] = useState<'month' | 'date' | 'range' | 'year'>('year');
  const [ventesCESelectedMonth, setVentesCESelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [ventesCESelectedYear, setVentesCESelectedYear] = useState<number>(() => new Date().getFullYear());
  const [ventesCESelectedDate, setVentesCESelectedDate] = useState<Date | undefined>(undefined);
  const [ventesCEDateRange, setVentesCEDateRange] = useState<DateRange | undefined>(undefined);

  // Bilan Matière filter state
  const [bilanFilterType, setBilanFilterType] = useState<'month' | 'date' | 'range' | 'year'>('month');
  const [bilanSelectedMonth, setBilanSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bilanSelectedYear, setBilanSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [bilanSelectedDate, setBilanSelectedDate] = useState<Date | undefined>(undefined);
  const [bilanDateRange, setBilanDateRange] = useState<DateRange | undefined>(undefined);

  // Production History States
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [productionHistory, setProductionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<string | null>(null);
  const [editModalData, setEditModalData] = useState<any>(null);
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'month' | 'date' | 'range'>('all');
  const [historySelectedMonth, setHistorySelectedMonth] = useState<string>(currentMonth);
  const [historySelectedDate, setHistorySelectedDate] = useState<Date | undefined>(undefined);
  const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>(undefined);
  const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('all');
  const [historyLigneFilter, setHistoryLigneFilter] = useState<string>('all');
  const [historyChefFilter, setHistoryChefFilter] = useState<string>('all');
  const [allAgents, setAllAgents] = useState<any[]>([]);

  // Generate last 12 months for filter (memoized to avoid duplicates)
  const availableMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }), []);

  useEffect(() => {
    fetchAgents();
  }, []);

  // Load production history when filters change
  useEffect(() => {
    if (activeView === 'vrac') {
      fetchProductionHistory();
    }
  }, [activeView, historyFilterType, historySelectedMonth, historySelectedDate, historyDateRange, historyShiftFilter, historyLigneFilter, historyChefFilter]);

  const fetchAgents = async () => {
    try {
      // Fetch both chefs de quart and chefs de ligne
      const [quartsResult, lignesResult] = await Promise.all([
        supabase.from('chefs_quart').select('*').order('nom'),
        supabase.from('chefs_ligne').select('*').order('nom')
      ]);

      if (quartsResult.error) throw quartsResult.error;
      if (lignesResult.error) throw lignesResult.error;

      // Combine both lists with unique IDs and role info
      const quartsWithRole = (quartsResult.data || []).map(agent => ({ ...agent, role: 'chef_quart' }));
      const lignesWithRole = (lignesResult.data || []).map(agent => ({ ...agent, role: 'chef_ligne' }));

      // Merge and remove duplicates based on name (in case same person is in both tables)
      const allAgentsList = [...quartsWithRole, ...lignesWithRole];
      setAllAgents(allAgentsList);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchProductionHistory = async () => {
    try {
      setHistoryLoading(true);

      // Determine date range based on filter type
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (historyFilterType === 'month') {
        startDate = `${historySelectedMonth}-01`;
        const [y, m] = historySelectedMonth.split('-').map(Number);
        endDate = new Date(y, m, 0).toISOString().split('T')[0];
      } else if (historyFilterType === 'date' && historySelectedDate) {
        startDate = format(historySelectedDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (historyFilterType === 'range' && historyDateRange?.from) {
        startDate = format(historyDateRange.from, 'yyyy-MM-dd');
        endDate = historyDateRange.to ? format(historyDateRange.to, 'yyyy-MM-dd') : startDate;
      }

      // Build query
      let query = supabase
        .from('production_shifts')
        .select(`
                    *,
                    lignes_production(*),
                    arrets_production(*),
                    production_modifications(*)
                `)
        .order('date', { ascending: false })
        .order('shift_type', { ascending: false });

      // Apply date filters only if a period is defined
      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      // Apply filters
      if (historyShiftFilter !== 'all') {
        const shiftValue = historyShiftFilter === '1' ? '10h-19h' : '20h-5h';
        query = query.eq('shift_type', shiftValue);
      }

      // Note: Chef filter is applied in memory to handle both Chef de Quart and Chef de Ligne roles

      const { data, error } = await query;

      if (error) throw error;

      // Fetch chef_quart data separately since FK relationship doesn't exist
      let shiftsWithChefs = data || [];
      if (shiftsWithChefs.length > 0) {
        const chefIds = [...new Set(shiftsWithChefs.map((s: any) => s.chef_quart_id).filter(Boolean))];
        if (chefIds.length > 0) {
          const { data: chefsData } = await supabase
            .from('chefs_quart')
            .select('id, nom, prenom')
            .in('id', chefIds);

          const chefsMap = new Map((chefsData || []).map((c: any) => [c.id, c]));
          shiftsWithChefs = shiftsWithChefs.map((shift: any) => ({
            ...shift,
            chef_quart: shift.chef_quart_id ? chefsMap.get(shift.chef_quart_id) : null
          }));
        }
      }

      // Filter by ligne if needed (post-query since it's in related table)
      let filteredData = shiftsWithChefs;

      // Filter by Agent (Chef de Quart OR Chef de Ligne)
      if (historyChefFilter !== 'all') {
        filteredData = filteredData.filter((shift: any) => {
          // Check if agent is Chef de Quart
          const isChefQuart = shift.chef_quart_id === historyChefFilter;

          // Check if agent is Chef de Ligne on any line
          const lignes = shift.lignes_production || [];
          const isChefLigne = lignes.some((l: any) => l.chef_ligne_id === historyChefFilter);

          return isChefQuart || isChefLigne;
        });
      }

      if (historyLigneFilter !== 'all') {
        filteredData = filteredData.filter((shift: any) => {
          const lignes = shift.lignes_production || [];
          return lignes.some((l: any) => l.numero_ligne === parseInt(historyLigneFilter));
        });
      }

      setProductionHistory(filteredData);
    } catch (error) {
      console.error('Error fetching production history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteProductionShift = async (shiftId: string, reason: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('production_shifts')
        .delete()
        .eq('id', shiftId);

      if (deleteError) throw deleteError;

      await fetchProductionHistory();
      return { success: true };
    } catch (error) {
      console.error('Error deleting production shift:', error);
      return { success: false, error };
    }
  };

  const fetchShiftDetailsForEdit = async (shiftId: string) => {
    try {
      const { data, error } = await supabase
        .from('production_shifts')
        .select(`
                    *,
                    lignes_production(*),
                    arrets_production(*)
                `)
        .eq('id', shiftId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching shift details:', error);
      return null;
    }
  };

  // Helper function to get filtered bilan based on filter type
  const getFilteredBilan = () => {
    let filteredEntries = entries;

    if (bilanFilterType === 'year') {
      filteredEntries = entries.filter(e => e.date.startsWith(bilanSelectedYear.toString()));
    } else if (bilanFilterType === 'month') {
      filteredEntries = entries.filter(e => e.date.substring(0, 7) === bilanSelectedMonth);
    } else if (bilanFilterType === 'date' && bilanSelectedDate) {
      const dateStr = format(bilanSelectedDate, 'yyyy-MM-dd');
      filteredEntries = entries.filter(e => e.date === dateStr);
    } else if (bilanFilterType === 'range' && bilanDateRange?.from) {
      const fromStr = format(bilanDateRange.from, 'yyyy-MM-dd');
      const toStr = bilanDateRange.to ? format(bilanDateRange.to, 'yyyy-MM-dd') : fromStr;
      filteredEntries = entries.filter(e => e.date >= fromStr && e.date <= toStr);
    }

    return filteredEntries.reduce((sum, e) => sum + e.bilan, 0);
  };

  // Helper function to get color scheme based on bilan value
  const getBilanColor = () => {
    const bilan = getFilteredBilan();

    if (bilan > 0) {
      return {
        gradient: 'from-green-500/10 to-green-500/5',
        border: 'border-green-500/20',
        textLight: 'text-green-600/70',
        textBold: 'text-green-600'
      };
    } else if (bilan < 0) {
      return {
        gradient: 'from-red-500/10 to-red-500/5',
        border: 'border-red-500/20',
        textLight: 'text-red-600/70',
        textBold: 'text-red-600'
      };
    } else {
      return {
        gradient: 'from-gray-500/10 to-gray-500/5',
        border: 'border-gray-500/20',
        textLight: 'text-gray-600/70',
        textBold: 'text-gray-600'
      };
    }
  };



  useEffect(() => {
    loadData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        setShowImport(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle ESC key for presentation mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPresentationMode]);

  const togglePresentationMode = async () => {
    if (!isPresentationMode) {
      setIsPresentationMode(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    } else {
      setIsPresentationMode(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    loadProductionAnnuelle();
    loadSortieVracAnnuelle();
    loadVentesCE();
  }, [
    ventesFilterType, ventesSelectedMonth, ventesSelectedYear, ventesSelectedDate, ventesDateRange,
    productionFilterType, productionSelectedMonth, productionSelectedYear, productionSelectedDate, productionDateRange,
    ventesCEFilterType, ventesCESelectedMonth, ventesCESelectedYear, ventesCESelectedDate, ventesCEDateRange
  ]);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadEntries();
    setEntries(loaded);
    setLoading(false);
  };

  const loadProductionAnnuelle = async () => {
    let query = supabase.from('production_shifts').select('tonnage_total');

    if (productionFilterType === 'year') {
      query = query.gte('date', `${productionSelectedYear}-01-01`).lte('date', `${productionSelectedYear}-12-31`);
    } else if (productionFilterType === 'month') {
      const startDate = `${productionSelectedMonth}-01`;
      const [y, m] = productionSelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (productionFilterType === 'date' && productionSelectedDate) {
      const dateStr = format(productionSelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (productionFilterType === 'range' && productionDateRange?.from) {
      const fromStr = format(productionDateRange.from, 'yyyy-MM-dd');
      const toStr = productionDateRange.to ? format(productionDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement production:', error);
      return;
    }

    const total = data?.reduce((sum, shift) => sum + (shift.tonnage_total || 0), 0) || 0;
    setProductionAnnuelle(total);
  };

  const loadSortieVracAnnuelle = async () => {
    let query = supabase.from('bilan_entries').select('sorties_vrac');

    if (ventesFilterType === 'year') {
      query = query.gte('date', `${ventesSelectedYear}-01-01`).lte('date', `${ventesSelectedYear}-12-31`);
    } else if (ventesFilterType === 'month') {
      const startDate = `${ventesSelectedMonth}-01`;
      const [y, m] = ventesSelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (ventesFilterType === 'date' && ventesSelectedDate) {
      const dateStr = format(ventesSelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (ventesFilterType === 'range' && ventesDateRange?.from) {
      const fromStr = format(ventesDateRange.from, 'yyyy-MM-dd');
      const toStr = ventesDateRange.to ? format(ventesDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement sortie vrac:', error);
      return;
    }

    const total = data?.reduce((sum, entry) => sum + (entry.sorties_vrac || 0), 0) || 0;
    setSortieVracAnnuelle(total);
  };

  const loadVentesCE = async () => {
    let query = supabase.from('bilan_entries').select('sorties_conditionnees');

    if (ventesCEFilterType === 'year') {
      query = query.gte('date', `${ventesCESelectedYear}-01-01`).lte('date', `${ventesCESelectedYear}-12-31`);
    } else if (ventesCEFilterType === 'month') {
      const startDate = `${ventesCESelectedMonth}-01`;
      const [y, m] = ventesCESelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (ventesCEFilterType === 'date' && ventesCESelectedDate) {
      const dateStr = format(ventesCESelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (ventesCEFilterType === 'range' && ventesCEDateRange?.from) {
      const fromStr = format(ventesCEDateRange.from, 'yyyy-MM-dd');
      const toStr = ventesCEDateRange.to ? format(ventesCEDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement ventes CE:', error);
      return;
    }

    const total = data?.reduce((sum, entry) => sum + (entry.sorties_conditionnees || 0), 0) || 0;
    setVentesCE(total);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteEntry(id);

    if (success) {
      await loadData();
      toast.success('Bilan supprimé');
    } else {
      toast.error('Erreur lors de la suppression du bilan');
    }
  };

  const handleEdit = (entry: BilanEntry) => {
    setEditingEntry(entry);
  };

  const handleUpdate = async (calculatedData: ReturnType<typeof calculateBilan>, entryId?: string) => {
    if (!entryId) return;

    const updatedEntry: BilanEntry = {
      ...calculatedData,
      id: entryId,
      user_id: editingEntry?.user_id || null,
      created_at: editingEntry?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const success = await updateEntry(updatedEntry);

    if (success) {
      toast.success('Bilan mis à jour avec succès');
      setEditingEntry(null);
      await loadData();
    } else {
      toast.error('Erreur lors de la mise à jour du bilan');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (entries.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    if (format === 'pdf') {
      exportToPDF(entries);
      toast.success('Export PDF réussi');
    } else {
      exportToExcel(entries);
      toast.success('Export Excel réussi');
    }
  };

  const handlePrint = (entry: BilanEntry) => {
    exportIndividualToPDF(entry);
    toast.success('Impression réussie');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">GazPilote</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* VENTES VRAC - Always visible */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/20 rounded-lg px-3 py-1 shadow-sm">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-semibold text-orange-600/70 uppercase tracking-wider">
                    VENTES VRAC :
                  </p>
                  <Select value={ventesFilterType} onValueChange={(v: 'month' | 'date' | 'range' | 'year') => setVentesFilterType(v)}>
                    <SelectTrigger className="h-5 w-20 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="range">Période</SelectItem>
                    </SelectContent>
                  </Select>
                  {ventesFilterType === 'year' && (
                    <Select value={ventesSelectedYear.toString()} onValueChange={(v) => setVentesSelectedYear(Number(v))}>
                      <SelectTrigger className="h-5 w-16 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ventesFilterType === 'month' && (
                    <Select value={ventesSelectedMonth} onValueChange={setVentesSelectedMonth}>
                      <SelectTrigger className="h-5 w-24 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ventesFilterType === 'date' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {ventesSelectedDate ? format(ventesSelectedDate, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={ventesSelectedDate}
                          onSelect={setVentesSelectedDate}
                          locale={fr}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {ventesFilterType === 'range' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {ventesDateRange?.from ? (
                            ventesDateRange.to ? (
                              `${format(ventesDateRange.from, 'dd/MM')} - ${format(ventesDateRange.to, 'dd/MM')}`
                            ) : (
                              format(ventesDateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            'Sélectionner'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={ventesDateRange}
                          onSelect={setVentesDateRange}
                          locale={fr}
                          disabled={{ after: new Date() }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-orange-600 tracking-tight">
                  {sortieVracAnnuelle.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className="text-sm font-semibold text-orange-600/60 ml-1.5">Kg</span>
                </p>
              </div>

              {/* PRODUCTION CE - Always visible */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg px-3 py-1 shadow-sm">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                    PRODUCTION CE :
                  </p>
                  <Select value={productionFilterType} onValueChange={(v: 'month' | 'date' | 'range' | 'year') => setProductionFilterType(v)}>
                    <SelectTrigger className="h-5 w-20 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="range">Période</SelectItem>
                    </SelectContent>
                  </Select>
                  {productionFilterType === 'year' && (
                    <Select value={productionSelectedYear.toString()} onValueChange={(v) => setProductionSelectedYear(Number(v))}>
                      <SelectTrigger className="h-5 w-16 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {productionFilterType === 'month' && (
                    <Select value={productionSelectedMonth} onValueChange={setProductionSelectedMonth}>
                      <SelectTrigger className="h-5 w-24 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {productionFilterType === 'date' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {productionSelectedDate ? format(productionSelectedDate, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={productionSelectedDate}
                          onSelect={setProductionSelectedDate}
                          locale={fr}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {productionFilterType === 'range' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {productionDateRange?.from ? (
                            productionDateRange.to ? (
                              `${format(productionDateRange.from, 'dd/MM')} - ${format(productionDateRange.to, 'dd/MM')}`
                            ) : (
                              format(productionDateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            'Sélectionner'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={productionDateRange}
                          onSelect={setProductionDateRange}
                          locale={fr}
                          disabled={{ after: new Date() }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-primary tracking-tight">
                  {(productionAnnuelle * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className="text-sm font-semibold text-primary/60 ml-1.5">Kg</span>
                </p>
              </div>

              {/* VENTES CE - Always visible */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/20 rounded-lg px-3 py-1 shadow-sm">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-semibold text-green-600/70 uppercase tracking-wider">
                    VENTES CE :
                  </p>
                  <Select value={ventesCEFilterType} onValueChange={(v: 'month' | 'date' | 'range' | 'year') => setVentesCEFilterType(v)}>
                    <SelectTrigger className="h-5 w-20 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="range">Période</SelectItem>
                    </SelectContent>
                  </Select>
                  {ventesCEFilterType === 'year' && (
                    <Select value={ventesCESelectedYear.toString()} onValueChange={(v) => setVentesCESelectedYear(Number(v))}>
                      <SelectTrigger className="h-5 w-16 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ventesCEFilterType === 'month' && (
                    <Select value={ventesCESelectedMonth} onValueChange={setVentesCESelectedMonth}>
                      <SelectTrigger className="h-5 w-24 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {ventesCEFilterType === 'date' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {ventesCESelectedDate ? format(ventesCESelectedDate, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={ventesCESelectedDate}
                          onSelect={setVentesCESelectedDate}
                          locale={fr}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {ventesCEFilterType === 'range' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {ventesCEDateRange?.from ? (
                            ventesCEDateRange.to ? (
                              `${format(ventesCEDateRange.from, 'dd/MM')} - ${format(ventesCEDateRange.to, 'dd/MM')}`
                            ) : (
                              format(ventesCEDateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            'Sélectionner'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={ventesCEDateRange}
                          onSelect={setVentesCEDateRange}
                          locale={fr}
                          disabled={{ after: new Date() }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-green-600 tracking-tight">
                  {ventesCE.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className="text-sm font-semibold text-green-600/60 ml-1.5">Kg</span>
                </p>
              </div>

              {/* Bilan Matière - Always visible */}
              <div className={`bg-gradient-to-br ${getBilanColor().gradient} border-2 ${getBilanColor().border} rounded-lg px-3 py-1 shadow-sm`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-[10px] font-semibold ${getBilanColor().textLight} uppercase tracking-wider`}>
                    BILAN MATIÈRE :
                  </p>
                  <Select value={bilanFilterType} onValueChange={(v: 'month' | 'date' | 'range' | 'year') => setBilanFilterType(v)}>
                    <SelectTrigger className="h-5 w-20 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="range">Période</SelectItem>
                    </SelectContent>
                  </Select>
                  {bilanFilterType === 'year' && (
                    <Select value={bilanSelectedYear.toString()} onValueChange={(v) => setBilanSelectedYear(Number(v))}>
                      <SelectTrigger className="h-5 w-16 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bilanFilterType === 'month' && (
                    <Select value={bilanSelectedMonth} onValueChange={setBilanSelectedMonth}>
                      <SelectTrigger className="h-5 w-24 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bilanFilterType === 'date' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {bilanSelectedDate ? format(bilanSelectedDate, 'dd/MM/yyyy') : 'Sélectionner'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={bilanSelectedDate}
                          onSelect={setBilanSelectedDate}
                          locale={fr}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {bilanFilterType === 'range' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-5 px-2 text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0 text-foreground hover:bg-transparent hover:text-foreground"
                        >
                          {bilanDateRange?.from ? (
                            bilanDateRange.to ? (
                              `${format(bilanDateRange.from, 'dd/MM')} - ${format(bilanDateRange.to, 'dd/MM')}`
                            ) : (
                              format(bilanDateRange.from, 'dd/MM/yyyy')
                            )
                          ) : (
                            'Sélectionner'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={bilanDateRange}
                          onSelect={setBilanDateRange}
                          locale={fr}
                          disabled={{ after: new Date() }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className={`text-2xl font-extrabold ${getBilanColor().textBold} tracking-tight`}>
                  {getFilteredBilan().toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span className={`text-sm font-semibold ${getBilanColor().textLight} ml-1.5`}>Kg</span>
                </p>
              </div>

              <Button
                onClick={togglePresentationMode}
                variant={isPresentationMode ? "default" : "outline"}
                size="lg"
                className="gap-2 font-bold"
              >
                <Presentation className="h-5 w-5" />
                {isPresentationMode ? 'QUITTER' : 'PRÉSENTER'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'overview' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('overview')}
          >
            <BarChart3 className="mr-3 h-6 w-6" />
            Vue d'ensemble
          </Button>

          <Button
            variant={activeView === 'emplisseur' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'emplisseur' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('emplisseur')}
          >
            <Calculator className="mr-3 h-6 w-6" />
            PRODUCTION
          </Button>

          <Button
            variant={activeView === 'sorties' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'sorties' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('sorties')}
          >
            <ArrowUpRight className="mr-3 h-6 w-6" />
            VENTES
          </Button>

          <Button
            variant={activeView === 'vrac' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'vrac' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('vrac')}
          >
            <FileText className="mr-3 h-6 w-6" />
            Historique des saisies
          </Button>
        </div>

        {/* Content Views */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeView === 'overview' && (
            <Dashboard entries={entries} />
          )}

          {activeView === 'vrac' && (
            <div className="space-y-6">
              {/* Historique des bilans matières - Collapsible */}
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setIsBilansExpanded(!isBilansExpanded)}
                >
                  <h2 className="text-2xl font-bold">Historique des bilans</h2>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    {isBilansExpanded ? (
                      <ChevronUp className="h-6 w-6" />
                    ) : (
                      <ChevronDown className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                {isBilansExpanded && (
                  <div className="px-6 pb-6">
                    <HistoryTable
                      entries={entries}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onExport={handleExport}
                      onPrint={handlePrint}
                    />
                  </div>
                )}
              </div>

              {/* Historique de Production - Collapsible */}
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setIsProductionExpanded(!isProductionExpanded)}
                >
                  <h2 className="text-2xl font-bold">Historique de Production</h2>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    {isProductionExpanded ? (
                      <ChevronUp className="h-6 w-6" />
                    ) : (
                      <ChevronDown className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                {isProductionExpanded && (
                  <div className="px-6 pb-6">
                    <ProductionHistory
                      history={productionHistory}
                      loading={historyLoading}
                      filterType={historyFilterType}
                      setFilterType={setHistoryFilterType}
                      selectedMonth={historySelectedMonth}
                      setSelectedMonth={setHistorySelectedMonth}
                      selectedDate={historySelectedDate}
                      setSelectedDate={setHistorySelectedDate}
                      dateRange={historyDateRange}
                      setDateRange={setHistoryDateRange}
                      shiftFilter={historyShiftFilter}
                      setShiftFilter={setHistoryShiftFilter}
                      ligneFilter={historyLigneFilter}
                      setLigneFilter={setHistoryLigneFilter}
                      chefFilter={historyChefFilter}
                      setChefFilter={setHistoryChefFilter}
                      availableMonths={availableMonths}
                      allAgents={allAgents}
                      onEdit={async (shiftId) => {
                        const data = await fetchShiftDetailsForEdit(shiftId);
                        setEditModalData(data);
                        setSelectedShiftForEdit(shiftId);
                      }}
                      onDelete={async (shiftId) => {
                        const reason = prompt("Raison de la suppression :");
                        if (reason) {
                          await deleteProductionShift(shiftId, reason);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Edit Modal */}
              <Dialog open={selectedShiftForEdit !== null} onOpenChange={(open) => {
                if (!open) {
                  setSelectedShiftForEdit(null);
                  setEditModalData(null);
                }
              }}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Modifier la saisie de production</DialogTitle>
                  </DialogHeader>
                  {editModalData && (
                    <ProductionShiftForm
                      editMode={true}
                      initialData={editModalData}
                      onSuccess={() => {
                        setSelectedShiftForEdit(null);
                        setEditModalData(null);
                        fetchProductionHistory();
                      }}
                      onCancel={() => {
                        setSelectedShiftForEdit(null);
                        setEditModalData(null);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeView === 'emplisseur' && (
            <CentreEmplisseurView
              dateRange={dateRange}
              setDateRange={setDateRange}
              filterType={filterType}
              setFilterType={setFilterType}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          )}

          {activeView === 'sorties' && (
            <VentesView
              dateRange={dateRange}
              setDateRange={setDateRange}
              filterType={filterType}
              setFilterType={setFilterType}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          )}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bilan Matière GPL</p>
        </div>
      </footer>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le bilan</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <BilanForm
              onSave={handleUpdate}
              editEntry={editingEntry}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardHistorique;
