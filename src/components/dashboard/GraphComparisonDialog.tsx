import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, TrendingUp } from 'lucide-react';
import { format, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GraphComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient: string;
}

interface ChartDataPoint {
  mois: string;
  volume: number;
}

interface PieChartData {
  name: string;
  value: number;
}

interface PeriodConfig {
  label: string;
  startDate: string;
  endDate: string;
}

const CLIENT_LABELS: Record<string, string> = {
  'TOTAL_ENERGIES': 'Total Énergies',
  'PETRO_IVOIRE': 'Petro Ivoire',
  'VIVO_ENERGIES': 'Vivo Énergies'
};

export default function GraphComparisonDialog({ open, onOpenChange, selectedClient }: GraphComparisonDialogProps) {
  const [selectedGraph, setSelectedGraph] = useState<string>('reception');
  const [period1Type, setPeriod1Type] = useState<'month' | 'year' | 'period'>('month');
  const [period2Type, setPeriod2Type] = useState<'month' | 'year' | 'period'>('month');
  const [period1Month, setPeriod1Month] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [period2Month, setPeriod2Month] = useState<string>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  const [period1Year, setPeriod1Year] = useState<number>(new Date().getFullYear());
  const [period2Year, setPeriod2Year] = useState<number>(new Date().getFullYear() - 1);
  const [period1Range, setPeriod1Range] = useState<DateRange | undefined>();
  const [period2Range, setPeriod2Range] = useState<DateRange | undefined>();

  // Années disponibles
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, []);

  // Mois disponibles
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${period1Year}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [period1Year]);

  const availableMonths2 = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${period2Year}-${String(month).padStart(2, '0')}`;
    }).reverse();
  }, [period2Year]);

  // Calculer les dates des périodes
  const period1: PeriodConfig | null = useMemo(() => {
    if (period1Type === 'month') {
      const [y, m] = period1Month.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const end = format(endOfMonth(new Date(y, m - 1, 1)), 'yyyy-MM-dd');
      return {
        label: format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr }),
        startDate: start,
        endDate: end
      };
    }
    if (period1Type === 'year') {
      return {
        label: `${period1Year}`,
        startDate: `${period1Year}-01-01`,
        endDate: `${period1Year}-12-31`
      };
    }
    if (period1Type === 'period' && period1Range?.from) {
      return {
        label: period1Range.to
          ? `${format(period1Range.from, 'dd/MM/yyyy')} - ${format(period1Range.to, 'dd/MM/yyyy')}`
          : format(period1Range.from, 'dd/MM/yyyy'),
        startDate: format(period1Range.from, 'yyyy-MM-dd'),
        endDate: period1Range.to ? format(period1Range.to, 'yyyy-MM-dd') : format(period1Range.from, 'yyyy-MM-dd')
      };
    }
    return null;
  }, [period1Type, period1Month, period1Year, period1Range]);

  const period2: PeriodConfig | null = useMemo(() => {
    if (period2Type === 'month') {
      const [y, m] = period2Month.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const end = format(endOfMonth(new Date(y, m - 1, 1)), 'yyyy-MM-dd');
      return {
        label: format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr }),
        startDate: start,
        endDate: end
      };
    }
    if (period2Type === 'year') {
      return {
        label: `${period2Year}`,
        startDate: `${period2Year}-01-01`,
        endDate: `${period2Year}-12-31`
      };
    }
    if (period2Type === 'period' && period2Range?.from) {
      return {
        label: period2Range.to
          ? `${format(period2Range.from, 'dd/MM/yyyy')} - ${format(period2Range.to, 'dd/MM/yyyy')}`
          : format(period2Range.from, 'dd/MM/yyyy'),
        startDate: format(period2Range.from, 'yyyy-MM-dd'),
        endDate: period2Range.to ? format(period2Range.to, 'yyyy-MM-dd') : format(period2Range.from, 'yyyy-MM-dd')
      };
    }
    return null;
  }, [period2Type, period2Month, period2Year, period2Range]);

  // Données comparatives pour diagramme circulaire unique
  const [comparisonPieData, setComparisonPieData] = useState<PieChartData[]>([]);
  const [loading, setLoading] = useState(false);

  // Couleurs pour les deux périodes
  const PERIOD1_COLOR = '#ef4444'; // Rouge
  const PERIOD2_COLOR = '#22c55e'; // Vert

  // Types de graphiques disponibles
  const graphTypes = [
    { value: 'reception', label: 'Réception Butane' },
    { value: 'taux_enlevement', label: 'Taux d\'Enlèvement Butane' },
    { value: 'sortie_cond', label: 'Évolution Sortie Conditionnée' },
    { value: 'sortie_vrac', label: 'Évolution Sortie VRAC' },
    { value: 'bilan', label: 'Évolution Bilan Matière' }
  ];

  // Fonction pour récupérer les données d'une période
  const fetchPeriodData = async (period: PeriodConfig, graphType: string): Promise<ChartDataPoint[]> => {
    try {
      if (graphType === 'reception') {
        let query = supabase.from('receptions_clients').select('*');
        query = query.gte('date', period.startDate).lte('date', period.endDate);
        if (selectedClient !== 'all') {
          query = query.eq('client', selectedClient);
        }
        const { data, error } = await query.order('date', { ascending: true });
        if (error) throw error;

        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((r: any) => {
          const date = new Date(r.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(r.poids_kg || 0);
        });

        return Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000
          }));
      }

      if (graphType === 'taux_enlevement') {
        // Récupérer réceptions
        const { data: receptions, error: err1 } = await supabase
          .from('receptions_clients')
          .select('*')
          .gte('date', period.startDate)
          .lte('date', period.endDate)
          .order('date', { ascending: true });

        if (err1) throw err1;

        // Récupérer bilans
        const { data: bilans, error: err2 } = await supabase
          .from('bilan_entries')
          .select('*')
          .gte('date', period.startDate)
          .lte('date', period.endDate)
          .order('date', { ascending: true });

        if (err2) throw err2;

        const monthlyReceptions: { [key: string]: number } = {};
        (receptions || []).forEach((r: any) => {
          const date = new Date(r.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyReceptions[monthKey] = (monthlyReceptions[monthKey] || 0) + Number(r.poids_kg || 0);
        });

        const monthlyVentes: { [key: string]: number } = {};
        (bilans || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          const vrac = Number(b.sorties_vrac || 0);
          const conditionne = Number(b.sorties_conditionnees || 0);
          monthlyVentes[monthKey] = (monthlyVentes[monthKey] || 0) + vrac + conditionne;
        });

        const monthsWithVentes = Object.keys(monthlyVentes);
        return monthsWithVentes
          .sort()
          .map(month => {
            const reception = monthlyReceptions[month] || 0;
            const vente = monthlyVentes[month] || 0;
            const taux = reception > 0 ? (vente / reception) * 100 : 0;
            return {
              mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
              volume: Number(taux.toFixed(2))
            };
          });
      }

      if (graphType === 'sortie_cond') {
        const clientFieldMap: { [key: string]: string } = {
          'TOTAL_ENERGIES': 'sorties_conditionnees_total_energies',
          'PETRO_IVOIRE': 'sorties_conditionnees_petro_ivoire',
          'VIVO_ENERGIES': 'sorties_conditionnees_vivo_energies'
        };

        let selectFields = 'date, sorties_conditionnees';
        if (selectedClient !== 'all' && clientFieldMap[selectedClient]) {
          selectFields += `, ${clientFieldMap[selectedClient]}`;
        }

        const { data, error } = await supabase
          .from('bilan_entries')
          .select(selectFields)
          .gte('date', period.startDate)
          .lte('date', period.endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          const value = selectedClient !== 'all' && clientFieldMap[selectedClient]
            ? Number(b[clientFieldMap[selectedClient]] || 0)
            : Number(b.sorties_conditionnees || 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
        });

        return Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000
          }));
      }

      if (graphType === 'sortie_vrac') {
        const clientFieldMap: { [key: string]: string } = {
          'TOTAL_ENERGIES': 'sorties_vrac_total_energies',
          'PETRO_IVOIRE': 'sorties_vrac_petro_ivoire',
          'VIVO_ENERGIES': 'sorties_vrac_vivo_energies'
        };

        let selectFields = 'date, sorties_vrac';
        if (selectedClient !== 'all' && clientFieldMap[selectedClient]) {
          selectFields += `, ${clientFieldMap[selectedClient]}`;
        }

        const { data, error } = await supabase
          .from('bilan_entries')
          .select(selectFields)
          .gte('date', period.startDate)
          .lte('date', period.endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          const value = selectedClient !== 'all' && clientFieldMap[selectedClient]
            ? Number(b[clientFieldMap[selectedClient]] || 0)
            : Number(b.sorties_vrac || 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
        });

        return Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000
          }));
      }

      if (graphType === 'bilan') {
        const { data, error } = await supabase
          .from('bilan_entries')
          .select('date, bilan')
          .gte('date', period.startDate)
          .lte('date', period.endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        const monthlyData: { [key: string]: number } = {};
        (data || []).forEach((b: any) => {
          const date = new Date(b.date);
          const monthKey = format(date, 'yyyy-MM');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(b.bilan || 0);
        });

        return Object.keys(monthlyData)
          .sort()
          .map(month => ({
            mois: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            volume: monthlyData[month] / 1000
          }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching period data:', error);
      return [];
    }
  };

  // Charger les données comparatives pour un seul diagramme circulaire
  useEffect(() => {
    const loadComparisonData = async () => {
      if (!period1 || !period2) return;

      setLoading(true);
      try {
        const [data1, data2] = await Promise.all([
          fetchPeriodData(period1, selectedGraph),
          fetchPeriodData(period2, selectedGraph)
        ]);

        // Créer un ensemble de tous les mois des deux périodes
        const allMonths = new Set<string>();
        data1.forEach(d => allMonths.add(d.mois as string));
        data2.forEach(d => allMonths.add(d.mois as string));

        // Créer les données pour le diagramme circulaire
        // Chaque mois aura deux segments : un pour chaque période
        const pieData: PieChartData[] = [];
        
        Array.from(allMonths).sort().forEach(month => {
          const d1 = data1.find(d => d.mois === month);
          const d2 = data2.find(d => d.mois === month);
          
          const value1 = d1 ? Number(d1.volume) : 0;
          const value2 = d2 ? Number(d2.volume) : 0;
          
          // Ajouter un segment pour la période 1 (rouge)
          if (value1 > 0) {
            pieData.push({
              name: `${month} - ${period1.label}`,
              value: value1
            });
          }
          
          // Ajouter un segment pour la période 2 (vert)
          if (value2 > 0) {
            pieData.push({
              name: `${month} - ${period2.label}`,
              value: value2
            });
          }
        });

        setComparisonPieData(pieData);
      } catch (error) {
        console.error('Error loading comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && period1 && period2) {
      loadComparisonData();
    }
  }, [open, period1, period2, selectedGraph, selectedClient]);

  // Formater les valeurs pour l'affichage
  const formatValue = (value: number) => {
    if (selectedGraph === 'taux_enlevement') {
      return `${value.toFixed(2)}%`;
    }
    return `${value.toFixed(2)} t`;
  };

  // Calculer le total pour chaque période
  const total1 = comparisonPieData
    .filter(item => item.name.includes(period1?.label || ''))
    .reduce((sum, item) => sum + item.value, 0);
  const total2 = comparisonPieData
    .filter(item => item.name.includes(period2?.label || ''))
    .reduce((sum, item) => sum + item.value, 0);

  // Déterminer la couleur selon la période
  const getColorForSegment = (name: string) => {
    return name.includes(period1?.label || '') ? PERIOD1_COLOR : PERIOD2_COLOR;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Comparaison de Périodes
          </DialogTitle>
          <DialogDescription>
            Comparez les données entre deux périodes différentes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection du graphique */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de graphique</label>
            <Select value={selectedGraph} onValueChange={setSelectedGraph}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {graphTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Configuration des périodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Période 1 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Période 1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={period1Type} onValueChange={(v) => setPeriod1Type(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="period">Période personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {period1Type === 'month' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Année</label>
                      <Select value={period1Year.toString()} onValueChange={(v) => setPeriod1Year(Number(v))}>
                        <SelectTrigger>
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
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mois</label>
                      <Select value={period1Month} onValueChange={setPeriod1Month}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMonths.map(month => {
                            const [y, m] = month.split('-').map(Number);
                            return (
                              <SelectItem key={month} value={month}>
                                {format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr })}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {period1Type === 'year' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Année</label>
                    <Select value={period1Year.toString()} onValueChange={(v) => setPeriod1Year(Number(v))}>
                      <SelectTrigger>
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
                  </div>
                )}

                {period1Type === 'period' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !period1Range && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {period1Range?.from ? (
                            period1Range.to ? (
                              <>
                                {format(period1Range.from, 'dd/MM/yyyy', { locale: fr })} -{' '}
                                {format(period1Range.to, 'dd/MM/yyyy', { locale: fr })}
                              </>
                            ) : (
                              format(period1Range.from, 'dd/MM/yyyy', { locale: fr })
                            )
                          ) : (
                            'Sélectionner une période'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={period1Range?.from}
                          selected={period1Range}
                          onSelect={setPeriod1Range}
                          numberOfMonths={2}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {period1 && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Période sélectionnée:</p>
                    <p className="text-sm text-muted-foreground">{period1.label}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Période 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Période 2</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={period2Type} onValueChange={(v) => setPeriod2Type(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="period">Période personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {period2Type === 'month' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Année</label>
                      <Select value={period2Year.toString()} onValueChange={(v) => setPeriod2Year(Number(v))}>
                        <SelectTrigger>
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
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mois</label>
                      <Select value={period2Month} onValueChange={setPeriod2Month}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMonths2.map(month => {
                            const [y, m] = month.split('-').map(Number);
                            return (
                              <SelectItem key={month} value={month}>
                                {format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr })}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {period2Type === 'year' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Année</label>
                    <Select value={period2Year.toString()} onValueChange={(v) => setPeriod2Year(Number(v))}>
                      <SelectTrigger>
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
                  </div>
                )}

                {period2Type === 'period' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !period2Range && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {period2Range?.from ? (
                            period2Range.to ? (
                              <>
                                {format(period2Range.from, 'dd/MM/yyyy', { locale: fr })} -{' '}
                                {format(period2Range.to, 'dd/MM/yyyy', { locale: fr })}
                              </>
                            ) : (
                              format(period2Range.from, 'dd/MM/yyyy', { locale: fr })
                            )
                          ) : (
                            'Sélectionner une période'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={period2Range?.from}
                          selected={period2Range}
                          onSelect={setPeriod2Range}
                          numberOfMonths={2}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {period2 && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Période sélectionnée:</p>
                    <p className="text-sm text-muted-foreground">{period2.label}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Graphique comparatif en diagramme circulaire unique */}
          {period1 && period2 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Comparaison: {graphTypes.find(g => g.value === selectedGraph)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    Chargement des données...
                  </div>
                ) : comparisonPieData.length === 0 ? (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    Aucune donnée disponible pour la comparaison
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Légende des couleurs */}
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PERIOD1_COLOR }} />
                        <span className="text-sm font-medium">
                          Période 1 ({period1.label}): {formatValue(total1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PERIOD2_COLOR }} />
                        <span className="text-sm font-medium">
                          Période 2 ({period2.label}): {formatValue(total2)}
                        </span>
                      </div>
                    </div>

                    {/* Diagramme circulaire unique */}
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie
                          data={comparisonPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            const shortName = name.split(' - ')[0];
                            return `${shortName.substring(0, 6)}${shortName.length > 6 ? '...' : ''} ${(percent * 100).toFixed(0)}%`;
                          }}
                          outerRadius={150}
                          innerRadius={60}
                          dataKey="value"
                        >
                          {comparisonPieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getColorForSegment(entry.name)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const period = name.includes(period1.label) ? period1.label : period2.label;
                            const month = name.split(' - ')[0];
                            return [`${formatValue(value)}`, `${month} (${period})`];
                          }}
                        />
                        <Legend
                          formatter={(value: string) => {
                            const item = comparisonPieData.find(d => d.name === value);
                            if (!item) return value;
                            const parts = value.split(' - ');
                            return `${parts[0]} (${parts[1]}) - ${formatValue(item.value)}`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
