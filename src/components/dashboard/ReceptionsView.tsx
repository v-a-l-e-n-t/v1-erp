import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Upload, TrendingUp, Package, BarChart3, Pencil, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReceptionsViewProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  filterType: 'month' | 'date' | 'range' | 'year';
  setFilterType: (type: 'month' | 'date' | 'range' | 'year') => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
}

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

export default function ReceptionsView({
  dateRange,
  setDateRange,
  filterType,
  setFilterType,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  availableMonths
}: ReceptionsViewProps) {
  const [receptions, setReceptions] = useState<ReceptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonthsFromData, setAvailableMonthsFromData] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ date: string; client: string; poids_kg: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyReceptions, setHistoryReceptions] = useState<ReceptionData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterClient, setHistoryFilterClient] = useState<string>('all');
  const [historyFilterType, setHistoryFilterType] = useState<'year' | 'month' | 'date' | 'range'>('year');
  const [historyFilterYear, setHistoryFilterYear] = useState<number>(new Date().getFullYear());
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [historyFilterDate, setHistoryFilterDate] = useState<Date | undefined>(undefined);
  const [historyFilterDateRange, setHistoryFilterDateRange] = useState<DateRange | undefined>(undefined);

  // Calculer les dates de début et fin selon le filtre
  const { startDate, endDate } = useMemo(() => {
    if (filterType === 'date' && selectedDate) {
      const date = format(selectedDate, 'yyyy-MM-dd');
      return { startDate: date, endDate: date };
    }
    if (filterType === 'range' && dateRange?.from && dateRange?.to) {
      return {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd')
      };
    }
    if (filterType === 'month') {
      // Si selectedMonth est défini, l'utiliser, sinon utiliser le mois en cours
      const monthToUse = selectedMonth || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();
      const [year, month] = monthToUse.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateObj = endOfMonth(new Date(year, month - 1, 1));
      const end = format(endDateObj, 'yyyy-MM-dd');
      return { startDate: start, endDate: end };
    }
    if (filterType === 'year') {
      // Pour l'année, on utilise selectedYear
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      return { startDate: start, endDate: end };
    }
    // Par défaut: mois en cours
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateObj = endOfMonth(new Date(year, month - 1, 1));
    const end = format(endDateObj, 'yyyy-MM-dd');
    return { startDate: start, endDate: end };
  }, [filterType, selectedDate, dateRange, selectedMonth, selectedYear]);

  // Charger les années et mois disponibles au montage
  useEffect(() => {
    const fetchAvailableData = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('receptions_clients')
          .select('date')
          .order('date', { ascending: false });
        
        if (error) throw error;
        
        const years = new Set<number>();
        const months = new Set<string>();
        
        (data || []).forEach((r: ReceptionData) => {
          const date = new Date(r.date);
          const year = date.getFullYear();
          const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          years.add(year);
          months.add(month);
        });
        
        const yearsArray = Array.from(years).sort((a, b) => b - a);
        const monthsArray = Array.from(months).sort((a, b) => {
          // Trier par date décroissante (plus récent en premier)
          return b.localeCompare(a);
        });
        
        setAvailableYears(yearsArray);
        setAvailableMonthsFromData(monthsArray);
        
        // Si l'année actuelle n'a pas de données, utiliser la première année disponible
        if (yearsArray.length > 0 && !yearsArray.includes(selectedYear)) {
          setSelectedYear(yearsArray[0]);
        }
        
        // Si aucun mois n'est sélectionné ou si le mois sélectionné n'existe pas dans les données, utiliser le premier mois disponible
        if (monthsArray.length > 0 && (!selectedMonth || !monthsArray.includes(selectedMonth))) {
          // Ne pas mettre à jour selectedMonth si c'est déjà défini par le parent
          // setSelectedMonth(monthsArray[0]);
        }
      } catch (error) {
        console.error('Error fetching available data:', error);
      }
    };
    
    fetchAvailableData();
  }, []);

  const fetchReceptions = async () => {
    // Vérifier que startDate et endDate sont définis avant de faire la requête
    if (!startDate || !endDate) {
      console.warn('startDate or endDate is not defined yet, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = (supabase as any)
        .from('receptions_clients')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedClient !== 'all') {
        query = query.eq('client', selectedClient);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setReceptions(data || []);
      
      // Si aucune donnée trouvée, afficher un message informatif
      if (!data || data.length === 0) {
        console.log('Aucune réception trouvée pour la période:', { startDate, endDate });
      }
    } catch (error: any) {
      console.error('Error fetching receptions:', error);
      toast.error('Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger toutes les données de l'historique (indépendamment des filtres principaux)
  const fetchHistoryReceptions = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('receptions_clients')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setHistoryReceptions(data || []);
    } catch (error: any) {
      console.error('Error fetching history receptions:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedClient, selectedYear]);

  // Charger les données de l'historique indépendamment des filtres principaux
  useEffect(() => {
    if (historyExpanded) {
      fetchHistoryReceptions();
    }
  }, [historyExpanded]);

  // Statistiques globales
  const stats = useMemo(() => {
    const total = receptions.reduce((sum, r) => sum + r.poids_kg, 0);
    const byClient = receptions.reduce((acc, r) => {
      acc[r.client] = (acc[r.client] || 0) + r.poids_kg;
      return acc;
    }, {} as Record<string, number>);
    const uniqueDates = new Set(receptions.map(r => r.date)).size;
    const uniqueClients = new Set(receptions.map(r => r.client)).size;

    return {
      total,
      byClient,
      uniqueDates,
      uniqueClients,
      count: uniqueDates  // Nombre de réceptions = nombre de dates uniques (une réception peut être répartie entre plusieurs clients)
    };
  }, [receptions]);

  // Données pour graphiques
  const chartData = useMemo(() => {
    // Par date
    const byDate = receptions.reduce((acc, r) => {
      const date = format(new Date(r.date), 'dd/MM');
      if (!acc[date]) {
        acc[date] = { date, TOTAL_ENERGIES: 0, PETRO_IVOIRE: 0, VIVO_ENERGIES: 0 };
      }
      const clientKey = r.client as 'TOTAL_ENERGIES' | 'PETRO_IVOIRE' | 'VIVO_ENERGIES';
      if (clientKey in acc[date]) {
        acc[date][clientKey] += r.poids_kg;
      }
      return acc;
    }, {} as Record<string, { date: string; TOTAL_ENERGIES: number; PETRO_IVOIRE: number; VIVO_ENERGIES: number }>);

    return Object.values(byDate).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA - monthB || dayA - dayB;
    });
  }, [receptions]);

  // Données par client pour graphique en barres
  const clientData = useMemo(() => {
    return Object.entries(stats.byClient).map(([client, total]) => ({
      client: CLIENT_LABELS[client] || client,
      clientKey: client, // Garder la clé originale pour les couleurs
      total: total, // En Kg
      count: receptions.filter(r => r.client === client).length
    }));
  }, [stats, receptions]);

  // Fonction pour obtenir la couleur selon le client
  const getClientColor = (clientKey: string) => {
    switch (clientKey) {
      case 'PETRO_IVOIRE':
        return '#f97316'; // orange
      case 'VIVO_ENERGIES':
        return '#10b981'; // vert
      case 'TOTAL_ENERGIES':
        return '#3b82f6'; // bleu
      default:
        return '#3b82f6';
    }
  };

  // Gestion d'erreur pour éviter un écran blanc
  // S'assurer que startDate et endDate sont toujours définis
  if (!startDate || !endDate) {
    // Si les dates ne sont pas encore calculées, afficher un message de chargement
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Initialisation des filtres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Réceptions par Client</h2>
        <p className="text-muted-foreground">Historique des réceptions GPL par client</p>
        {availableYears.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Années disponibles: {availableYears.join(', ')}
          </p>
        )}
      </div>

      {/* Filtres et Nombre de réceptions */}
      <Card>
        <CardHeader>
          {receptions.length === 0 && !loading && (
            <CardDescription className="text-amber-600 mb-4">
              Aucune donnée pour cette période ({startDate} - {endDate}). 
              Essayez de sélectionner une autre période, une année complète, ou vérifiez que les données ont bien été importées.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filtres à gauche */}
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="range">Période</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>

              {filterType === 'month' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableMonthsFromData.length > 0 ? availableMonthsFromData : Array.from(new Set(availableMonths))).map(month => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'year' && (
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filterType === 'date' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={fr}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {filterType === 'range' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
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
                      onSelect={setDateRange}
                      locale={fr}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                  <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                  <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tonnage et Nombre de réceptions à droite */}
            <div className="flex gap-4 items-center">
              {/* Tonnage */}
              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Tonnage</p>
                    <p className="text-2xl font-bold">{stats.total.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg</p>
                  </div>
                </CardContent>
              </Card>
              {/* Nombre de réceptions */}
              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de réceptions</p>
                    <p className="text-2xl font-bold">{stats.count}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition par Client - Pleine largeur */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Client</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={clientData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="client" />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                width={80}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].value?.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" name="">
                {clientData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getClientColor(entry.clientKey)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique évolution temporelle - Pleine largeur (masqué pour un seul jour) */}
      {filterType !== 'date' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Évolution Temporelle</CardTitle>
            <CardDescription>Réceptions par jour (Kg)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis 
                  tickFormatter={(value) => value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  width={80}
                />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg`} />
                <Legend />
                <Bar dataKey="TOTAL_ENERGIES" stackId="1" fill="#3b82f6" name="Total Énergies" />
                <Bar dataKey="PETRO_IVOIRE" stackId="1" fill="#f97316" name="Petro Ivoire" />
                <Bar dataKey="VIVO_ENERGIES" stackId="1" fill="#10b981" name="Vivo Énergies" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Historique avec édition et suppression */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setHistoryExpanded(!historyExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historique des Réceptions</CardTitle>
              <CardDescription>Modifier ou supprimer les réceptions</CardDescription>
            </div>
            {historyExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {historyExpanded && (
          <CardContent>
            {/* Filtres pour l'historique */}
            <div className="mb-4 flex flex-wrap items-center gap-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Client:</Label>
                <Select value={historyFilterClient} onValueChange={setHistoryFilterClient}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous les clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                    <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                    <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Date:</Label>
                <Select value={historyFilterType} onValueChange={(v) => setHistoryFilterType(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Année</SelectItem>
                    <SelectItem value="month">Mois</SelectItem>
                    <SelectItem value="date">Jour</SelectItem>
                    <SelectItem value="range">Période</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {historyFilterType === 'year' && (
                <Select value={historyFilterYear.toString()} onValueChange={(v) => setHistoryFilterYear(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {historyFilterType === 'month' && (
                <Select value={historyFilterMonth} onValueChange={setHistoryFilterMonth}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableMonthsFromData.length > 0 ? availableMonthsFromData : Array.from(new Set(availableMonths))).map(month => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {historyFilterType === 'date' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {historyFilterDate ? format(historyFilterDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={historyFilterDate}
                      onSelect={setHistoryFilterDate}
                      locale={fr}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {historyFilterType === 'range' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {historyFilterDateRange?.from ? (
                        historyFilterDateRange.to ? (
                          `${format(historyFilterDateRange.from, 'PPP', { locale: fr })} - ${format(historyFilterDateRange.to, 'PPP', { locale: fr })}`
                        ) : (
                          format(historyFilterDateRange.from, 'PPP', { locale: fr })
                        )
                      ) : (
                        'Sélectionner une période'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={historyFilterDateRange}
                      onSelect={setHistoryFilterDateRange}
                      locale={fr}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {historyLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : (() => {
              // Filtrer les réceptions selon les filtres de l'historique (utiliser historyReceptions au lieu de receptions)
              let filteredReceptions = historyReceptions;
              
              // Filtre par client
              if (historyFilterClient !== 'all') {
                filteredReceptions = filteredReceptions.filter(r => r.client === historyFilterClient);
              }
              
              // Filtre par date selon le type
              if (historyFilterType === 'year') {
                filteredReceptions = filteredReceptions.filter(r => {
                  const year = new Date(r.date).getFullYear();
                  return year === historyFilterYear;
                });
              } else if (historyFilterType === 'month' && historyFilterMonth) {
                const [year, month] = historyFilterMonth.split('-').map(Number);
                const start = `${year}-${String(month).padStart(2, '0')}-01`;
                const endDateObj = endOfMonth(new Date(year, month - 1, 1));
                const end = format(endDateObj, 'yyyy-MM-dd');
                filteredReceptions = filteredReceptions.filter(r => r.date >= start && r.date <= end);
              } else if (historyFilterType === 'date' && historyFilterDate) {
                const filterDateStr = format(historyFilterDate, 'yyyy-MM-dd');
                filteredReceptions = filteredReceptions.filter(r => r.date === filterDateStr);
              } else if (historyFilterType === 'range' && historyFilterDateRange?.from) {
                const fromStr = format(historyFilterDateRange.from, 'yyyy-MM-dd');
                const toStr = historyFilterDateRange.to ? format(historyFilterDateRange.to, 'yyyy-MM-dd') : fromStr;
                filteredReceptions = filteredReceptions.filter(r => r.date >= fromStr && r.date <= toStr);
              }
              
              return filteredReceptions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucune réception trouvée avec ces filtres</p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">
                      <span className="text-primary font-bold">{filteredReceptions.length}</span> résultat(s) trouvé(s)
                    </p>
                  </div>
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
                      {filteredReceptions.map((reception) => (
                    <TableRow key={reception.id}>
                      {editingId === reception.id && editingData ? (
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const { error } = await (supabase as any)
                                      .from('receptions_clients')
                                      .update({
                                        date: editingData.date,
                                        client: editingData.client,
                                        poids_kg: editingData.poids_kg
                                      })
                                      .eq('id', reception.id);

                                    if (error) throw error;

                                    toast.success('Réception modifiée avec succès');
                                    setEditingId(null);
                                    setEditingData(null);
                                    fetchReceptions();
                                    fetchHistoryReceptions();
                                  } catch (error: any) {
                                    console.error('Error updating reception:', error);
                                    toast.error('Erreur lors de la modification');
                                  }
                                }}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingData(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{format(new Date(reception.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                          <TableCell>{CLIENT_LABELS[reception.client] || reception.client}</TableCell>
                          <TableCell className="text-right">{reception.poids_kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(reception.id);
                                  setEditingData({
                                    date: reception.date,
                                    client: reception.client,
                                    poids_kg: reception.poids_kg
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteId(reception.id)}
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
                </>
              );
            })()}
          </CardContent>
        )}
      </Card>

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
              onClick={async () => {
                if (!deleteId) return;
                try {
                  const { error } = await (supabase as any)
                    .from('receptions_clients')
                    .delete()
                    .eq('id', deleteId);

                  if (error) throw error;

                  toast.success('Réception supprimée avec succès');
                  setDeleteId(null);
                  fetchReceptions();
                  fetchHistoryReceptions();
                } catch (error: any) {
                  console.error('Error deleting reception:', error);
                  toast.error('Erreur lors de la suppression');
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
