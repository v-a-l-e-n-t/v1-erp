import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Package, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
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
  const [stats, setStats] = useState({
    total_movements: 0,
    total_entrees: 0,
    total_sorties: 0,
    total_inventaires: 0,
    total_ecarts: 0
  });

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
        const [movementsData, statesData, statsData] = await Promise.all([
          loadStockMovements({
            startDate,
            endDate,
            dateRange: filterType === 'period' ? dateRange : undefined
          }),
          calculateAllStockStatesFromDB(),
          getStockStats(startDate, endDate)
        ]);

        setMovements(movementsData);
        setStockStates(statesData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, filterType, dateRange]);

  // Calculer les KPI
  const kpis = useMemo(() => {
    const totalStock = stockStates.reduce((sum, state) => sum + state.stock_theorique, 0);
    const totalEntrees = movements
      .filter(m => m.movement_type === 'entree' || m.movement_type === 'transfert')
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalSorties = movements
      .filter(m => m.movement_type === 'sortie')
      .reduce((sum, m) => sum + m.quantity, 0);
    const ecartsSignificatifs = detectSignificantDiscrepancies(stockStates, 10);

    return {
      totalStock,
      totalEntrees,
      totalSorties,
      ecartsSignificatifs: ecartsSignificatifs.length
    };
  }, [stockStates, movements]);

  // Générer la synthèse
  const summary = useMemo(() => {
    return generateStockSummary(movements, startDate, endDate);
  }, [movements, startDate, endDate]);

  // Répartition par catégorie
  const byCategory = useMemo(() => {
    const categoryMap = new Map<StockCategory, { entrees: number; sorties: number; stock: number }>();
    
    stockStates.forEach(state => {
      const existing = categoryMap.get(state.category) || { entrees: 0, sorties: 0, stock: 0 };
      existing.stock += state.stock_theorique;
      categoryMap.set(state.category, existing);
    });

    movements.forEach(m => {
      const existing = categoryMap.get(m.category) || { entrees: 0, sorties: 0, stock: 0 };
      if (m.movement_type === 'entree' || m.movement_type === 'transfert') {
        existing.entrees += m.quantity;
      } else if (m.movement_type === 'sortie') {
        existing.sorties += m.quantity;
      }
      categoryMap.set(m.category, existing);
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data
    }));
  }, [stockStates, movements]);

  // Répartition par type de bouteille
  const byBottleType = useMemo(() => {
    const typeMap = new Map<BottleType, { entrees: number; sorties: number; stock: number }>();
    
    stockStates.forEach(state => {
      const existing = typeMap.get(state.bottle_type) || { entrees: 0, sorties: 0, stock: 0 };
      existing.stock += state.stock_theorique;
      typeMap.set(state.bottle_type, existing);
    });

    movements.forEach(m => {
      const existing = typeMap.get(m.bottle_type) || { entrees: 0, sorties: 0, stock: 0 };
      if (m.movement_type === 'entree' || m.movement_type === 'transfert') {
        existing.entrees += m.quantity;
      } else if (m.movement_type === 'sortie') {
        existing.sorties += m.quantity;
      }
      typeMap.set(m.bottle_type, existing);
    });

    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      ...data
    }));
  }, [stockStates, movements]);

  const getPeriodText = () => {
    if (filterType === 'all') return '';
    if (filterType === 'year') return `en ${selectedYear}`;
    if (filterType === 'month') {
      const monthDate = new Date(selectedMonth + '-01');
      return `en ${monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }
    if (filterType === 'day' && selectedDate) {
      return `le ${format(selectedDate, 'dd/MM/yyyy', { locale: fr })}`;
    }
    if (filterType === 'period' && dateRange?.from) {
      if (dateRange.to) {
        return `du ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
      }
      return `le ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })}`;
    }
    return '';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtres */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gestion de Stock</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Suivi des mouvements de bouteilles GPL</p>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Total Stock</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {kpis.totalStock.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground">Bouteilles en stock {getPeriodText()}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50/50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Entrées</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {kpis.totalEntrees.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground">Bouteilles entrées {getPeriodText()}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Sorties</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {kpis.totalSorties.toLocaleString('fr-FR')}
                </div>
                <p className="text-xs text-muted-foreground">Bouteilles sorties {getPeriodText()}</p>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              kpis.ecartsSignificatifs > 0 ? "bg-amber-50/50 border-amber-200" : "bg-gray-50/50 border-gray-200"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Écarts</CardTitle>
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
                <p className="text-xs text-muted-foreground">Écarts significatifs détectés</p>
              </CardContent>
            </Card>
          </div>

          {/* Répartition par catégorie */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par Catégorie</CardTitle>
              <CardDescription>Stocks et mouvements par catégorie de bouteilles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Stock Théorique</TableHead>
                      <TableHead className="text-right">Entrées</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCategory.map((item) => (
                      <TableRow key={item.category}>
                        <TableCell className="font-medium">
                          {STOCK_CATEGORY_LABELS[item.category]}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.stock.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {item.entrees.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.sorties.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {(item.entrees - item.sorties).toLocaleString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Répartition par type de bouteille */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par Type de Bouteille</CardTitle>
              <CardDescription>Stocks et mouvements par type (B6, B12, B28, B38)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Stock Théorique</TableHead>
                      <TableHead className="text-right">Entrées</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byBottleType.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell className="font-medium">
                          {BOTTLE_TYPE_LABELS[item.type]}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.stock.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {item.entrees.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.sorties.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {(item.entrees - item.sorties).toLocaleString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

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

          {/* Mouvements récents */}
          <Card>
            <CardHeader>
              <CardTitle>Mouvements Récents</CardTitle>
              <CardDescription>Derniers mouvements enregistrés {getPeriodText()}</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun mouvement pour cette période</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Bouteille</TableHead>
                        <TableHead className="text-right">Quantité</TableHead>
                        <TableHead>Mouvement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.slice(0, 20).map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            {format(new Date(movement.date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>{STOCK_CATEGORY_LABELS[movement.category]}</TableCell>
                          <TableCell>{STOCK_SITE_LABELS[movement.site]}</TableCell>
                          <TableCell>{BOTTLE_TYPE_LABELS[movement.bottle_type]}</TableCell>
                          <TableCell className="text-right">
                            {movement.quantity.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              movement.movement_type === 'entree' ? 'default' :
                              movement.movement_type === 'sortie' ? 'destructive' :
                              movement.movement_type === 'inventaire' ? 'secondary' : 'outline'
                            }>
                              {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
