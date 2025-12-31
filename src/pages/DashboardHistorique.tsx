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
import { BarChart3, FileText, Calculator, ArrowUpRight, ChevronDown, ChevronUp, Presentation, LogOut, User, Eye, EyeOff, Wrench, Map as MapIcon, CalendarIcon, Package as PackageIcon, Users, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CentreEmplisseurView from '@/components/dashboard/CentreEmplisseurView';
import ProductionHistory from '@/components/dashboard/ProductionHistory';
import MandatairesVentesHistory from '@/components/dashboard/MandatairesVentesHistory';
import { ProductionShiftForm } from '@/components/ProductionShiftForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import VentesView from '@/components/dashboard/VentesView';
import DistributionView from '@/components/dashboard/DistributionView';
import CarteView from '@/components/dashboard/CarteView';
import DataChatbot from '@/components/DataChatbot';
import PasswordGate from '@/components/PasswordGate';
import { useIsMobile } from '@/hooks/use-mobile';
import { AtelierEntry, ATELIER_CLIENT_LABELS, AtelierClientKey, AtelierCategory, AtelierFormat } from '@/types/atelier';
import AtelierHistoryTable from '@/components/dashboard/AtelierHistoryTable';
import ReceptionsView from '@/components/dashboard/ReceptionsView';

// Helper function to format numbers with decimals only if significant
const formatNumberWithDecimals = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000; // Round to 3 decimals
  const hasDecimals = rounded % 1 !== 0;
  
  if (hasDecimals) {
    return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  } else {
    return rounded.toLocaleString('fr-FR');
  }
};

const DashboardHistorique = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('dashboard_authenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [entries, setEntries] = useState<BilanEntry[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'receptions' | 'vrac' | 'emplisseur' | 'sorties' | 'distribution' | 'atelier' | 'carte'>('overview');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<BilanEntry | null>(null);
  const [productionAnnuelle, setProductionAnnuelle] = useState<number>(0);
  const [sortieVracAnnuelle, setSortieVracAnnuelle] = useState<number>(0);
  const [ventesCE, setVentesCE] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);
  const [isBilansExpanded, setIsBilansExpanded] = useState(false);
  const [isProductionExpanded, setIsProductionExpanded] = useState(false);
  const [isMandatairesVentesExpanded, setIsMandatairesVentesExpanded] = useState(false);

  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) setUserName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user_name");
    sessionStorage.removeItem("dashboard_authenticated");
    setIsAuthenticated(false);
    navigate("/");
  };

  // Filter state for Centre Emplisseur
  const [filterType, setFilterType] = useState<'month' | 'date' | 'range' | 'year'>('month');
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

  // Filtre unique pour les 4 cartes KPI
  const [kpiFilterType, setKpiFilterType] = useState<'all' | 'year' | 'month' | 'period' | 'day'>('all');
  const [kpiSelectedYear, setKpiSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [kpiSelectedMonth, setKpiSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kpiSelectedDate, setKpiSelectedDate] = useState<Date | undefined>(undefined);
  const [kpiDateRange, setKpiDateRange] = useState<DateRange | undefined>(undefined);
  
  // Mois disponibles pour l'année sélectionnée (pour le filtre KPI)
  const kpiAvailableMonths = useMemo(() => {
    if (kpiFilterType !== 'month') return [];
    // Générer les 12 mois de l'année sélectionnée
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${kpiSelectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse(); // Plus récent en premier
  }, [kpiSelectedYear, kpiFilterType]);
  
  // Réinitialiser le mois quand l'année change
  useEffect(() => {
    if (kpiFilterType === 'month') {
      const currentMonth = `${kpiSelectedYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      setKpiSelectedMonth(currentMonth);
    }
  }, [kpiSelectedYear, kpiFilterType]);

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

  // ATELIER data
  const [atelierEntries, setAtelierEntries] = useState<AtelierEntry[]>([]);
  const [atelierLoading, setAtelierLoading] = useState(false);

  // Generate last 12 months for filter (memoized to avoid duplicates)
  const availableMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }), []);


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

          const chefsMap: Map<string, any> = new Map();
          (chefsData || []).forEach((c: any) => {
            chefsMap.set(c.id, c);
          });
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
                    lignes_production(
                      *,
                      production_shifts(
                        arrets_production(*)
                      )
                    ),
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

    if (kpiFilterType === 'year') {
      filteredEntries = entries.filter(e => e.date.startsWith(kpiSelectedYear.toString()));
    } else if (kpiFilterType === 'month') {
      filteredEntries = entries.filter(e => e.date.substring(0, 7) === kpiSelectedMonth);
    } else if (kpiFilterType === 'day' && kpiSelectedDate) {
      const dateStr = format(kpiSelectedDate, 'yyyy-MM-dd');
      filteredEntries = entries.filter(e => e.date === dateStr);
    } else if (kpiFilterType === 'period' && kpiDateRange?.from) {
      const fromStr = format(kpiDateRange.from, 'yyyy-MM-dd');
      const toStr = kpiDateRange.to ? format(kpiDateRange.to, 'yyyy-MM-dd') : fromStr;
      filteredEntries = entries.filter(e => e.date >= fromStr && e.date <= toStr);
    }
    // 'all' = pas de filtre, utilise tous les entries

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
    kpiFilterType, kpiSelectedMonth, kpiSelectedYear, kpiSelectedDate, kpiDateRange
  ]);

  useEffect(() => {
    fetchProductionHistory();
    fetchAgents();
  }, [
    historyFilterType,
    historySelectedMonth,
    historySelectedDate,
    historyDateRange,
    historyShiftFilter,
    historyLigneFilter,
    historyChefFilter
  ]);

  // ATELIER filter state
  const [atelierFilterType, setAtelierFilterType] = useState<'year' | 'month' | 'date' | 'range'>('year');
  const [atelierSelectedYear, setAtelierSelectedYear] = useState<number>(2025);
  const [atelierAvailableYears, setAtelierAvailableYears] = useState<number[]>([2025]);
  const [atelierSelectedMonth, setAtelierSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [atelierSelectedDate, setAtelierSelectedDate] = useState<Date | undefined>(undefined);
  const [atelierDateRange, setAtelierDateRange] = useState<DateRange | undefined>(undefined);
  const [atelierSelectedClient, setAtelierSelectedClient] = useState<AtelierClientKey | 'all'>('all');
  const [atelierSelectedBottleType, setAtelierSelectedBottleType] = useState<'BR' | 'BV' | 'BHS' | 'CPT' | 'all'>('all');

  // Charger les années disponibles pour ATELIER
  useEffect(() => {
    const fetchAtelierYears = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('atelier_entries')
          .select('date')
          .order('date', { ascending: true })
          .limit(1);

        if (error) throw error;

        let minYear = 2025;
        if (data && data.length > 0) {
          const firstDate = new Date(data[0].date);
          const firstYear = firstDate.getFullYear();
          minYear = firstYear < 2025 ? firstYear : 2025;
        }

        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i);
        setAtelierAvailableYears(years);

        // Si l'année sélectionnée n'est pas dans la liste, définir la première année disponible
        if (!years.includes(atelierSelectedYear)) {
          setAtelierSelectedYear(years[0] || 2025);
        }
      } catch (error) {
        console.error('Error fetching atelier years:', error);
      }
    };

    fetchAtelierYears();
  }, []);

  // Charger les données ATELIER avec filtre
  useEffect(() => {
    const fetchAtelier = async () => {
      try {
        setAtelierLoading(true);
        let query = (supabase as any).from('atelier_entries').select('*');

        if (atelierFilterType === 'year') {
          const startDate = `${atelierSelectedYear}-01-01`;
          const endDate = `${atelierSelectedYear}-12-31`;
          query = query.gte('date', startDate).lte('date', endDate);
        } else if (atelierFilterType === 'month') {
          const startDate = `${atelierSelectedMonth}-01`;
          const [y, m] = atelierSelectedMonth.split('-').map(Number);
          const endDate = new Date(y, m, 0).toISOString().split('T')[0];
          query = query.gte('date', startDate).lte('date', endDate);
        } else if (atelierFilterType === 'date' && atelierSelectedDate) {
          const dateStr = format(atelierSelectedDate, 'yyyy-MM-dd');
          query = query.eq('date', dateStr);
        } else if (atelierFilterType === 'range' && atelierDateRange?.from) {
          const fromStr = format(atelierDateRange.from, 'yyyy-MM-dd');
          const toStr = atelierDateRange.to ? format(atelierDateRange.to, 'yyyy-MM-dd') : fromStr;
          query = query.gte('date', fromStr).lte('date', toStr);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;
        setAtelierEntries((data || []) as AtelierEntry[]);
      } catch (error) {
        console.error('Error loading atelier entries:', error);
      } finally {
        setAtelierLoading(false);
      }
    };

    fetchAtelier();
  }, [atelierFilterType, atelierSelectedYear, atelierSelectedMonth, atelierSelectedDate, atelierDateRange]);

  // Calculer les statistiques Atelier
  const atelierStats = useMemo(() => {
    const categories: Record<AtelierCategory, Record<AtelierFormat, number>> = {
      bouteilles_reeprouvees: { B6: 0, B12: 0, B28: 0, B38: 0 },
      bouteilles_vidangees: { B6: 0, B12: 0, B28: 0, B38: 0 },
      bouteilles_hs: { B6: 0, B12: 0, B28: 0, B38: 0 },
      clapet_monte: { B6: 0, B12: 0, B28: 0, B38: 0 },
    };

    const clients: Record<AtelierClientKey, {
      total: number;
      pct: number;
      b6: number;
      b12: number;
      b28: number;
      b38: number;
    }> = {
      SIMAM: { total: 0, pct: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
      PETRO_IVOIRE: { total: 0, pct: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
      VIVO_ENERGY: { total: 0, pct: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
      TOTAL_ENERGIES: { total: 0, pct: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
    };

    atelierEntries.forEach(entry => {
      const data = entry.data as any;
      (Object.keys(ATELIER_CLIENT_LABELS) as AtelierClientKey[]).forEach(client => {
        const clientData = data?.[client];
        if (!clientData) return;

        (Object.keys(categories) as AtelierCategory[]).forEach(cat => {
          (['B6', 'B12', 'B28', 'B38'] as AtelierFormat[]).forEach(formatKey => {
            const val = clientData?.[cat]?.[formatKey];
            if (typeof val === 'number') {
              categories[cat][formatKey] += val;
              clients[client].total += val;
              clients[client][formatKey.toLowerCase() as 'b6' | 'b12' | 'b28' | 'b38'] += val;
            }
          });
        });
      });
    });

    const totalBouteilles = Object.values(clients).reduce((sum, c) => sum + c.total, 0);
    Object.keys(clients).forEach(client => {
      clients[client as AtelierClientKey].pct = totalBouteilles > 0 
        ? (clients[client as AtelierClientKey].total / totalBouteilles) * 100 
        : 0;
    });

    return { categories, clients, totalBouteilles };
  }, [atelierEntries]);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadEntries();
    setEntries(loaded);
    setLoading(false);
  };

  const loadProductionAnnuelle = async () => {
    let query = supabase.from('production_shifts').select('tonnage_total');

    if (kpiFilterType === 'year') {
      query = query.gte('date', `${kpiSelectedYear}-01-01`).lte('date', `${kpiSelectedYear}-12-31`);
    } else if (kpiFilterType === 'month') {
      const startDate = `${kpiSelectedMonth}-01`;
      const [y, m] = kpiSelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (kpiFilterType === 'day' && kpiSelectedDate) {
      const dateStr = format(kpiSelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (kpiFilterType === 'period' && kpiDateRange?.from) {
      const fromStr = format(kpiDateRange.from, 'yyyy-MM-dd');
      const toStr = kpiDateRange.to ? format(kpiDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }
    // 'all' = pas de filtre

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

    if (kpiFilterType === 'year') {
      query = query.gte('date', `${kpiSelectedYear}-01-01`).lte('date', `${kpiSelectedYear}-12-31`);
    } else if (kpiFilterType === 'month') {
      const startDate = `${kpiSelectedMonth}-01`;
      const [y, m] = kpiSelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (kpiFilterType === 'day' && kpiSelectedDate) {
      const dateStr = format(kpiSelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (kpiFilterType === 'period' && kpiDateRange?.from) {
      const fromStr = format(kpiDateRange.from, 'yyyy-MM-dd');
      const toStr = kpiDateRange.to ? format(kpiDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }
    // 'all' = pas de filtre

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

    if (kpiFilterType === 'year') {
      query = query.gte('date', `${kpiSelectedYear}-01-01`).lte('date', `${kpiSelectedYear}-12-31`);
    } else if (kpiFilterType === 'month') {
      const startDate = `${kpiSelectedMonth}-01`;
      const [y, m] = kpiSelectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (kpiFilterType === 'day' && kpiSelectedDate) {
      const dateStr = format(kpiSelectedDate, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    } else if (kpiFilterType === 'period' && kpiDateRange?.from) {
      const fromStr = format(kpiDateRange.from, 'yyyy-MM-dd');
      const toStr = kpiDateRange.to ? format(kpiDateRange.to, 'yyyy-MM-dd') : fromStr;
      query = query.gte('date', fromStr).lte('date', toStr);
    }
    // 'all' = pas de filtre

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
      <header className="border-b bg-card transition-all duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Top Bar: Logo + Toggle + User Profile */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">GazPILOT</h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                  className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                >
                  {isHeaderExpanded ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                  <span className="hidden sm:inline">{isHeaderExpanded ? "Masquer" : "Afficher KPIs"}</span>
                </Button>
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-secondary/50 rounded-full">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  <span className="font-semibold text-xs sm:text-sm hidden sm:inline">{userName || "Utilisateur"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Se déconnecter"
                  className="text-muted-foreground hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* KPI Cards Section - Collapsible */}
            {isHeaderExpanded && (
              <div className="flex flex-col gap-3 sm:gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {/* Filtre unique pour les 4 cartes */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <Select value={kpiFilterType} onValueChange={(v: 'all' | 'year' | 'month' | 'period' | 'day') => setKpiFilterType(v)}>
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

                  {kpiFilterType === 'year' && (
                    <Select value={kpiSelectedYear.toString()} onValueChange={(v) => setKpiSelectedYear(Number(v))}>
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

                  {kpiFilterType === 'month' && (
                    <>
                      <Select value={kpiSelectedYear.toString()} onValueChange={(v) => setKpiSelectedYear(Number(v))}>
                        <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={kpiSelectedMonth} onValueChange={setKpiSelectedMonth}>
                        <SelectTrigger className="h-8 sm:h-9 w-[160px] sm:w-[180px] text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {kpiAvailableMonths.map(month => (
                            <SelectItem key={month} value={month}>
                              {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {kpiFilterType === 'day' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 sm:h-9 w-[160px] sm:w-[180px] justify-start text-left font-normal text-xs sm:text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {kpiSelectedDate ? format(kpiSelectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={kpiSelectedDate}
                          onSelect={setKpiSelectedDate}
                          locale={fr}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  {kpiFilterType === 'period' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 sm:h-9 w-[250px] sm:w-[300px] justify-start text-left font-normal text-xs sm:text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {kpiDateRange?.from ? (
                            kpiDateRange.to ? (
                              `${format(kpiDateRange.from, 'PPP', { locale: fr })} - ${format(kpiDateRange.to, 'PPP', { locale: fr })}`
                            ) : (
                              format(kpiDateRange.from, 'PPP', { locale: fr })
                            )
                          ) : (
                            'Sélectionner une période'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={kpiDateRange}
                          onSelect={setKpiDateRange}
                          locale={fr}
                          disabled={{ after: new Date() }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent -mx-3 sm:-mx-4 px-3 sm:px-4">
                  {/* VENTES VRAC - Always visible */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider mb-0.5">
                      VENTES VRAC :
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-orange-600 tracking-tight">
                      {sortieVracAnnuelle.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-orange-600/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>


                  {/* PRODUCTION CE - Always visible */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider mb-0.5">
                      PRODUCTION CE :
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-primary tracking-tight">
                      {(productionAnnuelle * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-primary/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>


                  {/* VENTES CE - Always visible */}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider mb-0.5">
                      VENTES CE :
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-green-600 tracking-tight">
                      {formatNumberWithDecimals(ventesCE)}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-green-600/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>

                  {/* BILAN MATIÈRE - Always visible */}
                  <div className={`bg-gradient-to-br ${getBilanColor().gradient} border-2 ${getBilanColor().border} rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[180px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0`}>
                    <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider mb-0.5">
                      BILAN MATIÈRE :
                    </p>
                    <div className="flex items-end justify-between gap-1.5 sm:gap-2">
                      <p className={`text-lg sm:text-xl md:text-2xl font-extrabold ${getBilanColor().textBold} tracking-tight`}>
                        {formatNumberWithDecimals(getFilteredBilan())}
                        <span className="text-[10px] sm:text-xs md:text-sm font-semibold opacity-60 ml-1 sm:ml-1.5">Kg</span>
                      </p>

                      <div className="flex flex-col gap-0.5 sm:gap-1 text-right border-l pl-1 sm:pl-1.5 md:pl-2 lg:pl-3 border-black/5 flex-shrink-0">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1 md:gap-2">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-black hidden sm:inline">Avec VRAC</span>
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-black sm:hidden">AV</span>
                          <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold ${getBilanColor().textBold}`}>
                            {((sortieVracAnnuelle + ventesCE) > 0 ? (getFilteredBilan() / (sortieVracAnnuelle + ventesCE)) * 100 : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1 md:gap-2">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-black hidden sm:inline">Sans VRAC</span>
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] uppercase tracking-wider text-black sm:hidden">SV</span>
                          <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold ${getBilanColor().textBold}`}>
                            {(ventesCE > 0 ? (getFilteredBilan() / ventesCE) * 100 : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Presentation & Controls Bar */}
        <div className="flex justify-end mb-3 sm:mb-4">
          <Button
            onClick={togglePresentationMode}
            variant={isPresentationMode ? "default" : "outline"}
            size="sm"
            className="gap-1 sm:gap-2 font-bold text-xs sm:text-sm"
          >
            <Presentation className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isPresentationMode ? 'QUITTER PRÉSENTATION' : 'PRÉSENTER'}</span>
            <span className="sm:hidden">{isPresentationMode ? 'QUITTER' : 'PRÉSENTER'}</span>
          </Button>
        </div>
        {/* Navigation Buttons */}
        <div className="flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 md:gap-2 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'overview' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('overview')}
          >
            <BarChart3 className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Vue</span>
          </Button>

          <Button
            variant={activeView === 'receptions' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'receptions' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('receptions')}
          >
            <PackageIcon className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Réceptions</span>
            <span className="sm:hidden">Récep.</span>
          </Button>

          <Button
            variant={activeView === 'emplisseur' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'emplisseur' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('emplisseur')}
          >
            <Calculator className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">PRODUCTION</span>
            <span className="sm:hidden">PROD</span>
          </Button>

          <Button
            variant={activeView === 'sorties' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'sorties' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('sorties')}
          >
            <ArrowUpRight className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            VENTES
          </Button>

          <Button
            variant={activeView === 'distribution' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'distribution' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('distribution')}
          >
            <FileText className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden md:inline">DISTRIBUTION</span>
            <span className="md:hidden">DISTRIB</span>
          </Button>

          <Button
            variant={activeView === 'atelier' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'atelier' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('atelier')}
          >
            <Wrench className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden md:inline">ATELIER</span>
            <span className="md:hidden">ATELIER</span>
          </Button>

          <Button
            variant={activeView === 'carte' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'carte' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('carte')}
          >
            <MapIcon className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden md:inline">CARTE</span>
            <span className="md:hidden">CARTE</span>
          </Button>

          <Button
            variant={activeView === 'vrac' ? 'default' : 'outline'}
            size="lg"
            className={`h-9 sm:h-10 md:h-11 px-1.5 sm:px-2 md:px-3 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wide flex-shrink-0 whitespace-nowrap ${activeView === 'vrac' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5 hover:text-primary'}`}
            onClick={() => setActiveView('vrac')}
          >
            <FileText className="mr-0.5 sm:mr-1 md:mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span>Historiques</span>
          </Button>
        </div>

        {/* Content Views */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeView === 'overview' && (
            <Dashboard entries={entries} />
          )}

          {activeView === 'receptions' && (
            <ReceptionsView
              dateRange={dateRange}
              setDateRange={setDateRange}
              filterType={filterType}
              setFilterType={setFilterType}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              availableMonths={availableMonths}
            />
          )}

          {activeView === 'atelier' && (
            <div className="space-y-6">
              {/* Header avec filtres */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Dashboard Atelier</h2>
                  <p className="text-muted-foreground">Analyse des bouteilles traitées</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs sm:text-sm font-semibold px-3 py-1"
                  onClick={() => navigate('/atelier-form')}
                >
                  SAISIE
                </Button>
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={atelierFilterType} onValueChange={(v: 'year' | 'month' | 'date' | 'range') => setAtelierFilterType(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Année</SelectItem>
                    <SelectItem value="month">Mois</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="range">Période</SelectItem>
                  </SelectContent>
                </Select>

                {atelierFilterType === 'year' && (
                  <Select value={atelierSelectedYear.toString()} onValueChange={v => setAtelierSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {atelierAvailableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {atelierFilterType === 'month' && (
                  <Select value={atelierSelectedMonth} onValueChange={setAtelierSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {atelierFilterType === 'date' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {atelierSelectedDate ? format(atelierSelectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={atelierSelectedDate}
                        onSelect={setAtelierSelectedDate}
                        locale={fr}
                        disabled={{ after: new Date() }}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {atelierFilterType === 'range' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {atelierDateRange?.from ? (
                          atelierDateRange.to ? (
                            `${format(atelierDateRange.from, 'PPP', { locale: fr })} - ${format(atelierDateRange.to, 'PPP', { locale: fr })}`
                          ) : (
                            format(atelierDateRange.from, 'PPP', { locale: fr })
                          )
                        ) : (
                          'Sélectionner une période'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={atelierDateRange}
                        onSelect={setAtelierDateRange}
                        locale={fr}
                        disabled={{ after: new Date() }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {atelierLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chargement des données...</p>
              ) : atelierEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune donnée ATELIER à afficher pour le moment.
                </p>
              ) : (
                <>
                  {/* Section principale - Atelier et Catégories */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-center mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Atelier</p>
                      <p className="text-4xl font-extrabold text-primary tracking-tight">
                        {atelierStats.totalBouteilles.toLocaleString('fr-FR')}
                        <span className="text-xl text-primary/60 ml-2">bouteilles</span>
                      </p>
                    </div>

                    {/* Total par Catégorie */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-primary/20">
                      {/* BR - Bouteilles rééprouvées */}
                      <div className="bg-card p-3 rounded-md border shadow-sm">
                        <div className="text-center mb-2">
                          <p className="text-xs text-muted-foreground uppercase font-bold">Bouteilles rééprouvées</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B6</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_reeprouvees.B6.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B12</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_reeprouvees.B12.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B28</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_reeprouvees.B28.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B38</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_reeprouvees.B38.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* BV - Bouteilles vidangées */}
                      <div className="bg-card p-3 rounded-md border shadow-sm">
                        <div className="text-center mb-2">
                          <p className="text-xs text-muted-foreground uppercase font-bold">Bouteilles vidangées</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B6</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_vidangees.B6.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B12</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_vidangees.B12.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B28</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_vidangees.B28.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B38</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_vidangees.B38.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* BHS - Bouteilles HS */}
                      <div className="bg-card p-3 rounded-md border shadow-sm">
                        <div className="text-center mb-2">
                          <p className="text-xs text-muted-foreground uppercase font-bold">Bouteilles HS</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B6</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_hs.B6.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B12</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_hs.B12.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B28</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_hs.B28.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B38</span>
                            <span className="font-bold">{atelierStats.categories.bouteilles_hs.B38.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* CPT - Clapet monté */}
                      <div className="bg-card p-3 rounded-md border shadow-sm">
                        <div className="text-center mb-2">
                          <p className="text-xs text-muted-foreground uppercase font-bold">Clapet monté</p>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B6</span>
                            <span className="font-bold">{atelierStats.categories.clapet_monte.B6.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B12</span>
                            <span className="font-bold">{atelierStats.categories.clapet_monte.B12.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B28</span>
                            <span className="font-bold">{atelierStats.categories.clapet_monte.B28.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="bg-muted/30 p-1 rounded">
                            <span className="block font-semibold text-muted-foreground">B38</span>
                            <span className="font-bold">{atelierStats.categories.clapet_monte.B38.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Répartition bouteille par client */}
                    <div className="mt-4 pt-3 border-t border-primary/20">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Répartition bouteille par client
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(Object.keys(ATELIER_CLIENT_LABELS) as AtelierClientKey[]).map((client) => {
                          const logoMap: Record<AtelierClientKey, string> = {
                            SIMAM: '/images/logo-simam.png',
                            PETRO_IVOIRE: '/images/logo-petro.png',
                            VIVO_ENERGY: '/images/logo-vivo.png',
                            TOTAL_ENERGIES: '/images/logo-total.png',
                          };

                          // Calculer les totaux par catégorie pour ce client
                          const clientData = {
                            reeprouvees: 0,
                            vidangees: 0,
                            hs: 0,
                            clapet: 0,
                            total: 0
                          };

                          atelierEntries.forEach(entry => {
                            const data = (entry.data as any)?.[client];
                            if (!data) return;
                            
                            (['B6', 'B12', 'B28', 'B38'] as AtelierFormat[]).forEach(formatKey => {
                              const br = data?.bouteilles_reeprouvees?.[formatKey] || 0;
                              const bv = data?.bouteilles_vidangees?.[formatKey] || 0;
                              const bhs = data?.bouteilles_hs?.[formatKey] || 0;
                              const cpt = data?.clapet_monte?.[formatKey] || 0;
                              
                              clientData.reeprouvees += br;
                              clientData.vidangees += bv;
                              clientData.hs += bhs;
                              clientData.clapet += cpt;
                            });
                          });

                          clientData.total = clientData.reeprouvees + clientData.vidangees + clientData.hs + clientData.clapet;
                          const clientPct = atelierStats.totalBouteilles > 0 
                            ? (clientData.total / atelierStats.totalBouteilles) * 100 
                            : 0;

                          return (
                            <div key={client} className="p-3 bg-white/50 rounded-lg border border-primary/20 hover:shadow-sm transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <div className="h-16 w-16 relative flex-shrink-0">
                                  <img
                                    src={logoMap[client]}
                                    alt={ATELIER_CLIENT_LABELS[client]}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-extrabold text-foreground">{clientPct.toFixed(1)}%</p>
                                  <p className="text-sm font-extrabold text-primary">{clientData.total.toLocaleString('fr-FR')}</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center bg-primary/5 p-1.5 rounded">
                                  <span className="text-[10px] text-muted-foreground">Rééprouvées</span>
                                  <span className="text-xs font-bold">{clientData.reeprouvees.toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between items-center bg-primary/5 p-1.5 rounded">
                                  <span className="text-[10px] text-muted-foreground">Vidangées</span>
                                  <span className="text-xs font-bold">{clientData.vidangees.toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between items-center bg-primary/5 p-1.5 rounded">
                                  <span className="text-[10px] text-muted-foreground">HS</span>
                                  <span className="text-xs font-bold">{clientData.hs.toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between items-center bg-primary/5 p-1.5 rounded">
                                  <span className="text-[10px] text-muted-foreground">Clapet</span>
                                  <span className="text-xs font-bold">{clientData.clapet.toLocaleString('fr-FR')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Historique modifiable */}
                  <AtelierHistoryTable
                    filterType={atelierFilterType}
                    selectedYear={atelierSelectedYear}
                    selectedMonth={atelierSelectedMonth}
                    selectedDate={atelierSelectedDate}
                    dateRange={atelierDateRange}
                    onFilterChange={(type, year, month, date, range) => {
                      setAtelierFilterType(type);
                      if (year !== undefined) setAtelierSelectedYear(year);
                      if (month !== undefined) setAtelierSelectedMonth(month);
                      if (date !== undefined) setAtelierSelectedDate(date);
                      if (range !== undefined) setAtelierDateRange(range);
                    }}
                    availableMonths={availableMonths}
                    availableYears={atelierAvailableYears}
                  />
                </>
              )}
            </div>
          )}

          {activeView === 'carte' && (
            <CarteView
              dateRange={dateRange}
              setDateRange={setDateRange}
              filterType={filterType}
              setFilterType={setFilterType}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              availableMonths={availableMonths}
            />
          )}

          {activeView === 'vrac' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Historique des bilans matières - Collapsible */}
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 sm:p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setIsBilansExpanded(!isBilansExpanded)}
                >
                  <h2 className="text-xl sm:text-2xl font-bold">Historique des bilans</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    {isBilansExpanded ? (
                      <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
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



              {/* Historique des ventes par mandataire MOVED TO DISTRIBUTION VIEW */}



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

          {activeView === 'distribution' && (
            <DistributionView
              dateRange={dateRange}
              setDateRange={setDateRange}
              filterType={filterType}
              setFilterType={setFilterType}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              availableMonths={availableMonths}
            />
          )}
        </div>
      </main >

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; GazPILOT - {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</p>
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

      {/* Data Chatbot - visible only on dashboard */}
      <DataChatbot />
    </div >
  );
};

export default DashboardHistorique;
