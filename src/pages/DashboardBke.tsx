import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BilanBkeEntry } from '@/types/balance-bke';
import { loadBkeEntries, deleteBkeEntry } from '@/utils/storage-bke';
import { formatNumberValue, getNatureBadgeVariant } from '@/utils/calculations-bke';
import { toast } from 'sonner';
import { BarChart3, LogOut, User, Eye, EyeOff, CalendarIcon, TrendingUp, TrendingDown, Package, Truck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import PasswordGate from '@/components/PasswordGate';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

type FilterType = 'all' | 'year' | 'month' | 'period' | 'day';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const DashboardBke = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('dashboard_authenticated') === 'true' || localStorage.getItem('isAuthenticated') === 'true';
  });

  const [entries, setEntries] = useState<BilanBkeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [userName, setUserName] = useState<string>("");

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) setUserName(storedName);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      // On laisse le PasswordGate s'afficher
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const loaded = await loadBkeEntries();
      setEntries(loaded);
    } catch (error) {
      console.error('Error loading BKE entries:', error);
      toast.error('Erreur lors du chargement des données');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user_name");
    sessionStorage.removeItem("dashboard_authenticated");
    setIsAuthenticated(false);
    navigate("/");
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear]);

  // Filter entries based on selected filter
  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;

    return entries.filter(entry => {
      const entryDate = new Date(entry.date);

      if (filterType === 'year') {
        return entryDate.getFullYear() === selectedYear;
      }

      if (filterType === 'month') {
        const [year, month] = selectedMonth.split('-').map(Number);
        return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
      }

      if (filterType === 'day' && selectedDate) {
        return format(entryDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      }

      if (filterType === 'period' && dateRange?.from) {
        const from = dateRange.from;
        const to = dateRange.to || from;
        return entryDate >= from && entryDate <= to;
      }

      return true;
    });
  }, [entries, filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalReceptions = filteredEntries.reduce((sum, e) => sum + (e.reception_gpl || 0), 0);
    const totalSortiesConditionnees = filteredEntries.reduce((sum, e) => sum + (e.sorties_conditionnees || 0), 0);
    const totalRetourMarche = filteredEntries.reduce((sum, e) => sum + (e.fuyardes || 0), 0);
    const totalBilan = filteredEntries.reduce((sum, e) => sum + (e.bilan || 0), 0);

    const positifs = filteredEntries.filter(e => e.nature === 'Positif').length;
    const negatifs = filteredEntries.filter(e => e.nature === 'Négatif').length;
    const neutres = filteredEntries.filter(e => e.nature === 'Neutre').length;

    return {
      totalReceptions,
      totalSortiesConditionnees,
      totalRetourMarche,
      totalBilan,
      positifs,
      negatifs,
      neutres,
      totalEntries: filteredEntries.length
    };
  }, [filteredEntries]);

  // Chart data - Evolution du bilan
  const chartData = useMemo(() => {
    return [...filteredEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
      .map(entry => ({
        date: format(new Date(entry.date), 'dd/MM', { locale: fr }),
        bilan: entry.bilan,
        receptions: entry.reception_gpl,
        sorties: entry.sorties_conditionnees,
        stock: entry.stock_final
      }));
  }, [filteredEntries]);

  // Répartition par client (sorties conditionnées)
  const clientsData = useMemo(() => {
    const totals = {
      'PETRO IVOIRE': 0,
      'VIVO ENERGIES': 0,
      'TOTAL ENERGIES': 0
    };

    filteredEntries.forEach(entry => {
      totals['PETRO IVOIRE'] += entry.sorties_conditionnees_petro_ivoire || 0;
      totals['VIVO ENERGIES'] += entry.sorties_conditionnees_vivo_energies || 0;
      totals['TOTAL ENERGIES'] += entry.sorties_conditionnees_total_energies || 0;
    });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value: Math.round(value)
    })).filter(d => d.value > 0);
  }, [filteredEntries]);

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">GazPILOT</h1>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Bouaké
                </Badge>
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

            {/* KPI Cards Section */}
            {isHeaderExpanded && (
              <div className="flex flex-col gap-3 sm:gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {/* Filtres */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <Select value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
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
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
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
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="h-8 sm:h-9 w-[160px] sm:w-[180px] text-xs sm:text-sm">
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
                    </>
                  )}

                  {filterType === 'day' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 sm:h-9 w-[160px] sm:w-[180px] justify-start text-left font-normal text-xs sm:text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner'}
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

                  {filterType === 'period' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 sm:h-9 w-[250px] sm:w-[300px] justify-start text-left font-normal text-xs sm:text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
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
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/bilan-bke')}
                    className="ml-auto"
                  >
                    Saisir un bilan
                  </Button>
                </div>

                {/* KPI Cards */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4">
                  {/* RÉCEPTIONS GPL */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Truck className="h-3 w-3 text-blue-600" />
                      <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider">
                        RÉCEPTIONS GPL
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-blue-600 tracking-tight">
                      {formatNumberValue(kpis.totalReceptions)}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-blue-600/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>

                  {/* SORTIES CONDITIONNÉES */}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Package className="h-3 w-3 text-green-600" />
                      <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider">
                        SORTIES COND.
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-green-600 tracking-tight">
                      {formatNumberValue(kpis.totalSortiesConditionnees)}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-green-600/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>

                  {/* RETOUR MARCHÉ */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <RotateCcw className="h-3 w-3 text-orange-600" />
                      <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider">
                        RETOUR MARCHÉ
                      </p>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-orange-600 tracking-tight">
                      {formatNumberValue(kpis.totalRetourMarche)}
                      <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-orange-600/60 ml-1 sm:ml-1.5">Kg</span>
                    </p>
                  </div>

                  {/* BILAN TOTAL */}
                  <div className={`bg-gradient-to-br ${kpis.totalBilan >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'} border-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {kpis.totalBilan >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider">
                        BILAN CUMULÉ
                      </p>
                    </div>
                    <p className={`text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight ${kpis.totalBilan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatNumberValue(kpis.totalBilan)}
                      <span className={`text-[10px] sm:text-xs md:text-sm font-semibold ml-1 sm:ml-1.5 ${kpis.totalBilan >= 0 ? 'text-emerald-600/60' : 'text-red-600/60'}`}>Kg</span>
                    </p>
                  </div>

                  {/* STATISTIQUES BILANS */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-2 border-purple-500/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm flex flex-col h-[80px] sm:h-[85px] md:h-[90px] min-w-[140px] sm:min-w-[160px] md:min-w-[200px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <BarChart3 className="h-3 w-3 text-purple-600" />
                      <p className="text-[9px] sm:text-[10px] font-semibold text-black uppercase tracking-wider">
                        BILANS
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-green-600">{kpis.positifs}+</span>
                      <span className="text-xs font-bold text-red-600">{kpis.negatifs}-</span>
                      <span className="text-xs font-bold text-gray-500">{kpis.neutres}=</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {kpis.totalEntries} entrées
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Graphiques */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Evolution du bilan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Évolution du Bilan</CardTitle>
              <CardDescription>30 dernières entrées</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bilanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => [`${formatNumberValue(value)} Kg`, 'Bilan']}
                      labelStyle={{ color: '#000' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bilan"
                      stroke="#3b82f6"
                      fill="url(#bilanGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">Aucune donnée pour cette période</p>
              )}
            </CardContent>
          </Card>

          {/* Répartition par client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition Sorties par Client</CardTitle>
              <CardDescription>Sorties conditionnées</CardDescription>
            </CardHeader>
            <CardContent>
              {clientsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={clientsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clientsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${formatNumberValue(value)} Kg`]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">Aucune donnée pour cette période</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock et Flux */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flux Réceptions vs Sorties</CardTitle>
            <CardDescription>Comparaison des entrées et sorties</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${formatNumberValue(value)} Kg`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="receptions" name="Réceptions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Aucune donnée pour cette période</p>
            )}
          </CardContent>
        </Card>

        {/* Historique des bilans */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des Bilans</CardTitle>
            <CardDescription>
              {filteredEntries.length} entrée(s) pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Aucun bilan pour cette période</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Stock Initial</TableHead>
                      <TableHead className="text-right">Réceptions</TableHead>
                      <TableHead className="text-right">Sorties Cond.</TableHead>
                      <TableHead className="text-right">Retour marché</TableHead>
                      <TableHead className="text-right">Stock Final</TableHead>
                      <TableHead className="text-right">Bilan</TableHead>
                      <TableHead>Nature</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.slice(0, 20).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">{formatNumberValue(entry.stock_initial)}</TableCell>
                        <TableCell className="text-right">{formatNumberValue(entry.reception_gpl)}</TableCell>
                        <TableCell className="text-right">{formatNumberValue(entry.sorties_conditionnees)}</TableCell>
                        <TableCell className="text-right">{formatNumberValue(entry.fuyardes)}</TableCell>
                        <TableCell className="text-right">{formatNumberValue(entry.stock_final)}</TableCell>
                        <TableCell className="text-right">
                          <span className={entry.nature === 'Positif' ? 'text-green-600 font-medium' : entry.nature === 'Négatif' ? 'text-red-600 font-medium' : ''}>
                            {formatNumberValue(entry.bilan)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getNatureBadgeVariant(entry.nature)}>
                            {entry.nature}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredEntries.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Affichage des 20 premières entrées sur {filteredEntries.length}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GazPILOT - Site de Bouaké</p>
        </div>
      </footer>
    </div>
  );
};

export default DashboardBke;
