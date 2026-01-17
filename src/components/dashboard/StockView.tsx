import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Package, TrendingUp, TrendingDown, AlertTriangle, FileText, Warehouse, Building2 } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  StockMovement,
  StockState,
  StockCategory,
  StockSite,
  BottleType,
  STOCK_CATEGORY_LABELS,
  STOCK_SITE_LABELS,
  BOTTLE_TYPE_LABELS,
  STOCK_CLIENT_LABELS,
  MOVEMENT_TYPE_LABELS
} from '@/types/stock';
import {
  loadStockMovements,
  calculateAllStockStatesFromDB,
  getStockStats
} from '@/utils/stockStorage';
import {
  calculateAllStockStates,
  detectSignificantDiscrepancies,
  generateStockSummary
} from '@/utils/stockCalculations';

interface StockViewProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  filterType: 'all' | 'year' | 'month' | 'period' | 'day';
  setFilterType: (type: 'all' | 'year' | 'month' | 'period' | 'day') => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
}

export default function StockView({
  dateRange,
  setDateRange,
  filterType,
  setFilterType,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  availableMonths
}: StockViewProps) {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockStates, setStockStates] = useState<StockState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Mois disponibles pour l'année sélectionnée
  const availableMonthsForYear = useMemo(() => {
    if (filterType !== 'month') return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear, filterType]);

  // Calculer les dates selon le filtre
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
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
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
  }, [filterType, selectedDate, dateRange, selectedMonth, selectedYear]);

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movementsData, statesData] = await Promise.all([
          loadStockMovements({
            startDate,
            endDate,
            dateRange: filterType === 'period' ? dateRange : undefined
          }),
          calculateAllStockStatesFromDB()
        ]);

        setMovements(movementsData);
        setStockStates(statesData);
      } catch (error) {
        console.error('Error loading stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, filterType, dateRange]);

  // Générer la synthèse complète (logique Excel)
  const summary = useMemo(() => {
    return generateStockSummary(movements, startDate, endDate);
  }, [movements, startDate, endDate]);

  // Calculer les KPI principaux
  const kpis = useMemo(() => {
    const ecartsSignificatifs = detectSignificantDiscrepancies(stockStates, 10);
    return {
      totalStock: summary.total_stock_theorique,
      totalEntrees: summary.total_entrees,
      totalSorties: summary.total_sorties,
      ecartsSignificatifs: ecartsSignificatifs.length,
      solde: summary.total_entrees - summary.total_sorties
    };
  }, [stockStates, summary]);

  const getPeriodText = () => {
    if (filterType === 'all') return 'Toutes périodes';
    if (filterType === 'year') return `Année ${selectedYear}`;
    if (filterType === 'month') {
      const monthDate = new Date(selectedMonth + '-01');
      return monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    if (filterType === 'day' && selectedDate) {
      return format(selectedDate, 'dd MMMM yyyy', { locale: fr });
    }
    if (filterType === 'period' && dateRange?.from) {
      if (dateRange.to) {
        return `Du ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
      }
      return format(dateRange.from, 'dd MMMM yyyy', { locale: fr });
    }
    return '';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Synthèse des Stocks
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Vue d'ensemble des mouvements et stocks de bouteilles GPL
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={filterType} onValueChange={(v: 'all' | 'year' | 'month' | 'period' | 'day') => setFilterType(v)}>
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
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
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
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/stock')}
            className="h-8 sm:h-9"
          >
            <Package className="mr-2 h-4 w-4" />
            Saisie
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards - Vue d'ensemble */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">Stock Théorique</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {kpis.totalStock.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total bouteilles</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50/50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">Entrées</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {kpis.totalEntrees.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{getPeriodText()}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">Sorties</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {kpis.totalSorties.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{getPeriodText()}</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">Solde</CardTitle>
                <FileText className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  kpis.solde >= 0 ? "text-green-700" : "text-red-700"
                )}>
                  {kpis.solde >= 0 ? '+' : ''}{kpis.solde.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Entrées - Sorties</p>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              kpis.ecartsSignificatifs > 0 ? "bg-amber-50/50 border-amber-200" : "bg-gray-50/50 border-gray-200"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">Écarts</CardTitle>
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  kpis.ecartsSignificatifs > 0 ? "text-amber-600" : "text-gray-600"
                )} />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  kpis.ecartsSignificatifs > 0 ? "text-amber-700" : "text-gray-700"
                )}>
                  {kpis.ecartsSignificatifs}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Écarts significatifs</p>
              </CardContent>
            </Card>
          </div>

          {/* Synthèse principale avec onglets */}
          <Tabs defaultValue="categories" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="categories">Par Catégorie</TabsTrigger>
              <TabsTrigger value="sites">Par Site</TabsTrigger>
              <TabsTrigger value="bottles">Par Type de Bouteille</TabsTrigger>
            </TabsList>

            {/* Synthèse par Catégorie */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Synthèse par Catégorie
                  </CardTitle>
                  <CardDescription>
                    Vue détaillée des stocks et mouvements par catégorie {getPeriodText() && `- ${getPeriodText()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Catégorie</TableHead>
                          <TableHead className="text-right font-bold">Stock Théorique</TableHead>
                          <TableHead className="text-right font-bold text-green-700">Entrées</TableHead>
                          <TableHead className="text-right font-bold text-red-700">Sorties</TableHead>
                          <TableHead className="text-right font-bold">Solde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(summary.categories)
                          .filter(([category]) => category !== 'parc_ce')
                          .map(([category, data]) => (
                          <TableRow key={category} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {STOCK_CATEGORY_LABELS[category as StockCategory]}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {data.stock_theorique.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {data.entrees.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {data.sorties.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-bold",
                              (data.entrees - data.sorties) >= 0 ? "text-green-700" : "text-red-700"
                            )}>
                              {(data.entrees - data.sorties).toLocaleString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold border-t-2">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            {summary.total_stock_theorique.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-green-700">
                            {summary.total_entrees.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-red-700">
                            {summary.total_sorties.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            kpis.solde >= 0 ? "text-green-700" : "text-red-700"
                          )}>
                            {kpis.solde.toLocaleString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Synthèse par Site */}
            <TabsContent value="sites" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Synthèse par Site
                  </CardTitle>
                  <CardDescription>
                    Comparaison Dépôt Vrac vs Centre Emplisseur {getPeriodText() && `- ${getPeriodText()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Site</TableHead>
                          <TableHead className="text-right font-bold">Stock Théorique</TableHead>
                          <TableHead className="text-right font-bold text-green-700">Entrées</TableHead>
                          <TableHead className="text-right font-bold text-red-700">Sorties</TableHead>
                          <TableHead className="text-right font-bold">Solde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(summary.sites).map(([site, data]) => (
                          <TableRow key={site} className="hover:bg-muted/30">
                            <TableCell className="font-medium flex items-center gap-2">
                              {site === 'depot_vrac' ? (
                                <Warehouse className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Building2 className="h-4 w-4 text-green-600" />
                              )}
                              {STOCK_SITE_LABELS[site as StockSite]}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {data.stock_theorique.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {data.entrees.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {data.sorties.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-bold",
                              (data.entrees - data.sorties) >= 0 ? "text-green-700" : "text-red-700"
                            )}>
                              {(data.entrees - data.sorties).toLocaleString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold border-t-2">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            {summary.total_stock_theorique.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-green-700">
                            {summary.total_entrees.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-red-700">
                            {summary.total_sorties.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            kpis.solde >= 0 ? "text-green-700" : "text-red-700"
                          )}>
                            {kpis.solde.toLocaleString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Synthèse par Type de Bouteille */}
            <TabsContent value="bottles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Synthèse par Type de Bouteille
                  </CardTitle>
                  <CardDescription>
                    Répartition par type (B6, B12, B28, B38) {getPeriodText() && `- ${getPeriodText()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold">Type de Bouteille</TableHead>
                          <TableHead className="text-right font-bold">Stock Théorique</TableHead>
                          <TableHead className="text-right font-bold text-green-700">Entrées</TableHead>
                          <TableHead className="text-right font-bold text-red-700">Sorties</TableHead>
                          <TableHead className="text-right font-bold">Solde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(summary.bottle_types).map(([type, data]) => (
                          <TableRow key={type} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {BOTTLE_TYPE_LABELS[type as BottleType]}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {data.stock_theorique.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {data.entrees.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {data.sorties.toLocaleString('fr-FR')}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-bold",
                              (data.entrees - data.sorties) >= 0 ? "text-green-700" : "text-red-700"
                            )}>
                              {(data.entrees - data.sorties).toLocaleString('fr-FR')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold border-t-2">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">
                            {summary.total_stock_theorique.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-green-700">
                            {summary.total_entrees.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right text-red-700">
                            {summary.total_sorties.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            kpis.solde >= 0 ? "text-green-700" : "text-red-700"
                          )}>
                            {kpis.solde.toLocaleString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Écarts significatifs */}
          {kpis.ecartsSignificatifs > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Écarts Significatifs Détectés
                </CardTitle>
                <CardDescription>
                  Les écarts suivants nécessitent une attention particulière
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Stock Théorique</TableHead>
                        <TableHead className="text-right">Stock Réel</TableHead>
                        <TableHead className="text-right">Écart</TableHead>
                        <TableHead>Date Inventaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectSignificantDiscrepancies(stockStates, 10).map((state, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{STOCK_CATEGORY_LABELS[state.category]}</TableCell>
                          <TableCell>{STOCK_SITE_LABELS[state.site]}</TableCell>
                          <TableCell>{BOTTLE_TYPE_LABELS[state.bottle_type]}</TableCell>
                          <TableCell>
                            {state.client ? STOCK_CLIENT_LABELS[state.client] : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {state.stock_theorique.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right">
                            {state.stock_reel?.toLocaleString('fr-FR') || '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            (state.ecart || 0) > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {(state.ecart || 0) > 0 ? '+' : ''}{state.ecart?.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            {state.last_inventory_date
                              ? format(new Date(state.last_inventory_date), 'dd/MM/yyyy', { locale: fr })
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
