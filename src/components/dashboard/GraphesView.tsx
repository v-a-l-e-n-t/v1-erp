import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { saveFilterState, loadFilterState, dateRangeToState, stateToDateRange, stateToDate, FilterType } from '@/utils/filterPersistence';

interface GraphesViewProps {}

interface ChartDataPoint {
  mois: string;
  volume: number;
  [key: string]: string | number;
}

const CLIENT_LABELS: Record<string, string> = {
  'TOTAL_ENERGIES': 'Total Énergies',
  'PETRO_IVOIRE': 'Petro Ivoire',
  'VIVO_ENERGIES': 'Vivo Énergies'
};

export default function GraphesView({}: GraphesViewProps) {
  // Filtres avec persistance
  const loadGraphesFilters = () => {
    const saved = loadFilterState('graphes');
    if (saved) {
      return {
        filterType: saved.filterType,
        selectedYear: saved.selectedYear || new Date().getFullYear(),
        selectedMonth: saved.selectedMonth || (() => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        })(),
        selectedDate: stateToDate(saved.selectedDate),
        dateRange: stateToDateRange(saved.dateRange),
        selectedClient: saved.selectedClient || 'all'
      };
    }
    const now = new Date();
    return {
      filterType: 'month' as FilterType,
      selectedYear: now.getFullYear(),
      selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      selectedDate: undefined,
      dateRange: undefined,
      selectedClient: 'all'
    };
  };

  const initialFilters = loadGraphesFilters();
  const [filterType, setFilterType] = useState<FilterType>(initialFilters.filterType);
  const [selectedYear, setSelectedYear] = useState<number>(initialFilters.selectedYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialFilters.selectedMonth);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialFilters.selectedDate);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters.dateRange);
  const [selectedClient, setSelectedClient] = useState<string>(initialFilters.selectedClient || 'all');

  // Sauvegarder les filtres
  useEffect(() => {
    saveFilterState('graphes', {
      filterType,
      selectedYear,
      selectedMonth,
      selectedDate: selectedDate?.toISOString(),
      dateRange: dateRangeToState(dateRange),
      selectedClient
    } as any);
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange, selectedClient]);

  // Années disponibles
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Mois disponibles pour l'année sélectionnée
  const availableMonths = useMemo(() => {
    if (filterType !== 'month') return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear, filterType]);

  // Calculer les dates de début et fin selon le filtre
  const { startDate, endDate } = useMemo(() => {
    if (filterType === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (filterType === 'year') {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
      };
    }
    if (filterType === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const end = format(endOfMonth(new Date(y, m - 1, 1)), 'yyyy-MM-dd');
      return { startDate: start, endDate: end };
    }
    if (filterType === 'day' && selectedDate) {
      const date = format(selectedDate, 'yyyy-MM-dd');
      return { startDate: date, endDate: date };
    }
    if (filterType === 'period' && dateRange?.from) {
      return {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  // Données pour le graphique 1: RECEPTION BUTANE
  const [receptionData, setReceptionData] = useState<ChartDataPoint[]>([]);
  const [loadingReception, setLoadingReception] = useState(false);

  useEffect(() => {
    const fetchReceptionData = async () => {
      setLoadingReception(true);
      try {
        let query = supabase.from('receptions_clients').select('*');

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }

        if (selectedClient !== 'all') {
          query = query.eq('client', selectedClient);
        }

        const { data, error } = await query.order('date', { ascending: true });

        if (error) throw error;

        // Grouper par mois
        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((r: any) => {
          const date = new Date(r.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(r.poids_kg || 0);
        });

        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000 // Convertir en tonnes
          }));

        setReceptionData(chartData);
      } catch (error) {
        console.error('Error fetching reception data:', error);
      } finally {
        setLoadingReception(false);
      }
    };

    fetchReceptionData();
  }, [startDate, endDate, selectedClient]);

  // Données pour le graphique 2: TAUX D'ENLEVEMENT BUTANE
  const [tauxEnlevementData, setTauxEnlevementData] = useState<ChartDataPoint[]>([]);
  const [loadingTaux, setLoadingTaux] = useState(false);

  useEffect(() => {
    const fetchTauxEnlevementData = async () => {
      setLoadingTaux(true);
      try {
        // Récupérer les réceptions avec batch fetching
        const BATCH_SIZE = 1000;
        const allReceptions: any[] = [];
        let receptionsOffset = 0;
        let receptionsHasMore = true;

        while (receptionsHasMore) {
          let receptionsQuery = supabase.from('receptions_clients').select('*');
          
          if (startDate && endDate) {
            receptionsQuery = receptionsQuery.gte('date', startDate).lte('date', endDate);
          }

          const { data, error } = await receptionsQuery
            .range(receptionsOffset, receptionsOffset + BATCH_SIZE - 1)
            .order('date', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            allReceptions.push(...data);
            receptionsHasMore = data.length === BATCH_SIZE;
            receptionsOffset += BATCH_SIZE;
          } else {
            receptionsHasMore = false;
          }
        }

        // Récupérer les ventes avec batch fetching
        const allVentes: any[] = [];
        let ventesOffset = 0;
        let ventesHasMore = true;

        while (ventesHasMore) {
          let ventesQuery = supabase
            .from('ventes_mandataires')
            .select('*, mandataires:mandataire_id (id, nom)');

          if (startDate && endDate) {
            ventesQuery = ventesQuery.gte('date', startDate).lte('date', endDate);
          }

          const { data, error } = await ventesQuery
            .range(ventesOffset, ventesOffset + BATCH_SIZE - 1)
            .order('date', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            allVentes.push(...data);
            ventesHasMore = data.length === BATCH_SIZE;
            ventesOffset += BATCH_SIZE;
          } else {
            ventesHasMore = false;
          }
        }

        // Calculer le tonnage des ventes
        const calculateTonnage = (v: any) => {
          const recharges = (v.r_b6 || 0) * 6 + (v.r_b12 || 0) * 12.5 + (v.r_b28 || 0) * 28 + (v.r_b38 || 0) * 38 + (v.r_b11_carbu || 0) * 12.5;
          const consignes = (v.c_b6 || 0) * 6 + (v.c_b12 || 0) * 12.5 + (v.c_b28 || 0) * 28 + (v.c_b38 || 0) * 38 + (v.c_b11_carbu || 0) * 12.5;
          return recharges + consignes;
        };

        // Grouper par mois
        const monthlyReceptions: { [key: string]: number } = {};
        allReceptions.forEach((r: any) => {
          const date = new Date(r.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyReceptions[monthKey] = (monthlyReceptions[monthKey] || 0) + Number(r.poids_kg || 0);
        });

        const monthlyVentes: { [key: string]: number } = {};
        allVentes.forEach((v: any) => {
          const date = new Date(v.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyVentes[monthKey] = (monthlyVentes[monthKey] || 0) + calculateTonnage(v);
        });

        // Calculer le taux d'enlèvement (%)
        const allMonths = new Set([...Object.keys(monthlyReceptions), ...Object.keys(monthlyVentes)]);
        const chartData = Array.from(allMonths)
          .sort()
          .map(month => {
            const reception = monthlyReceptions[month] || 0;
            const vente = monthlyVentes[month] || 0;
            const taux = reception > 0 ? (vente / reception) * 100 : 0;
            
            return {
              mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
              volume: Number(taux.toFixed(2))
            };
          });

        // Debug logs pour diagnostiquer
        console.log('=== TAUX D\'ENLEVEMENT DEBUG ===');
        console.log('Filter:', { filterType, startDate, endDate });
        console.log('Total receptions count:', allReceptions.length);
        console.log('Total ventes count:', allVentes.length);
        console.log('Monthly Receptions:', monthlyReceptions);
        console.log('Monthly Ventes:', monthlyVentes);
        console.log('Chart Data:', chartData);
        console.log('==============================');

        setTauxEnlevementData(chartData);
      } catch (error) {
        console.error('Error fetching taux enlevement data:', error);
      } finally {
        setLoadingTaux(false);
      }
    };

    fetchTauxEnlevementData();
  }, [startDate, endDate]);

  // Données pour le graphique 3: EVOLUTION DES SORTIE COND
  const [sortieCondData, setSortieCondData] = useState<ChartDataPoint[]>([]);
  const [loadingSortieCond, setLoadingSortieCond] = useState(false);

  useEffect(() => {
    const fetchSortieCondData = async () => {
      setLoadingSortieCond(true);
      try {
        // Mapper les clients aux noms de colonnes
        const clientFieldMap: { [key: string]: string } = {
          'TOTAL_ENERGIES': 'sorties_conditionnees_total_energies',
          'PETRO_IVOIRE': 'sorties_conditionnees_petro_ivoire',
          'VIVO_ENERGIES': 'sorties_conditionnees_vivo_energies'
        };

        let selectFields = 'date, sorties_conditionnees';
        if (selectedClient !== 'all' && clientFieldMap[selectedClient]) {
          selectFields += `, ${clientFieldMap[selectedClient]}`;
        }

        let query = supabase.from('bilan_entries').select(selectFields);

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: true });

        if (error) throw error;

        // Grouper par mois
        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          const value = selectedClient !== 'all' && clientFieldMap[selectedClient]
            ? Number(b[clientFieldMap[selectedClient]] || 0)
            : Number(b.sorties_conditionnees || 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
        });

        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000 // Convertir en tonnes
          }));

        setSortieCondData(chartData);
      } catch (error) {
        console.error('Error fetching sortie cond data:', error);
      } finally {
        setLoadingSortieCond(false);
      }
    };

    fetchSortieCondData();
  }, [startDate, endDate, selectedClient]);

  // Données pour le graphique 4: EVOLUTION DES SORTIE VRAC
  const [sortieVracData, setSortieVracData] = useState<ChartDataPoint[]>([]);
  const [loadingSortieVrac, setLoadingSortieVrac] = useState(false);

  useEffect(() => {
    const fetchSortieVracData = async () => {
      setLoadingSortieVrac(true);
      try {
        // Mapper les clients aux noms de colonnes
        const clientFieldMap: { [key: string]: string } = {
          'TOTAL_ENERGIES': 'sorties_vrac_total_energies',
          'PETRO_IVOIRE': 'sorties_vrac_petro_ivoire',
          'VIVO_ENERGIES': 'sorties_vrac_vivo_energies'
        };

        let selectFields = 'date, sorties_vrac';
        if (selectedClient !== 'all' && clientFieldMap[selectedClient]) {
          selectFields += `, ${clientFieldMap[selectedClient]}`;
        }

        let query = supabase.from('bilan_entries').select(selectFields);

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: true });

        if (error) throw error;

        // Grouper par mois
        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          const value = selectedClient !== 'all' && clientFieldMap[selectedClient]
            ? Number(b[clientFieldMap[selectedClient]] || 0)
            : Number(b.sorties_vrac || 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
        });

        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000 // Convertir en tonnes
          }));

        setSortieVracData(chartData);
      } catch (error) {
        console.error('Error fetching sortie vrac data:', error);
      } finally {
        setLoadingSortieVrac(false);
      }
    };

    fetchSortieVracData();
  }, [startDate, endDate, selectedClient]);

  // Données pour le graphique 5: EVOLUTION BILAN MATIERE
  const [bilanData, setBilanData] = useState<ChartDataPoint[]>([]);
  const [loadingBilan, setLoadingBilan] = useState(false);

  useEffect(() => {
    const fetchBilanData = async () => {
      setLoadingBilan(true);
      try {
        let query = supabase.from('bilan_entries').select('date, bilan');

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: true });

        if (error) throw error;

        // Grouper par mois
        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(b.bilan || 0);
        });

        const chartData = Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000 // Convertir en tonnes
          }));

        setBilanData(chartData);
      } catch (error) {
        console.error('Error fetching bilan data:', error);
      } finally {
        setLoadingBilan(false);
      }
    };

    fetchBilanData();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Type de filtre */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes périodes</SelectItem>
                <SelectItem value="year">Année</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="day">Jour</SelectItem>
                <SelectItem value="period">Période</SelectItem>
              </SelectContent>
            </Select>

            {/* Année */}
            {filterType === 'year' && (
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Mois */}
            {filterType === 'month' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => {
                    const [y, m] = month.split('-').map(Number);
                    return (
                      <SelectItem key={month} value={month}>
                        {format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {/* Jour */}
            {filterType === 'day' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Période */}
            {filterType === 'period' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[300px] justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} -{' '}
                          {format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy', { locale: fr })
                      )
                    ) : (
                      'Sélectionner une période'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Client (pour les graphiques qui le nécessitent - pas pour BILAN MATIERE) */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Le filtre client s'applique aux graphiques 1, 3 et 4 uniquement
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Graphique 1: RECEPTION BUTANE */}
      <Card>
        <CardHeader>
          <CardTitle>RECEPTION BUTANE</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReception ? (
            <div className="h-[400px] flex items-center justify-center">Chargement...</div>
          ) : receptionData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={receptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis label={{ value: 'Volume (tonnes)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Volume (tonnes)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graphique 2: TAUX D'ENLEVEMENT BUTANE */}
      <Card>
        <CardHeader>
          <CardTitle>TAUX D'ENLEVEMENT BUTANE</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTaux ? (
            <div className="h-[400px] flex items-center justify-center">Chargement...</div>
          ) : tauxEnlevementData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={tauxEnlevementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#82ca9d" name="Taux d'enlèvement (%)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graphique 3: EVOLUTION DES SORTIE COND */}
      <Card>
        <CardHeader>
          <CardTitle>EVOLUTION DES SORTIE COND</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSortieCond ? (
            <div className="h-[400px] flex items-center justify-center">Chargement...</div>
          ) : sortieCondData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={sortieCondData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis label={{ value: 'Volume Conditionné (tonnes)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#ffc658" name="Volume Conditionné (tonnes)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graphique 4: EVOLUTION DES SORTIE VRAC */}
      <Card>
        <CardHeader>
          <CardTitle>EVOLUTION DES SORTIE VRAC</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSortieVrac ? (
            <div className="h-[400px] flex items-center justify-center">Chargement...</div>
          ) : sortieVracData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={sortieVracData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis label={{ value: 'Volume Vrac (tonnes)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#ff7300" name="Volume Vrac (tonnes)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graphique 5: EVOLUTION BILAN MATIERE */}
      <Card>
        <CardHeader>
          <CardTitle>EVOLUTION BILAN MATIERE</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBilan ? (
            <div className="h-[400px] flex items-center justify-center">Chargement...</div>
          ) : bilanData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={bilanData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis label={{ value: 'Volume Bilan (tonnes)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Volume Bilan (tonnes)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
