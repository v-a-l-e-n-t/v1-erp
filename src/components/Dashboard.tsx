import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BilanEntry } from '@/types/balance';
import { formatNumber, getNatureColor } from '@/utils/calculations';
import { TrendingUp, TrendingDown, TrendingUpDown, Calendar as CalendarIcon, Weight, Package, Factory } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { DayContentProps, DateRange } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  entries: BilanEntry[];
}

const Dashboard = ({ entries }: DashboardProps) => {
  const [filterType, setFilterType] = useState<'month' | 'date' | 'range'>('range');
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

  // Production stats state - MUST be before any early returns
  const [productionStats, setProductionStats] = useState({
    tonnage: 0,
    bouteilles: 0,
    bottlesByType: { b6: 0, b12: 0, b28: 0, b38: 0 },
    bottlesByClient: { petro: 0, vivo: 0, total: 0 },
    loading: false
  });

  useEffect(() => {
    const fetchProductionStats = async () => {
      setProductionStats(prev => ({ ...prev, loading: true }));
      try {
        let shiftsQuery = supabase.from('production_shifts').select('id, tonnage_total, bouteilles_produites, date');
        let lignesQuery = supabase.from('lignes_production').select(`
          cumul_recharges_b6, cumul_recharges_b12, cumul_recharges_b28, cumul_recharges_b38,
          cumul_consignes_b6, cumul_consignes_b12, cumul_consignes_b28, cumul_consignes_b38,
          recharges_petro_b6, recharges_petro_b12, recharges_petro_b28, recharges_petro_b38,
          recharges_vivo_b6, recharges_vivo_b12, recharges_vivo_b28, recharges_vivo_b38,
          recharges_total_b6, recharges_total_b12, recharges_total_b28, recharges_total_b38,
          consignes_petro_b6, consignes_petro_b12, consignes_petro_b28, consignes_petro_b38,
          consignes_vivo_b6, consignes_vivo_b12, consignes_vivo_b28, consignes_vivo_b38,
          consignes_total_b6, consignes_total_b12, consignes_total_b28, consignes_total_b38,
          production_shifts!inner(date)
        `);

        if (filterType === 'month') {
          const startDate = `${selectedMonth}-01`;
          const [y, m] = selectedMonth.split('-').map(Number);
          const endDate = new Date(y, m, 0).toISOString().split('T')[0];
          shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
          lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
        } else if (filterType === 'date' && selectedDate) {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          shiftsQuery = shiftsQuery.eq('date', dateStr);
          lignesQuery = lignesQuery.eq('production_shifts.date', dateStr);
        } else if (filterType === 'range' && dateRange?.from) {
          const fromStr = format(dateRange.from, 'yyyy-MM-dd');
          const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
          shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
          lignesQuery = lignesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
        }

        const [shiftsResult, lignesResult] = await Promise.all([shiftsQuery, lignesQuery]);

        if (shiftsResult.error) throw shiftsResult.error;
        if (lignesResult.error) throw lignesResult.error;

        const totalTonnage = shiftsResult.data?.reduce((sum, row) => sum + (Number(row.tonnage_total) || 0), 0) || 0;
        const totalBouteilles = shiftsResult.data?.reduce((sum, row) => sum + (row.bouteilles_produites || 0), 0) || 0;

        // Calculate bottles by type
        let b6 = 0, b12 = 0, b28 = 0, b38 = 0;
        lignesResult.data?.forEach(ligne => {
          b6 += (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_consignes_b6 || 0);
          b12 += (ligne.cumul_recharges_b12 || 0) + (ligne.cumul_consignes_b12 || 0);
          b28 += (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_consignes_b28 || 0);
          b38 += (ligne.cumul_recharges_b38 || 0) + (ligne.cumul_consignes_b38 || 0);
        });

        // Calculate bottles by client
        let petro = 0, vivo = 0, total = 0;
        lignesResult.data?.forEach(ligne => {
          petro += (ligne.recharges_petro_b6 || 0) + (ligne.recharges_petro_b12 || 0) + (ligne.recharges_petro_b28 || 0) + (ligne.recharges_petro_b38 || 0)
            + (ligne.consignes_petro_b6 || 0) + (ligne.consignes_petro_b12 || 0) + (ligne.consignes_petro_b28 || 0) + (ligne.consignes_petro_b38 || 0);
          vivo += (ligne.recharges_vivo_b6 || 0) + (ligne.recharges_vivo_b12 || 0) + (ligne.recharges_vivo_b28 || 0) + (ligne.recharges_vivo_b38 || 0)
            + (ligne.consignes_vivo_b6 || 0) + (ligne.consignes_vivo_b12 || 0) + (ligne.consignes_vivo_b28 || 0) + (ligne.consignes_vivo_b38 || 0);
          total += (ligne.recharges_total_b6 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_total_b38 || 0)
            + (ligne.consignes_total_b6 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_total_b38 || 0);
        });

        setProductionStats({
          tonnage: totalTonnage,
          bouteilles: totalBouteilles,
          bottlesByType: { b6, b12, b28, b38 },
          bottlesByClient: { petro, vivo, total },
          loading: false
        });
      } catch (error) {
        console.error('Error fetching production stats:', error);
        setProductionStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchProductionStats();
  }, [filterType, selectedMonth, selectedDate, dateRange]);



  // Filter entries based on selected filter type
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);

    if (filterType === 'month') {
      const entryMonth = entry.date.substring(0, 7);
      return entryMonth === selectedMonth;
    } else if (filterType === 'date' && selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      return entry.date === selectedDateStr;
    } else if (filterType === 'range' && dateRange?.from) {
      const fromDate = dateRange.from;
      const toDate = dateRange.to || dateRange.from;
      return entryDate >= fromDate && entryDate <= toDate;
    }
    return false;
  });

  // Get available months from entries
  const availableMonths = Array.from(new Set(entries.map(e => e.date.substring(0, 7)))).sort().reverse();



  // Get last entry (most recent) or default
  const lastEntry = filteredEntries[0] || { date: new Date().toISOString(), bilan: 0, nature: '-' } as unknown as BilanEntry;

  // Calculate totals
  const totalReceptions = filteredEntries.reduce((sum, e) => sum + e.reception_gpl, 0);
  const nombreReceptions = filteredEntries.filter(e => e.reception_gpl > 0).length;

  // Generate period text for display
  const getPeriodText = () => {
    if (filterType === 'month') {
      const monthDate = new Date(selectedMonth + '-01');
      return `en ${monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else if (filterType === 'date' && selectedDate) {
      return `le ${format(selectedDate, 'dd/MM/yyyy', { locale: fr })}`;
    } else if (filterType === 'range' && dateRange?.from) {
      if (dateRange.to) {
        return `du ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
      } else {
        return `le ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })}`;
      }
    }
    return '';
  };
  const totalSorties = filteredEntries.reduce((sum, e) => sum + e.cumul_sorties, 0);
  const totalBilan = filteredEntries.reduce((sum, e) => sum + e.bilan, 0);

  // Sorties breakdown (totals)
  const totalVrac = filteredEntries.reduce((sum, e) => sum + e.sorties_vrac, 0);
  const totalConditionne = filteredEntries.reduce((sum, e) => sum + e.sorties_conditionnees, 0);
  const totalFuyardes = filteredEntries.reduce((sum, e) => sum + e.fuyardes, 0);

  // Percentages
  const pourcentageVrac = totalSorties > 0 ? (totalVrac / totalSorties) * 100 : 0;
  const pourcentageConditionne = totalSorties > 0 ? (totalConditionne / totalSorties) * 100 : 0;

  // Bilan positif et négatif
  const bilansPositifs = filteredEntries.filter(e => e.nature === 'Positif');
  const bilansNegatifs = filteredEntries.filter(e => e.nature === 'Négatif');
  const totalBilanPositif = bilansPositifs.reduce((sum, e) => sum + e.bilan, 0);
  const totalBilanNegatif = bilansNegatifs.reduce((sum, e) => sum + e.bilan, 0);

  // Count by nature
  const positifCount = bilansPositifs.length;
  const negatifCount = bilansNegatifs.length;
  const neutreCount = filteredEntries.filter(e => e.nature === 'Neutre').length;

  // Client breakdown for sorties (Bilan Matière)
  const sortiesPetro = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_petro_ivoire || 0) + (e.sorties_conditionnees_petro_ivoire || 0), 0);
  const sortiesVivo = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_vivo_energies || 0) + (e.sorties_conditionnees_vivo_energies || 0), 0);
  const sortiesTotal = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_total_energies || 0) + (e.sorties_conditionnees_total_energies || 0), 0);

  const totalSortiesClients = sortiesPetro + sortiesVivo + sortiesTotal;
  const pctSortiesPetro = totalSortiesClients > 0 ? (sortiesPetro / totalSortiesClients) * 100 : 0;
  const pctSortiesVivo = totalSortiesClients > 0 ? (sortiesVivo / totalSortiesClients) * 100 : 0;
  const pctSortiesTotal = totalSortiesClients > 0 ? (sortiesTotal / totalSortiesClients) * 100 : 0;

  // Calculate production percentages
  const totalBottles = productionStats.bottlesByType.b6 + productionStats.bottlesByType.b12 +
    productionStats.bottlesByType.b28 + productionStats.bottlesByType.b38;
  const pctB6 = totalBottles > 0 ? (productionStats.bottlesByType.b6 / totalBottles) * 100 : 0;
  const pctB12 = totalBottles > 0 ? (productionStats.bottlesByType.b12 / totalBottles) * 100 : 0;
  const pctB28 = totalBottles > 0 ? (productionStats.bottlesByType.b28 / totalBottles) * 100 : 0;
  const pctB38 = totalBottles > 0 ? (productionStats.bottlesByType.b38 / totalBottles) * 100 : 0;

  const totalProdClients = productionStats.bottlesByClient.petro + productionStats.bottlesByClient.vivo +
    productionStats.bottlesByClient.total;
  const pctProdPetro = totalProdClients > 0 ? (productionStats.bottlesByClient.petro / totalProdClients) * 100 : 0;
  const pctProdVivo = totalProdClients > 0 ? (productionStats.bottlesByClient.vivo / totalProdClients) * 100 : 0;
  const pctProdTotal = totalProdClients > 0 ? (productionStats.bottlesByClient.total / totalProdClients) * 100 : 0;

  // Correlation Production vs Sorties Conditionnées
  const correlation = totalConditionne > 0 ? (productionStats.tonnage / totalConditionne) * 100 : 0;

  // Create a map of dates to entries for the heatmap
  const entriesByDate = new Map<string, BilanEntry>();
  filteredEntries.forEach(entry => {
    entriesByDate.set(entry.date, entry);
  });

  const sortiesData = [
    { name: 'Vrac', value: totalVrac, color: 'hsl(var(--chart-1))' },
    { name: 'Conditionné', value: totalConditionne, color: 'hsl(var(--chart-2))' },
    { name: 'Fuyardes', value: totalFuyardes, color: 'hsl(var(--chart-3))' },
  ].filter(item => item.value > 0);

  const natureData = [
    { name: 'Positif', value: positifCount, color: 'hsl(var(--success))' },
    { name: 'Négatif', value: negatifCount, color: 'hsl(var(--destructive))' },
    { name: 'Neutre', value: neutreCount, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  // Custom day content for calendar heatmap
  const getDayColor = (date: Date): string => {
    const dateStr = date.toISOString().split('T')[0];
    const entry = entriesByDate.get(dateStr);

    if (!entry) return 'bg-muted/20';

    if (entry.nature === 'Positif') return 'bg-success/70 hover:bg-success';
    if (entry.nature === 'Négatif') return 'bg-destructive/70 hover:bg-destructive';
    return 'bg-muted hover:bg-muted/80';
  };

  const modifiers = {
    positif: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Positif';
    },
    negatif: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Négatif';
    },
    neutre: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Neutre';
    },
  };

  const modifiersStyles = {
    positif: {
      backgroundColor: 'hsl(var(--success))',
      color: 'hsl(var(--success-foreground))',
      fontWeight: 'bold',
    },
    negatif: {
      backgroundColor: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
      fontWeight: 'bold',
    },
    neutre: {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      fontWeight: 'bold',
    },
  };

  // Parse selected month for calendar and get 3 months
  const [year, month] = selectedMonth.split('-').map(Number);
  const currentMonth = new Date(year, month - 1, 1);
  const previousMonth1 = new Date(year, month - 2, 1);
  const previousMonth2 = new Date(year, month - 3, 1);

  // Get entries for each of the 3 months
  const getEntriesForMonth = (monthDate: Date) => {
    const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    return entries.filter(entry => entry.date.substring(0, 7) === monthStr);
  };

  const currentMonthEntries = getEntriesForMonth(currentMonth);
  const previousMonth1Entries = getEntriesForMonth(previousMonth1);
  const previousMonth2Entries = getEntriesForMonth(previousMonth2);

  // Create modifiers for each month
  const createModifiersForMonth = (monthEntries: BilanEntry[]) => {
    const entriesMap = new Map<string, BilanEntry>();
    monthEntries.forEach(entry => entriesMap.set(entry.date, entry));

    return {
      positif: (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entriesMap.get(dateStr)?.nature === 'Positif';
      },
      negatif: (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entriesMap.get(dateStr)?.nature === 'Négatif';
      },
      neutre: (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entriesMap.get(dateStr)?.nature === 'Neutre';
      },
    };
  };

  return (
    <div className="space-y-6">
      {/* Filter Selector */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Vue d'ensemble des opérations</h2>
            <p className="text-muted-foreground">Sélectionnez une période pour filtrer les statistiques</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={(value: 'month' | 'date' | 'range') => setFilterType(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Par mois</SelectItem>
                <SelectItem value="date">Par date</SelectItem>
                <SelectItem value="range">Par période</SelectItem>
              </SelectContent>
            </Select>

            {filterType === 'month' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
          </div>
        </div>
      </div>

      {/* Row 1: Bilan Matière */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Bilan Matière</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bilan Matière */}
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bilan Matière</CardTitle>
              <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className={`text-2xl font-bold ${totalBilan > 0 ? 'text-success' : totalBilan < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatNumber(totalBilan)} Kg
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodText()}</p>
            </CardContent>
          </Card>

          {/* Réception Navire */}
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réception Navire</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold">{formatNumber(totalReceptions)} Kg</div>
              <p className="text-xs text-muted-foreground mt-1">
                {nombreReceptions} réception{nombreReceptions > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Sorties */}
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sorties</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Dépôt VRAC</span>
                  <span className="text-base font-bold">{formatNumber(totalVrac)} Kg | {pourcentageVrac.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xs text-muted-foreground">Conditionné</span>
                  <span className="text-base font-bold">{formatNumber(totalConditionne)} Kg | {pourcentageConditionne.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sorties par Client */}
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sorties par Client</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Petro Ivoire</span>
                  <span className="text-base font-bold">{pctSortiesPetro.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Vivo Energies</span>
                  <span className="text-base font-bold">{pctSortiesVivo.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Energies</span>
                  <span className="text-base font-bold">{pctSortiesTotal.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Production */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-muted-foreground">Production Centre Emplisseur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tonnage Production CE */}
          <Card className="bg-primary/5 border-primary/20 flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Tonnage Production CE</CardTitle>
              <Weight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold text-primary">
                {productionStats.loading ? '...' : `${formatNumber(productionStats.tonnage)} Kg`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodText()}</p>
              <div className="mt-3 space-y-1 border-t pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B6</span>
                  <span className="font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b6 * 6)} Kg</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B12</span>
                  <span className="font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b12 * 12)} Kg</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B28</span>
                  <span className="font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b28 * 28)} Kg</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B38</span>
                  <span className="font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b38 * 38)} Kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nombre Bouteilles Produites */}
          <Card className="bg-primary/5 border-primary/20 flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Bouteilles Produites</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold text-primary">
                {productionStats.loading ? '...' : productionStats.bouteilles.toLocaleString('fr-FR')}
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B6: <span className="font-bold text-foreground">{productionStats.bottlesByType.b6.toLocaleString('fr-FR')}</span></span>
                  <span className="font-bold text-foreground">{pctB6.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B12: <span className="font-bold text-foreground">{productionStats.bottlesByType.b12.toLocaleString('fr-FR')}</span></span>
                  <span className="font-bold text-foreground">{pctB12.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B28: <span className="font-bold text-foreground">{productionStats.bottlesByType.b28.toLocaleString('fr-FR')}</span></span>
                  <span className="font-bold text-foreground">{pctB28.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">B38: <span className="font-bold text-foreground">{productionStats.bottlesByType.b38.toLocaleString('fr-FR')}</span></span>
                  <span className="font-bold text-foreground">{pctB38.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Corrélation Production vs Sorties Conditionnées */}
          <Card className="bg-primary/5 border-primary/20 flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Corrélation Prod. vs Sorties</CardTitle>
              <TrendingUpDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                <div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Production représente </span>
                    <span className="text-2xl font-bold text-foreground">{correlation.toFixed(1)}%</span>
                    <span className="text-muted-foreground"> des sorties conditionnées</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Production</span>
                    <span className="text-base font-bold">{formatNumber(productionStats.tonnage)} Kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sorties Cond.</span>
                    <span className="text-base font-bold">{formatNumber(totalConditionne)} Kg</span>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Différence</span>
                    <span className={`text-lg font-bold ${(productionStats.tonnage - totalConditionne) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatNumber(productionStats.tonnage - totalConditionne)} Kg
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production par Client */}
          <Card className="bg-primary/5 border-primary/20 flex flex-col justify-between h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Production par Client</CardTitle>
              <Factory className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Petro Ivoire</span>
                  <span className="text-base font-bold text-primary">{pctProdPetro.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Vivo Energies</span>
                  <span className="text-base font-bold text-primary">{pctProdVivo.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Energies</span>
                  <span className="text-base font-bold text-primary">{pctProdTotal.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar Heatmap - 3 Derniers Mois */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Calendrier des bilans - 3 derniers mois
          </CardTitle>
          <CardDescription className="text-base">
            Vert: Positif | Rouge: Négatif | Gris: Bilan non calculé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mois -2 */}
            <div className="flex flex-col items-center">
              <Calendar
                month={previousMonth2}
                modifiers={createModifiersForMonth(previousMonth2Entries)}
                modifiersStyles={modifiersStyles}
                locale={fr}
                className="rounded-md border [&_.rdp-caption]:hidden [&_.rdp-nav]:hidden"
                disabled={{ after: new Date() }}
              />
            </div>

            {/* Mois -1 */}
            <div className="flex flex-col items-center">
              <Calendar
                month={previousMonth1}
                modifiers={createModifiersForMonth(previousMonth1Entries)}
                modifiersStyles={modifiersStyles}
                locale={fr}
                className="rounded-md border [&_.rdp-caption]:hidden [&_.rdp-nav]:hidden"
                disabled={{ after: new Date() }}
              />
            </div>

            {/* Mois actuel */}
            <div className="flex flex-col items-center">
              <Calendar
                month={currentMonth}
                modifiers={createModifiersForMonth(currentMonthEntries)}
                modifiersStyles={modifiersStyles}
                locale={fr}
                className="rounded-md border [&_.rdp-caption]:hidden [&_.rdp-nav]:hidden"
                disabled={{ after: new Date() }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
