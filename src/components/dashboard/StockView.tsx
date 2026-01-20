import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Package, TrendingUp, TrendingDown, Users, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { loadStockMovements } from '@/utils/stockStorage';
import { StockMovement, STOCK_CLIENT_ORDER, STOCK_CLIENT_LABELS, StockClient } from '@/types/stock';

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
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Années disponibles pour le filtre
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Mois disponibles pour l'année sélectionnée
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear]);

  // Mois en cours (pour affichage par défaut)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: format(now, 'MMMM yyyy', { locale: fr })
    };
  }, []);

  // Charger les mouvements
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await loadStockMovements();
      setMovements(data);
      setLoading(false);
    };
    load();
  }, []);

  // Label de la période filtrée
  const filterLabel = useMemo(() => {
    if (filterType === 'all') return 'Toutes périodes';
    if (filterType === 'year') return `Année ${selectedYear}`;
    if (filterType === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      return format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr });
    }
    if (filterType === 'day' && selectedDate) {
      return format(selectedDate, 'dd MMMM yyyy', { locale: fr });
    }
    if (filterType === 'period' && dateRange?.from) {
      const from = format(dateRange.from, 'dd/MM/yyyy');
      const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : from;
      return `${from} - ${to}`;
    }
    return currentMonth.label;
  }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange, currentMonth.label]);

  // Calculer les stats globales
  const stats = useMemo(() => {
    // Fonction pour vérifier si une date est dans la période filtrée
    const isInFilterPeriod = (dateStr: string): boolean => {
      const date = new Date(dateStr);
      
      if (filterType === 'all') return true;
      
      if (filterType === 'year') {
        return date.getFullYear() === selectedYear;
      }
      
      if (filterType === 'month' && selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0);
        return date >= start && date <= end;
      }
      
      if (filterType === 'day' && selectedDate) {
        return format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      }
      
      if (filterType === 'period' && dateRange?.from) {
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;
        return date >= from && date <= to;
      }
      
      return true;
    };

    // Stock actuel par client et type de bouteille (toujours calculé sur tous les mouvements)
    const calculateStockForClientAndBottle = (client: StockClient, bottleType: 'B6' | 'B12') => {
      const filtered = movements
        .filter(m => m.client === client && m.bottle_type === bottleType)
        .sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      let stock = 0;
      filtered.forEach(m => {
        if (m.movement_type === 'inventaire' && m.stock_reel !== undefined) {
          stock = m.stock_reel;
        } else if (m.movement_type === 'entree') {
          stock += m.quantity;
        } else if (m.movement_type === 'sortie') {
          stock -= m.quantity;
        }
      });
      return stock;
    };

    // Cumuls par client (filtrés par période)
    const calculateCumulForClient = (client: StockClient) => {
      const filteredMovements = movements.filter(m => {
        return m.client === client && isInFilterPeriod(m.date);
      });

      let entreeB6 = 0, sortieB6 = 0, entreeB12 = 0, sortieB12 = 0;
      filteredMovements.forEach(m => {
        if (m.bottle_type === 'B6') {
          if (m.movement_type === 'entree') entreeB6 += m.quantity;
          else if (m.movement_type === 'sortie') sortieB6 += m.quantity;
        } else if (m.bottle_type === 'B12') {
          if (m.movement_type === 'entree') entreeB12 += m.quantity;
          else if (m.movement_type === 'sortie') sortieB12 += m.quantity;
        }
      });

      return { entreeB6, sortieB6, entreeB12, sortieB12 };
    };

    // Stats par client
    const clientStats = STOCK_CLIENT_ORDER.map(client => {
      const stockB6 = calculateStockForClientAndBottle(client, 'B6');
      const stockB12 = calculateStockForClientAndBottle(client, 'B12');
      const cumul = calculateCumulForClient(client);
      return {
        client,
        label: STOCK_CLIENT_LABELS[client],
        stockB6,
        stockB12,
        ...cumul
      };
    });

    // Totaux globaux
    const totalB6 = clientStats.reduce((sum, c) => sum + c.stockB6, 0);
    const totalB12 = clientStats.reduce((sum, c) => sum + c.stockB12, 0);
    const totalEntreeB6 = clientStats.reduce((sum, c) => sum + c.entreeB6, 0);
    const totalSortieB6 = clientStats.reduce((sum, c) => sum + c.sortieB6, 0);
    const totalEntreeB12 = clientStats.reduce((sum, c) => sum + c.entreeB12, 0);
    const totalSortieB12 = clientStats.reduce((sum, c) => sum + c.sortieB12, 0);

    return {
      clientStats,
      totalB6,
      totalB12,
      totalEntreeB6,
      totalSortieB6,
      totalEntreeB12,
      totalSortieB12
    };
  }, [movements, filterType, selectedYear, selectedMonth, selectedDate, dateRange]);

  // Logos clients
  const clientLogos: Record<string, string> = {
    PI: '/images/logo-petro.png',
    TOTAL: '/images/logo-total.png',
    VIVO: '/images/logo-vivo.png'
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec filtres et bouton Saisie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Module Stock</h2>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {filterLabel}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre type de période */}
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

          {/* Sélecteur d'année */}
          {filterType === 'year' && (
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sélecteur de mois */}
          {filterType === 'month' && (
            <>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="h-8 sm:h-9 w-[100px] text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 sm:h-9 w-[120px] text-xs sm:text-sm">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => {
                    const [y, month] = m.split('-').map(Number);
                    return (
                      <SelectItem key={m} value={m}>
                        {format(new Date(y, month - 1, 1), 'MMMM', { locale: fr })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Sélecteur de jour */}
          {filterType === 'day' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 sm:h-9 w-[140px] justify-start text-left font-normal text-xs sm:text-sm",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : "Choisir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Sélecteur de période */}
          {filterType === 'period' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 sm:h-9 w-[200px] justify-start text-left font-normal text-xs sm:text-sm",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy')
                    )
                  ) : (
                    "Choisir période"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={fr}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          <Button onClick={() => navigate('/stock')}>
            <Package className="mr-2 h-4 w-4" />
            Saisie
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground border rounded-lg">
          <p>Chargement...</p>
        </div>
      ) : (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-5 w-5" />
              STOCK GLOBAL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stock Total */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="text-center mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stock Théorique actuel</p>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-4xl font-extrabold text-blue-600 tracking-tight">
                      {stats.totalB6.toLocaleString('fr-FR')}
                      <span className="text-xl text-blue-600/60 ml-2">B6</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                      {stats.totalB12.toLocaleString('fr-FR')}
                      <span className="text-xl text-emerald-600/60 ml-2">B12</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Cumuls Entrées/Sorties du mois */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-primary/20">
                <div className="bg-card p-3 rounded-md border shadow-sm">
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground uppercase font-bold flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      Cumul Entrées
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <span className="block font-semibold text-muted-foreground text-xs">B6</span>
                      <span className="font-bold text-green-600">+{stats.totalEntreeB6.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <span className="block font-semibold text-muted-foreground text-xs">B12</span>
                      <span className="font-bold text-green-600">+{stats.totalEntreeB12.toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-card p-3 rounded-md border shadow-sm">
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground uppercase font-bold flex items-center justify-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      Cumul Sorties
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="bg-red-50 p-2 rounded border border-red-200">
                      <span className="block font-semibold text-muted-foreground text-xs">B6</span>
                      <span className="font-bold text-red-600">-{stats.totalSortieB6.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-200">
                      <span className="block font-semibold text-muted-foreground text-xs">B12</span>
                      <span className="font-bold text-red-600">-{stats.totalSortieB12.toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock par Client */}
              <div className="mt-4 pt-3 border-t border-primary/20">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Stock par Client
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {stats.clientStats.map((client) => (
                    <div key={client.client} className="p-3 bg-white/50 rounded-lg border border-primary/20 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-12 w-12 relative flex-shrink-0">
                          <img
                            src={clientLogos[client.client]}
                            alt={client.label}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{client.label}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs mb-2">
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <span className="block text-muted-foreground font-medium">B6</span>
                          <span className="font-bold text-blue-700 text-sm">{client.stockB6.toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                          <span className="block text-muted-foreground font-medium">B12</span>
                          <span className="font-bold text-emerald-700 text-sm">{client.stockB12.toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 mt-2">
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <p className="text-green-700 font-bold mb-1 text-center">ENTRÉES</p>
                          <div className="grid grid-cols-2 gap-1 text-center">
                            <div>
                              <span className="block text-muted-foreground text-[10px]">B6</span>
                              <span className="text-green-600 font-bold text-sm">+{client.entreeB6}</span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground text-[10px]">B12</span>
                              <span className="text-green-600 font-bold text-sm">+{client.entreeB12}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                          <p className="text-red-700 font-bold mb-1 text-center">SORTIES</p>
                          <div className="grid grid-cols-2 gap-1 text-center">
                            <div>
                              <span className="block text-muted-foreground text-[10px]">B6</span>
                              <span className="text-red-600 font-bold text-sm">-{client.sortieB6}</span>
                            </div>
                            <div>
                              <span className="block text-muted-foreground text-[10px]">B12</span>
                              <span className="text-red-600 font-bold text-sm">-{client.sortieB12}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
