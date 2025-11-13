import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BilanEntry } from '@/types/balance';
import { formatNumber, getNatureColor } from '@/utils/calculations';
import { TrendingUp, TrendingDown, TrendingUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { DayContentProps } from 'react-day-picker';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  entries: BilanEntry[];
}

const Dashboard = ({ entries }: DashboardProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tableau de bord</CardTitle>
          <CardDescription>Aucune donnée disponible</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Commencez par saisir votre premier bilan.</p>
        </CardContent>
      </Card>
    );
  }

  // Filter entries for selected month
  const monthEntries = entries.filter(entry => {
    const entryMonth = entry.date.substring(0, 7);
    return entryMonth === selectedMonth;
  });

  // Get available months from entries
  const availableMonths = Array.from(new Set(entries.map(e => e.date.substring(0, 7)))).sort().reverse();

  if (monthEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tableau de bord - Mois en cours</CardTitle>
              <CardDescription>Aucune donnée pour ce mois</CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Consultez l'historique pour voir les données des mois précédents.</p>
        </CardContent>
      </Card>
    );
  }

  // Get last entry (most recent)
  const lastEntry = monthEntries[0]; // entries are already sorted by date desc

  // Calculate monthly totals
  const totalReceptions = monthEntries.reduce((sum, e) => sum + e.reception_gpl, 0);
  const nombreReceptions = monthEntries.reduce((sum, e) => sum + e.receptions.length, 0);
  const totalSorties = monthEntries.reduce((sum, e) => sum + e.cumul_sorties, 0);
  const totalBilan = monthEntries.reduce((sum, e) => sum + e.bilan, 0);
  
  // Sorties breakdown (monthly totals)
  const totalVrac = monthEntries.reduce((sum, e) => sum + e.sorties_vrac, 0);
  const totalConditionne = monthEntries.reduce((sum, e) => sum + e.sorties_conditionnees, 0);
  const totalFuyardes = monthEntries.reduce((sum, e) => sum + e.fuyardes, 0);

  // Percentages
  const pourcentageVrac = totalSorties > 0 ? (totalVrac / totalSorties) * 100 : 0;
  const pourcentageConditionne = totalSorties > 0 ? (totalConditionne / totalSorties) * 100 : 0;

  // Bilan positif et négatif
  const bilansPositifs = monthEntries.filter(e => e.nature === 'Positif');
  const bilansNegatifs = monthEntries.filter(e => e.nature === 'Négatif');
  const totalBilanPositif = bilansPositifs.reduce((sum, e) => sum + e.bilan, 0);
  const totalBilanNegatif = bilansNegatifs.reduce((sum, e) => sum + e.bilan, 0);

  // Count by nature
  const positifCount = bilansPositifs.length;
  const negatifCount = bilansNegatifs.length;
  const neutreCount = monthEntries.filter(e => e.nature === 'Neutre').length;

  // Create a map of dates to entries for the heatmap
  const entriesByDate = new Map<string, BilanEntry>();
  monthEntries.forEach(entry => {
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
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bilan du mois</h2>
          <p className="text-muted-foreground">Vue d'ensemble des opérations du mois sélectionné</p>
        </div>
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Dernier bilan saisi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernier bilan saisi</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium">{new Date(lastEntry.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bilan</span>
                <span className={`text-xl font-bold ${lastEntry.bilan > 0 ? 'text-success' : lastEntry.bilan < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatNumber(lastEntry.bilan)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Nature</span>
                <span className={`font-semibold ${lastEntry.nature === 'Positif' ? 'text-success' : lastEntry.nature === 'Négatif' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {lastEntry.nature}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réceptions totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalReceptions)}</div>
            <p className="text-sm font-semibold text-foreground mt-2">
              {nombreReceptions} réception{nombreReceptions > 1 ? 's' : ''} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorties totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalSorties)}</div>
            <div className="mt-3 space-y-1 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vrac:</span>
                <span className="font-medium">{formatNumber(totalVrac)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conditionné:</span>
                <span className="font-medium">{formatNumber(totalConditionne)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Sorties Vrac & Conditionné</CardTitle>
            <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Vrac</div>
                <div className="text-2xl font-bold text-primary">{pourcentageVrac.toFixed(1)}%</div>
              </div>
              <div className="border-t pt-3">
                <div className="text-sm text-muted-foreground mb-1">Conditionné</div>
                <div className="text-2xl font-bold text-primary">{pourcentageConditionne.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bilan</CardTitle>
            <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBilan > 0 ? 'text-success' : totalBilan < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatNumber(totalBilan)}
            </div>
            <div className="space-y-2 mt-3 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Positif:</span>
                <span className="font-semibold text-success">{formatNumber(totalBilanPositif)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Négatif:</span>
                <span className="font-semibold text-destructive">{formatNumber(totalBilanNegatif)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
