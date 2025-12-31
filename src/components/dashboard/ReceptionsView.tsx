import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, TrendingUp, TrendingDown, Package, Download, FileDown, Users } from 'lucide-react';
import { format, endOfMonth, subDays, differenceInDays, startOfMonth, endOfMonth as endOfMonthFn, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  const receptionsGlobalesRef = useRef<HTMLDivElement>(null);
  const [receptions, setReceptions] = useState<ReceptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonthsFromData, setAvailableMonthsFromData] = useState<string[]>([]);
  const [variationPct, setVariationPct] = useState<number>(0);

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

  // Export functions
  const exportSectionAsImage = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;

    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (document) => {
          const element = document.getElementById(ref.current?.id || '');
          if (element) {
            element.style.transform = 'none';
          }
        }
      } as any);

      const now = new Date();
      const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

      const link = document.createElement('a');
      link.download = `${filename}_${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  };

  const exportSectionAsPDF = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;

    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (document) => {
          const element = document.getElementById(ref.current?.id || '');
          if (element) {
            element.style.transform = 'none';
          }
        }
      } as any);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const now = new Date();
      const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

      pdf.save(`${filename}_${timestamp}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

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

      const { data, error } = await query;

      if (error) throw error;
      
      setReceptions(data || []);
      
      // Calculate variation vs previous period
      let prevQuery: any = (supabase as any).from('receptions_clients').select('*');

      if (filterType === 'month') {
        // Previous month
        const [y, m] = selectedMonth.split('-').map(Number);
        const prevDate = subMonths(new Date(y, m - 1, 1), 1);
        const prevStartDate = format(startOfMonth(prevDate), 'yyyy-MM-dd');
        const prevEndDate = format(endOfMonthFn(prevDate), 'yyyy-MM-dd');
        prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
      } else if (filterType === 'date' && selectedDate) {
        // Previous day
        const prevDate = subDays(selectedDate, 1);
        const prevDateStr = format(prevDate, 'yyyy-MM-dd');
        prevQuery = prevQuery.eq('date', prevDateStr);
      } else if (filterType === 'range' && dateRange?.from) {
        // Previous range (same duration)
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;
        const daysDiff = differenceInDays(to, from) + 1;

        const prevTo = subDays(from, 1);
        const prevFrom = subDays(prevTo, daysDiff - 1);

        const prevFromStr = format(prevFrom, 'yyyy-MM-dd');
        const prevToStr = format(prevTo, 'yyyy-MM-dd');
        prevQuery = prevQuery.gte('date', prevFromStr).lte('date', prevToStr);
      } else if (filterType === 'year') {
        // Previous year
        const prevYear = selectedYear - 1;
        const prevStartDate = `${prevYear}-01-01`;
        const prevEndDate = `${prevYear}-12-31`;
        prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
      }

      const { data: prevData } = await prevQuery;

      if (prevData && prevData.length > 0) {
        const prevTotal = prevData.reduce((sum: number, r: ReceptionData) => sum + r.poids_kg, 0);
        const currentTotal = (data || []).reduce((sum: number, r: ReceptionData) => sum + r.poids_kg, 0);
        const variation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
        setVariationPct(variation);
      } else {
        setVariationPct(0);
      }
      
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


  useEffect(() => {
    fetchReceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedYear, filterType, selectedMonth, selectedDate, dateRange]);

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

  // Données par client avec pourcentages
  const clientData = useMemo(() => {
    const clients = Object.entries(stats.byClient).map(([client, total]) => ({
      client: CLIENT_LABELS[client] || client,
      clientKey: client,
      total: total,
      pct: stats.total > 0 ? (total / stats.total) * 100 : 0
    }));
    
    // Trier par total décroissant
    return clients.sort((a, b) => b.total - a.total);
  }, [stats]);

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

  // Format number helper
  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard des Réceptions</h2>
          <p className="text-muted-foreground">Analyse des réceptions GPL par client</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={(value: 'month' | 'date' | 'range' | 'year') => setFilterType(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="date">Par date</SelectItem>
              <SelectItem value="range">Par période</SelectItem>
              <SelectItem value="year">Par année</SelectItem>
            </SelectContent>
          </Select>

          {filterType === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
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

          {filterType === 'date' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  disabled={{ after: new Date() }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {filterType === 'range' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    "Sélectionner une période"
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
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
        </div>
      </div>

      {/* Réceptions Globales Section Wrapper for Export */}
      <div ref={receptionsGlobalesRef} id="receptions-globales" className="space-y-4 p-2 bg-background/50 rounded-xl">
        {/* Réceptions Globales - Total */}
        <Card className="bg-orange-50/30 border-orange-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Réceptions Globales
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportSectionAsImage(receptionsGlobalesRef, 'receptions-globales')}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Image
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportSectionAsPDF(receptionsGlobalesRef, 'receptions-globales')}
                  className="h-8"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground uppercase font-bold mb-1">Cumul des réceptions</p>
              <p className="text-3xl font-extrabold text-primary">{formatNumber(stats.total)} Kg</p>
              <div className={cn("flex items-center justify-center text-xs font-medium mt-1", variationPct >= 0 ? "text-green-600" : "text-red-600")}>
                {variationPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(variationPct).toFixed(1)}% vs période préc.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par Client */}
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Répartition par Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientData.map((client) => {
                const color = getClientColor(client.clientKey);
                const bgColor = client.clientKey === 'PETRO_IVOIRE' ? 'bg-orange-50/50' :
                               client.clientKey === 'VIVO_ENERGIES' ? 'bg-green-50/50' :
                               'bg-blue-50/50';
                const borderColor = client.clientKey === 'PETRO_IVOIRE' ? 'border-orange-100' :
                                   client.clientKey === 'VIVO_ENERGIES' ? 'border-green-100' :
                                   'border-blue-100';
                const logoPath = client.clientKey === 'PETRO_IVOIRE' ? '/images/logo-petro.png' :
                                client.clientKey === 'VIVO_ENERGIES' ? '/images/logo-vivo.png' :
                                '/images/logo-total.png';

                return (
                  <div key={client.clientKey} className={`p-2 ${bgColor} rounded-lg border ${borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-16 relative flex-shrink-0">
                        <img src={logoPath} alt={client.client} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold" style={{ color }}>{formatNumber(client.total)} Kg</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm font-bold text-foreground">{client.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
