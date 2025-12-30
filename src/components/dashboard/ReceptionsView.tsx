import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Upload, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReceptionsClientsImport } from '@/components/receptions/ReceptionsClientsImport';
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

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
    if (filterType === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
    if (filterType === 'year') {
      // Pour l'année, on prend toute l'année en cours par défaut
      // Note: Le filtre année nécessiterait un selectedYear dans les props
      const year = new Date().getFullYear();
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return { startDate: start, endDate: end };
    }
    // Par défaut: mois en cours
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }, [filterType, selectedDate, dateRange, selectedMonth]);

  useEffect(() => {
    fetchReceptions();
  }, [startDate, endDate, selectedClient]);

  const fetchReceptions = async () => {
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
    } catch (error: any) {
      console.error('Error fetching receptions:', error);
      toast.error('Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

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
      count: receptions.length
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
      acc[date][r.client as keyof typeof acc[string]] += r.poids_kg;
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
      total: total / 1000, // Convertir en tonnes
      count: receptions.filter(r => r.client === client).length
    }));
  }, [stats, receptions]);

  return (
    <div className="space-y-6">
      {/* Header avec import */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Réceptions par Client</h2>
          <p className="text-muted-foreground">Historique des réceptions GPL par client</p>
        </div>
        <ReceptionsClientsImport onImportComplete={fetchReceptions} />
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
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
                  {availableMonths.map(month => (
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
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Réceptions</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg</p>
                <p className="text-xs text-muted-foreground mt-1">{(stats.total / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} T</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nombre de réceptions</p>
                <p className="text-2xl font-bold">{stats.count}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours avec réceptions</p>
                <p className="text-2xl font-bold">{stats.uniqueDates}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{stats.uniqueClients}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique par client */}
        <Card>
          <CardHeader>
            <CardTitle>Réceptions par Client</CardTitle>
            <CardDescription>Total en tonnes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="client" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} T`} />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Tonnes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique évolution temporelle */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Temporelle</CardTitle>
            <CardDescription>Réceptions par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg`} />
                <Legend />
                <Line type="monotone" dataKey="TOTAL_ENERGIES" stroke="#ef4444" name="Total Énergies" />
                <Line type="monotone" dataKey="PETRO_IVOIRE" stroke="#3b82f6" name="Petro Ivoire" />
                <Line type="monotone" dataKey="VIVO_ENERGIES" stroke="#10b981" name="Vivo Énergies" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des Réceptions</CardTitle>
          <CardDescription>{receptions.length} réception(s) trouvée(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement...</p>
          ) : receptions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucune réception pour cette période</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Poids (Kg)</TableHead>
                    <TableHead className="text-right">Poids (T)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptions.map((reception) => (
                    <TableRow key={reception.id}>
                      <TableCell>{format(new Date(reception.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                      <TableCell>{CLIENT_LABELS[reception.client] || reception.client}</TableCell>
                      <TableCell className="text-right">{reception.poids_kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-right">{(reception.poids_kg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
