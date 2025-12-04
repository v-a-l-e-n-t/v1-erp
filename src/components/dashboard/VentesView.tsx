import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatNumber } from '@/utils/calculations';
import {
    TrendingUp,
    TrendingDown,
    Calendar as CalendarIcon,
    Package,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface VentesViewProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    filterType: 'month' | 'date' | 'range';
    setFilterType: (type: 'month' | 'date' | 'range') => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
}

interface VentesData {
    totalVentes: number;
    totalVrac: number;
    totalConditionne: number;
    variationVracPct: number;
    variationConditionnePct: number;
    clientBreakdown: {
        simam: number;
        petro: number;
        vivo: number;
        total: number;
    };
    monthlyEvolution: Array<{
        month: string;
        ventes: number;
    }>;
    productionTotal: number;
}

const VentesView = ({
    dateRange,
    setDateRange,
    filterType,
    setFilterType,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth
}: VentesViewProps) => {
    const [loading, setLoading] = useState(false);
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [ventesData, setVentesData] = useState<VentesData>({
        totalVentes: 0,
        totalVrac: 0,
        totalConditionne: 0,
        variationVracPct: 0,
        variationConditionnePct: 0,
        clientBreakdown: { simam: 0, petro: 0, vivo: 0, total: 0 },
        monthlyEvolution: [],
        productionTotal: 0
    });

    // Available months for filter
    const availableMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7);
    }), []);

    // Fetch ventes data
    useEffect(() => {
        const fetchVentesData = async () => {
            setLoading(true);
            try {
                let query: any = supabase.from('bilan_entries').select('*');

                // Apply date filters
                if (filterType === 'month') {
                    const startDate = `${selectedMonth}-01`;
                    const [y, m] = selectedMonth.split('-').map(Number);
                    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                    query = query.gte('date', startDate).lte('date', endDate);
                } else if (filterType === 'date' && selectedDate) {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    query = query.eq('date', dateStr);
                } else if (filterType === 'range' && dateRange?.from) {
                    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                    const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                    query = query.gte('date', fromStr).lte('date', toStr);
                }

                const { data: bilans, error } = await query;
                if (error) throw error;

                // Fetch production data
                let prodQuery = supabase.from('production_shifts').select('date, tonnage_total');

                if (filterType === 'month') {
                    const startDate = `${selectedMonth}-01`;
                    const [y, m] = selectedMonth.split('-').map(Number);
                    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                    prodQuery = prodQuery.gte('date', startDate).lte('date', endDate);
                } else if (filterType === 'date' && selectedDate) {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    prodQuery = prodQuery.eq('date', dateStr);
                } else if (filterType === 'range' && dateRange?.from) {
                    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                    const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                    prodQuery = prodQuery.gte('date', fromStr).lte('date', toStr);
                }

                const { data: production, error: prodError } = await prodQuery;
                if (prodError) throw prodError;

                // Calculate totals
                const totalVrac = bilans?.reduce((sum: number, b: any) => sum + (b.sorties_vrac || 0), 0) || 0;
                const totalConditionne = bilans?.reduce((sum: number, b: any) => sum + (b.sorties_conditionnees || 0), 0) || 0;
                const totalVentes = totalVrac + totalConditionne;

                // Calculate client breakdown (Simam = Vrac, others = Conditionné)
                const simam = totalVrac;
                const petro = bilans?.reduce((sum: number, b: any) =>
                    sum + (b.sorties_conditionnees_petro_ivoire || 0), 0) || 0;
                const vivo = bilans?.reduce((sum: number, b: any) =>
                    sum + (b.sorties_conditionnees_vivo_energies || 0), 0) || 0;
                const total = bilans?.reduce((sum: number, b: any) =>
                    sum + (b.sorties_conditionnees_total_energies || 0), 0) || 0;

                // Calculate production total (convert from Tonnes to Kg)
                const productionTotal = (production?.reduce((sum: number, p: any) =>
                    sum + (Number(p.tonnage_total) || 0), 0) || 0) * 1000;

                // Calculate monthly evolution (last 6 months)
                const monthlyEvolution: Array<{ month: string; ventes: number }> = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const monthStr = d.toISOString().slice(0, 7);

                    const monthBilans = bilans?.filter((b: any) => b.date.startsWith(monthStr)) || [];
                    const monthVentes = monthBilans.reduce((sum: number, b: any) =>
                        sum + (b.sorties_vrac || 0) + (b.sorties_conditionnees || 0), 0);

                    monthlyEvolution.push({
                        month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
                        ventes: monthVentes
                    });
                }

                // Calculate variation vs previous period
                let variationVracPct = 0;
                let variationConditionnePct = 0;

                // Fetch previous period data for comparison
                let prevQuery: any = supabase.from('bilan_entries').select('*');

                if (filterType === 'month') {
                    // Previous month
                    const [y, m] = selectedMonth.split('-').map(Number);
                    const prevDate = new Date(y, m - 2, 1); // m-2 because month is 1-indexed
                    const prevMonth = prevDate.toISOString().slice(0, 7);
                    const prevStartDate = `${prevMonth}-01`;
                    const [py, pm] = prevMonth.split('-').map(Number);
                    const prevEndDate = new Date(py, pm, 0).toISOString().split('T')[0];
                    prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
                } else if (filterType === 'date' && selectedDate) {
                    // Previous day
                    const prevDay = new Date(selectedDate);
                    prevDay.setDate(prevDay.getDate() - 1);
                    const prevDateStr = format(prevDay, 'yyyy-MM-dd');
                    prevQuery = prevQuery.eq('date', prevDateStr);
                } else if (filterType === 'range' && dateRange?.from && dateRange?.to) {
                    // Previous range (same duration)
                    const duration = dateRange.to.getTime() - dateRange.from.getTime();
                    const prevTo = new Date(dateRange.from.getTime() - 1);
                    const prevFrom = new Date(prevTo.getTime() - duration);
                    const prevFromStr = format(prevFrom, 'yyyy-MM-dd');
                    const prevToStr = format(prevTo, 'yyyy-MM-dd');
                    prevQuery = prevQuery.gte('date', prevFromStr).lte('date', prevToStr);
                }

                const { data: prevBilans } = await prevQuery;

                if (prevBilans && prevBilans.length > 0) {
                    const prevVrac = prevBilans.reduce((sum: number, b: any) => sum + (b.sorties_vrac || 0), 0);
                    const prevConditionne = prevBilans.reduce((sum: number, b: any) => sum + (b.sorties_conditionnees || 0), 0);

                    variationVracPct = prevVrac > 0 ? ((totalVrac - prevVrac) / prevVrac) * 100 : 0;
                    variationConditionnePct = prevConditionne > 0 ? ((totalConditionne - prevConditionne) / prevConditionne) * 100 : 0;
                }

                setVentesData({
                    totalVentes,
                    totalVrac,
                    totalConditionne,
                    variationVracPct,
                    variationConditionnePct,
                    clientBreakdown: { simam, petro, vivo, total },
                    monthlyEvolution,
                    productionTotal
                });

            } catch (error) {
                console.error('Error fetching ventes data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVentesData();
    }, [filterType, selectedMonth, selectedDate, dateRange]);

    // Pie chart data
    const pieData = [
        { name: 'Vrac', value: ventesData.totalVrac, color: '#f97316' },
        { name: 'Conditionné', value: ventesData.totalConditionne, color: '#3b82f6' }
    ].filter(item => item.value > 0);

    // Client percentages
    const totalClients = ventesData.clientBreakdown.simam + ventesData.clientBreakdown.petro +
        ventesData.clientBreakdown.vivo + ventesData.clientBreakdown.total;

    const clientPct = {
        simam: totalClients > 0 ? (ventesData.clientBreakdown.simam / totalClients) * 100 : 0,
        petro: totalClients > 0 ? (ventesData.clientBreakdown.petro / totalClients) * 100 : 0,
        vivo: totalClients > 0 ? (ventesData.clientBreakdown.vivo / totalClients) * 100 : 0,
        total: totalClients > 0 ? (ventesData.clientBreakdown.total / totalClients) * 100 : 0
    };

    // Correlation data
    const tauxConversion = ventesData.totalConditionne > 0
        ? (ventesData.productionTotal / ventesData.totalConditionne) * 100
        : 0;
    const stockTheorique = ventesData.productionTotal - ventesData.totalConditionne;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Dashboard des Ventes</h2>
                    <p className="text-muted-foreground">Analyse des sorties et performance commerciale</p>
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

                    <Select value={clientFilter} onValueChange={setClientFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Tous les clients" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les clients</SelectItem>
                            <SelectItem value="simam">Simam</SelectItem>
                            <SelectItem value="petro">Petro Ivoire</SelectItem>
                            <SelectItem value="vivo">Vivo Energies</SelectItem>
                            <SelectItem value="total">Total Energies</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            <SelectItem value="vrac">Vrac</SelectItem>
                            <SelectItem value="conditionne">Conditionné</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Global Indicators - First Row: Total, Vrac, Conditionné */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventes</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(ventesData.totalVentes)} Kg</div>
                        <div className="mt-4 space-y-2 border-t pt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-orange-600 font-semibold text-sm min-w-[90px]">Vrac</span>
                                <span className="text-base font-bold text-orange-600">{formatNumber(ventesData.totalVrac)} Kg</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="text-base font-bold text-orange-600">{ventesData.totalVentes > 0 ? ((ventesData.totalVrac / ventesData.totalVentes) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-semibold text-sm min-w-[90px]">Conditionné</span>
                                <span className="text-base font-bold text-blue-600">{formatNumber(ventesData.totalConditionne)} Kg</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="text-base font-bold text-blue-600">{ventesData.totalVentes > 0 ? ((ventesData.totalConditionne / ventesData.totalVentes) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vrac</CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatNumber(ventesData.totalVrac)} Kg</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {ventesData.totalVentes > 0 ? ((ventesData.totalVrac / ventesData.totalVentes) * 100).toFixed(1) : 0}% des ventes
                        </p>
                        <div className={`text-sm font-semibold mt-2 ${ventesData.variationVracPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ventesData.variationVracPct >= 0 ? '↗' : '↘'} {ventesData.variationVracPct >= 0 ? '+' : ''}{ventesData.variationVracPct.toFixed(1)}% vs période précédente
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conditionné</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatNumber(ventesData.totalConditionne)} Kg</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {ventesData.totalVentes > 0 ? ((ventesData.totalConditionne / ventesData.totalVentes) * 100).toFixed(1) : 0}% des ventes
                        </p>
                        <div className={`text-sm font-semibold mt-2 ${ventesData.variationConditionnePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ventesData.variationConditionnePct >= 0 ? '↗' : '↘'} {ventesData.variationConditionnePct >= 0 ? '+' : ''}{ventesData.variationConditionnePct.toFixed(1)}% vs période précédente
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client Analysis with Logos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Analyse par Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Simam */}
                            <div className="flex flex-col items-center p-3 border rounded-lg hover:shadow-md transition-shadow">
                                <img src="/images/logo-simam.png" alt="Simam" className="h-12 w-auto mb-2 object-contain" />
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Simam (Vrac)</p>
                                    <p className="text-lg font-bold">{formatNumber(ventesData.clientBreakdown.simam)} Kg</p>
                                    <p className="text-xs text-orange-600 font-semibold">{clientPct.simam.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Petro Ivoire */}
                            <div className="flex flex-col items-center p-3 border rounded-lg hover:shadow-md transition-shadow">
                                <img src="/images/logo-petro.png" alt="Petro Ivoire" className="h-12 w-auto mb-2 object-contain" />
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Petro Ivoire</p>
                                    <p className="text-lg font-bold">{formatNumber(ventesData.clientBreakdown.petro)} Kg</p>
                                    <p className="text-xs text-blue-600 font-semibold">{clientPct.petro.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Vivo Energies */}
                            <div className="flex flex-col items-center p-3 border rounded-lg hover:shadow-md transition-shadow">
                                <img src="/images/logo-vivo.png" alt="Vivo Energies" className="h-12 w-auto mb-2 object-contain" />
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Vivo Energies</p>
                                    <p className="text-lg font-bold">{formatNumber(ventesData.clientBreakdown.vivo)} Kg</p>
                                    <p className="text-xs text-green-600 font-semibold">{clientPct.vivo.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Total Energies */}
                            <div className="flex flex-col items-center p-3 border rounded-lg hover:shadow-md transition-shadow">
                                <img src="/images/logo-total.png" alt="Total Energies" className="h-12 w-auto mb-2 object-contain" />
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Total Energies</p>
                                    <p className="text-lg font-bold">{formatNumber(ventesData.clientBreakdown.total)} Kg</p>
                                    <p className="text-xs text-purple-600 font-semibold">{clientPct.total.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Line Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Évolution Mensuelle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={ventesData.monthlyEvolution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatNumber(value) + ' Kg'} />
                                <Legend />
                                <Line type="monotone" dataKey="ventes" stroke="#3b82f6" strokeWidth={2} name="Ventes" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>


            {/* Production vs Ventes Correlation */}
            <Card>
                <CardHeader>
                    <CardTitle>Corrélation Production vs Ventes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-primary/5 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Production CE</p>
                            <p className="text-2xl font-bold text-primary">{formatNumber(ventesData.productionTotal)} Kg</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Sorties Conditionnées</p>
                            <p className="text-2xl font-bold text-blue-600">{formatNumber(ventesData.totalConditionne)} Kg</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Taux de Conversion</p>
                            <p className="text-2xl font-bold text-green-600">{tauxConversion.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Stock Théorique (Production - Ventes Cond.)</p>
                        <p className={`text-2xl font-bold ${stockTheorique >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatNumber(stockTheorique)} Kg
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VentesView;
