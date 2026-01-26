import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, TrendingUp, TrendingDown, Package, Download, FileDown, Users, Plus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReceptionsViewProps {
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReception, setNewReception] = useState<{ date: string; client: string; poids_kg: number }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    client: 'TOTAL_ENERGIES',
    poids_kg: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mois disponibles pour l'année sélectionnée (pour le filtre mois)
  const availableMonthsForYear = useMemo(() => {
    if (filterType !== 'month') return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${selectedYear}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [selectedYear, filterType]);

  // Calculer les dates de début et fin selon le filtre
  const { startDate, endDate } = useMemo(() => {
    if (filterType === 'all') {
      // Pas de filtre, retourner undefined pour charger toutes les données
      return { startDate: undefined, endDate: undefined };
    }
    if (filterType === 'year') {
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      return { startDate: start, endDate: end };
    }
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateObj = endOfMonth(new Date(year, month - 1, 1));
      const end = format(endDateObj, 'yyyy-MM-dd');
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
    // Par défaut: mois en cours
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateObj = endOfMonth(new Date(year, month - 1, 1));
    const end = format(endDateObj, 'yyyy-MM-dd');
    return { startDate: start, endDate: end };
  }, [filterType, selectedDate, dateRange, selectedMonth, selectedYear]);

  // Charger les années et mois disponibles au montage (même logique que l'historique)
  useEffect(() => {
    const fetchAvailableData = async () => {
      try {
        // Récupérer la date la plus ancienne pour déterminer la plage d'années
        const { data, error } = await (supabase as any)
          .from('receptions_clients')
          .select('date')
          .order('date', { ascending: true })
          .limit(1);

        if (error) throw error;

        let minYear = new Date().getFullYear();
        if (data && data.length > 0) {
          const firstDate = new Date(data[0].date);
          minYear = firstDate.getFullYear();
        }

        const currentYear = new Date().getFullYear();
        // Générer toutes les années de minYear à currentYear (ordre décroissant)
        const yearsArray = Array.from(
          { length: currentYear - minYear + 1 },
          (_, i) => currentYear - i
        );

        setAvailableYears(yearsArray);

        // Charger les mois disponibles séparément
        const { data: allData, error: allError } = await (supabase as any)
          .from('receptions_clients')
          .select('date');

        if (!allError && allData) {
          const months = new Set<string>();
          (allData || []).forEach((r: ReceptionData) => {
            const date = new Date(r.date);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(month);
          });
          const monthsArray = Array.from(months).sort((a, b) => b.localeCompare(a));
          setAvailableMonthsFromData(monthsArray);
        }

        // Si l'année actuelle n'a pas de données, utiliser la première année disponible
        if (yearsArray.length > 0 && !yearsArray.includes(selectedYear)) {
          setSelectedYear(yearsArray[0]);
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
    // Si filterType === 'all', startDate et endDate sont undefined, c'est normal
    if (filterType !== 'all' && (!startDate || !endDate)) {
      console.warn('startDate or endDate is not defined yet, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Si filterType === 'all', utiliser batch fetching pour récupérer toutes les données
      if (filterType === 'all') {
        const BATCH_SIZE = 1000;
        const allData: ReceptionData[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await (supabase as any)
            .from('receptions_clients')
            .select('*')
            .order('date', { ascending: false })
            .range(offset, offset + BATCH_SIZE - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allData.push(...data);
            hasMore = data.length === BATCH_SIZE;
            offset += BATCH_SIZE;
          } else {
            hasMore = false;
          }
        }

        setReceptions(allData);
      } else {
        // Pour les autres filtres, utiliser la requête normale avec dates
        let query: any = (supabase as any)
          .from('receptions_clients')
          .select('*')
          .order('date', { ascending: false });

        // Appliquer les filtres de date seulement si startDate et endDate sont définis
        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        setReceptions(data || []);
      }
      
      // Calculate variation vs previous period (seulement si filterType !== 'all')
      if (filterType !== 'all') {
        let prevQuery: any = (supabase as any).from('receptions_clients').select('*');

        if (filterType === 'year') {
          // Previous year
          const prevYear = selectedYear - 1;
          const prevStartDate = `${prevYear}-01-01`;
          const prevEndDate = `${prevYear}-12-31`;
          prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
        } else if (filterType === 'month') {
          // Previous month
          const [y, m] = selectedMonth.split('-').map(Number);
          const prevDate = subMonths(new Date(y, m - 1, 1), 1);
          const prevStartDate = format(startOfMonth(prevDate), 'yyyy-MM-dd');
          const prevEndDate = format(endOfMonthFn(prevDate), 'yyyy-MM-dd');
          prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
        } else if (filterType === 'day' && selectedDate) {
          // Previous day
          const prevDate = subDays(selectedDate, 1);
          const prevDateStr = format(prevDate, 'yyyy-MM-dd');
          prevQuery = prevQuery.eq('date', prevDateStr);
        } else if (filterType === 'period' && dateRange?.from) {
          // Previous range (same duration)
          const from = dateRange.from;
          const to = dateRange.to || dateRange.from;
          const daysDiff = differenceInDays(to, from) + 1;

          const prevTo = subDays(from, 1);
          const prevFrom = subDays(prevTo, daysDiff - 1);

          const prevFromStr = format(prevFrom, 'yyyy-MM-dd');
          const prevToStr = format(prevTo, 'yyyy-MM-dd');
          prevQuery = prevQuery.gte('date', prevFromStr).lte('date', prevToStr);
        }

        const { data: prevData } = await prevQuery;

        if (prevData && prevData.length > 0) {
          const prevTotal = prevData.reduce((sum: number, r: ReceptionData) => sum + r.poids_kg, 0);
          const currentTotal = receptions.reduce((sum: number, r: ReceptionData) => sum + r.poids_kg, 0);
          const variation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
          setVariationPct(variation);
        } else {
          setVariationPct(0);
        }
      } else {
        // Pour 'all', pas de calcul de variation
        setVariationPct(0);
      }
      
      // Si aucune donnée trouvée, afficher un message informatif
      if (receptions.length === 0) {
        console.log('Aucune réception trouvée pour la période:', { filterType, startDate, endDate });
      }
    } catch (error: any) {
      console.error('Error fetching receptions:', error);
      toast.error('Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReception = async () => {
    if (!newReception.date || !newReception.client || newReception.poids_kg <= 0) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('receptions_clients')
        .insert([{
          date: newReception.date,
          client: newReception.client,
          poids_kg: newReception.poids_kg
        }]);

      if (error) throw error;
      
      toast.success('Réception enregistrée avec succès');
      setIsAddModalOpen(false);
      setNewReception({
        date: format(new Date(), 'yyyy-MM-dd'),
        client: 'TOTAL_ENERGIES',
        poids_kg: 0
      });
      
      // Recharger les données
      fetchReceptions();
    } catch (error: any) {
      console.error('Error adding reception:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Synchroniser selectedMonth avec selectedYear quand on change l'année dans le filtre mois
  useEffect(() => {
    if (filterType === 'month' && selectedMonth) {
      const [currentYear] = selectedMonth.split('-').map(Number);
      if (currentYear !== selectedYear) {
        // Mettre à jour le mois pour correspondre à l'année sélectionnée
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const newMonth = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`;
        setSelectedMonth(newMonth);
      }
    }
  }, [selectedYear, filterType]);

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
  // Si filterType !== 'all', s'assurer que startDate et endDate sont définis
  if (filterType !== 'all' && (!startDate || !endDate)) {
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
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Saisie
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div key={client.clientKey} className={`p-4 ${bgColor} rounded-lg border ${borderColor} flex flex-col items-center justify-center text-center`}>
                    <div className="h-16 w-24 relative mb-3 flex-shrink-0">
                      <img src={logoPath} alt={client.client} className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-extrabold" style={{ color }}>{formatNumber(client.total)} Kg</p>
                      <p className="text-sm font-bold text-foreground">{client.pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de saisie de réception */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouvelle réception</DialogTitle>
            <DialogDescription>
              Saisissez les informations de la réception à enregistrer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newReception.date}
                onChange={(e) => setNewReception({ ...newReception, date: e.target.value })}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={newReception.client}
                onValueChange={(value) => setNewReception({ ...newReception, client: value })}
              >
                <SelectTrigger id="client" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOTAL_ENERGIES">Total Énergies</SelectItem>
                  <SelectItem value="PETRO_IVOIRE">Petro Ivoire</SelectItem>
                  <SelectItem value="VIVO_ENERGIES">Vivo Énergies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poids">Poids (Kg)</Label>
              <Input
                id="poids"
                type="number"
                value={newReception.poids_kg || ''}
                onChange={(e) => setNewReception({ ...newReception, poids_kg: parseFloat(e.target.value) || 0 })}
                step="0.1"
                min="0"
                placeholder="0.0"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewReception({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  client: 'TOTAL_ENERGIES',
                  poids_kg: 0
                });
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddReception}
              disabled={isSubmitting || !newReception.date || !newReception.client || newReception.poids_kg <= 0}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
