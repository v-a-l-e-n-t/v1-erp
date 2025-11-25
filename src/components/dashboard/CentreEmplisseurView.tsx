import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Factory, Users, ArrowUp, ArrowDown, Calendar as CalendarIcon, Package } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface CentreEmplisseurViewProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    filterType: 'month' | 'date' | 'range';
    setFilterType: (type: 'month' | 'date' | 'range') => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
}

const CentreEmplisseurView = ({
    dateRange, setDateRange,
    filterType, setFilterType,
    selectedDate, setSelectedDate,
    selectedMonth, setSelectedMonth
}: CentreEmplisseurViewProps) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        // Global
        totalTonnage: 0,
        shift1: { tonnage: 0, recharges: 0, consignes: 0 },
        shift2: { tonnage: 0, recharges: 0, consignes: 0 },

        // Lines
        lines: [] as {
            id: number;
            tonnage: number;
            percentage: number;
            recharges: number;
            consignes: number;
            rechargesKg: number;
            consignesKg: number;
        }[],
        maxLine: { id: 0, tonnage: 0 },
        minLine: { id: 0, tonnage: 0 },

        // Bottles (Recharges & Consignes)
        recharges: {
            b6: { qty: 0, kg: 0 },
            b12: { qty: 0, kg: 0 },
            b28: { qty: 0, kg: 0 },
            b38: { qty: 0, kg: 0 },
            total: 0
        },
        consignes: {
            b6: { qty: 0, kg: 0 },
            b12: { qty: 0, kg: 0 },
            b28: { qty: 0, kg: 0 },
            b38: { qty: 0, kg: 0 },
            total: 0
        },

        // Clients
        clients: {
            petro: { qty: 0, pct: 0, tonnage: 0 },
            vivo: { qty: 0, pct: 0, tonnage: 0 },
            total: { qty: 0, pct: 0, tonnage: 0 },
            global: 0
        }
    });

    // Generate last 12 months for filter
    const availableMonths = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7);
    });

    useEffect(() => {
        fetchStats();
    }, [dateRange, filterType, selectedDate, selectedMonth]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let shiftsQuery = supabase.from('production_shifts').select('*');
            let linesQuery = supabase.from('lignes_production').select('*, production_shifts!inner(date, shift_type)');

            // Apply filters
            if (filterType === 'month') {
                const startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                linesQuery = linesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
            } else if (filterType === 'date' && selectedDate) {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                shiftsQuery = shiftsQuery.eq('date', dateStr);
                linesQuery = linesQuery.eq('production_shifts.date', dateStr);
            } else if (filterType === 'range' && dateRange?.from) {
                const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                linesQuery = linesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
            }

            const [shiftsResult, linesResult] = await Promise.all([shiftsQuery, linesQuery]);

            if (shiftsResult.error) throw shiftsResult.error;
            if (linesResult.error) throw linesResult.error;

            const shifts = shiftsResult.data || [];
            const lines = linesResult.data || [];

            // 1. Global Production & Shifts
            const totalTonnage = shifts.reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0);

            // Calculate Shift details from lines to get recharges/consignes counts per shift
            const shift1Lines = lines.filter(l => l.production_shifts.shift_type === '10h-19h');
            const shift2Lines = lines.filter(l => l.production_shifts.shift_type === '20h-5h');

            const calculateShiftStats = (shiftLines: any[], shiftTonnage: number) => {
                const recharges = shiftLines.reduce((sum: number, l: any) => sum +
                    (l.cumul_recharges_b6 || 0) + (l.cumul_recharges_b12 || 0) +
                    (l.cumul_recharges_b28 || 0) + (l.cumul_recharges_b38 || 0), 0);
                const consignes = shiftLines.reduce((sum: number, l: any) => sum +
                    (l.cumul_consignes_b6 || 0) + (l.cumul_consignes_b12 || 0) +
                    (l.cumul_consignes_b28 || 0) + (l.cumul_consignes_b38 || 0), 0);
                return { tonnage: shiftTonnage, recharges, consignes };
            };

            const shift1Tonnage = shifts.filter(s => s.shift_type === '10h-19h').reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0);
            const shift2Tonnage = shifts.filter(s => s.shift_type === '20h-5h').reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0);

            const shift1Stats = calculateShiftStats(shift1Lines, shift1Tonnage);
            const shift2Stats = calculateShiftStats(shift2Lines, shift2Tonnage);

            // 2. Lines Breakdown
            const lineMap = new Map<number, { tonnage: number, recharges: number, consignes: number, rechargesKg: number, consignesKg: number }>();
            lines.forEach(l => {
                const current = lineMap.get(l.numero_ligne) || { tonnage: 0, recharges: 0, consignes: 0, rechargesKg: 0, consignesKg: 0 };

                const recharges = (l.cumul_recharges_b6 || 0) + (l.cumul_recharges_b12 || 0) +
                    (l.cumul_recharges_b28 || 0) + (l.cumul_recharges_b38 || 0);
                const consignes = (l.cumul_consignes_b6 || 0) + (l.cumul_consignes_b12 || 0) +
                    (l.cumul_consignes_b28 || 0) + (l.cumul_consignes_b38 || 0);

                const rechargesKg = (l.cumul_recharges_b6 || 0) * 6 +
                    (l.cumul_recharges_b12 || 0) * 12.5 +
                    (l.cumul_recharges_b28 || 0) * 28 +
                    (l.cumul_recharges_b38 || 0) * 38;

                const consignesKg = (l.cumul_consignes_b6 || 0) * 6 +
                    (l.cumul_consignes_b12 || 0) * 12.5 +
                    (l.cumul_consignes_b28 || 0) * 28 +
                    (l.cumul_consignes_b38 || 0) * 38;

                lineMap.set(l.numero_ligne, {
                    tonnage: current.tonnage + (Number(l.tonnage_ligne) || 0),
                    recharges: current.recharges + recharges,
                    consignes: current.consignes + consignes,
                    rechargesKg: current.rechargesKg + rechargesKg,
                    consignesKg: current.consignesKg + consignesKg
                });
            });

            const linesData = Array.from(lineMap.entries()).map(([id, data]) => ({
                id,
                tonnage: data.tonnage,
                recharges: data.recharges,
                consignes: data.consignes,
                rechargesKg: data.rechargesKg,
                consignesKg: data.consignesKg,
                percentage: totalTonnage > 0 ? (data.tonnage / totalTonnage) * 100 : 0
            })).sort((a, b) => a.id - b.id);

            const maxLine = linesData.reduce((prev, current) => (prev.tonnage > current.tonnage) ? prev : current, { id: 0, tonnage: 0 });
            const minLine = linesData.reduce((prev, current) => (prev.tonnage < current.tonnage && current.tonnage > 0) ? prev : current, { id: 0, tonnage: Infinity });
            if (minLine.tonnage === Infinity) minLine.tonnage = 0;

            // 3. Bottles Breakdown (Recharges & Consignes)
            let r_b6 = 0, r_b12 = 0, r_b28 = 0, r_b38 = 0;
            let c_b6 = 0, c_b12 = 0, c_b28 = 0, c_b38 = 0;

            lines.forEach(l => {
                r_b6 += (l.cumul_recharges_b6 || 0);
                r_b12 += (l.cumul_recharges_b12 || 0);
                r_b28 += (l.cumul_recharges_b28 || 0);
                r_b38 += (l.cumul_recharges_b38 || 0);

                c_b6 += (l.cumul_consignes_b6 || 0);
                c_b12 += (l.cumul_consignes_b12 || 0);
                c_b28 += (l.cumul_consignes_b28 || 0);
                c_b38 += (l.cumul_consignes_b38 || 0);
            });

            const totalRecharges = r_b6 + r_b12 + r_b28 + r_b38;
            const totalConsignes = c_b6 + c_b12 + c_b28 + c_b38;

            // Weights: B6=6kg, B12=12.5kg, B28=28kg, B38=38kg
            const calculateKg = (qty: number, weight: number) => (qty * weight);

            // 4. Clients Breakdown
            let cl_petro = 0, cl_vivo = 0, cl_total = 0;
            lines.forEach(l => {
                // Petro
                cl_petro += (l.recharges_petro_b6 || 0) + (l.recharges_petro_b12 || 0) + (l.recharges_petro_b28 || 0) + (l.recharges_petro_b38 || 0)
                    + (l.consignes_petro_b6 || 0) + (l.consignes_petro_b12 || 0) + (l.consignes_petro_b28 || 0) + (l.consignes_petro_b38 || 0);

                // Vivo
                cl_vivo += (l.recharges_vivo_b6 || 0) + (l.recharges_vivo_b12 || 0) + (l.recharges_vivo_b28 || 0) + (l.recharges_vivo_b38 || 0)
                    + (l.consignes_vivo_b6 || 0) + (l.consignes_vivo_b12 || 0) + (l.consignes_vivo_b28 || 0) + (l.consignes_vivo_b38 || 0);

                // Total Energies
                cl_total += (l.recharges_total_b6 || 0) + (l.recharges_total_b12 || 0) + (l.recharges_total_b28 || 0) + (l.recharges_total_b38 || 0)
                    + (l.consignes_total_b6 || 0) + (l.consignes_total_b12 || 0) + (l.consignes_total_b28 || 0) + (l.consignes_total_b38 || 0);
            });

            const globalClients = cl_petro + cl_vivo + cl_total;

            // Calculate tonnage per client
            const calculateClientTonnage = (lines: any[], clientPrefix: string) => {
                return lines.reduce((sum: number, l: any) => {
                    const tonnage =
                        (l[`recharges_${clientPrefix}_b6`] || 0) * 6 +
                        (l[`recharges_${clientPrefix}_b12`] || 0) * 12.5 +
                        (l[`recharges_${clientPrefix}_b28`] || 0) * 28 +
                        (l[`recharges_${clientPrefix}_b38`] || 0) * 38 +
                        (l[`consignes_${clientPrefix}_b6`] || 0) * 6 +
                        (l[`consignes_${clientPrefix}_b12`] || 0) * 12.5 +
                        (l[`consignes_${clientPrefix}_b28`] || 0) * 28 +
                        (l[`consignes_${clientPrefix}_b38`] || 0) * 38;
                    return sum + tonnage;
                }, 0);
            };

            const petroTonnage = calculateClientTonnage(lines, 'petro');
            const vivoTonnage = calculateClientTonnage(lines, 'vivo');
            const totalClientTonnage = calculateClientTonnage(lines, 'total');

            setStats({
                totalTonnage,
                shift1: shift1Stats,
                shift2: shift2Stats,
                lines: linesData,
                maxLine,
                minLine,
                recharges: {
                    b6: { qty: r_b6, kg: calculateKg(r_b6, 6) },
                    b12: { qty: r_b12, kg: calculateKg(r_b12, 12.5) },
                    b28: { qty: r_b28, kg: calculateKg(r_b28, 28) },
                    b38: { qty: r_b38, kg: calculateKg(r_b38, 38) },
                    total: totalRecharges
                },
                consignes: {
                    b6: { qty: c_b6, kg: calculateKg(c_b6, 6) },
                    b12: { qty: c_b12, kg: calculateKg(c_b12, 12.5) },
                    b28: { qty: c_b28, kg: calculateKg(c_b28, 28) },
                    b38: { qty: c_b38, kg: calculateKg(c_b38, 38) },
                    total: totalConsignes
                },
                clients: {
                    petro: { qty: cl_petro, pct: globalClients > 0 ? (cl_petro / globalClients) * 100 : 0, tonnage: petroTonnage },
                    vivo: { qty: cl_vivo, pct: globalClients > 0 ? (cl_vivo / globalClients) * 100 : 0, tonnage: vivoTonnage },
                    total: { qty: cl_total, pct: globalClients > 0 ? (cl_total / globalClients) * 100 : 0, tonnage: totalClientTonnage },
                    global: globalClients
                }
            });

        } catch (error) {
            console.error('Error fetching production stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord Production</h2>
                    <p className="text-muted-foreground">Suivi détaillé de la production et des performances</p>
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

            {/* 1. PRODUCTION GLOBALE - NEW LAYOUT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Factory className="h-5 w-5" />
                        PRODUCTION GLOBALE
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Global Tonnage with Recharges, Consignes and Clients */}
                    <div className="p-6 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="text-center mb-4">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Production Totale</p>
                            <p className="text-5xl font-extrabold text-primary tracking-tight">
                                {stats.totalTonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                <span className="text-2xl text-primary/60 ml-2">Kg</span>
                            </p>
                        </div>

                        {/* Total Recharges et Consignes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-primary/20">
                            <div className="text-center">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recharges</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {stats.recharges.total.toLocaleString('fr-FR')}
                                    <span className="text-sm text-blue-600/60 ml-1">Bouteilles</span>
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Consignes</p>
                                <p className="text-2xl font-bold text-orange-700">
                                    {stats.consignes.total.toLocaleString('fr-FR')}
                                    <span className="text-sm text-orange-600/60 ml-1">Bouteilles</span>
                                </p>
                            </div>
                        </div>

                        {/* Production par Client */}
                        <div className="mt-6 pt-6 border-t border-primary/20">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Production par Client
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-2">Petro Ivoire</p>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <div className="text-2xl font-bold text-primary">{stats.clients.petro.qty.toLocaleString('fr-FR')} Btl</div>
                                        <div className="text-sm font-medium text-primary/80">{stats.clients.petro.pct.toFixed(1)}%</div>
                                    </div>
                                    <div className="text-sm font-semibold text-muted-foreground">
                                        {(stats.clients.petro.tonnage / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T
                                    </div>
                                </div>
                                <div className="p-4 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-2">Vivo Energies</p>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <div className="text-2xl font-bold text-primary">{stats.clients.vivo.qty.toLocaleString('fr-FR')} Btl</div>
                                        <div className="text-sm font-medium text-primary/80">{stats.clients.vivo.pct.toFixed(1)}%</div>
                                    </div>
                                    <div className="text-sm font-semibold text-muted-foreground">
                                        {(stats.clients.vivo.tonnage / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T
                                    </div>
                                </div>
                                <div className="p-4 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-sm text-muted-foreground mb-2">Total Energies</p>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <div className="text-2xl font-bold text-primary">{stats.clients.total.qty.toLocaleString('fr-FR')} Btl</div>
                                        <div className="text-sm font-medium text-primary/80">{stats.clients.total.pct.toFixed(1)}%</div>
                                    </div>
                                    <div className="text-sm font-semibold text-muted-foreground">
                                        {(stats.clients.total.tonnage / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shifts Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-lg">Shift 1</span>
                                <span className="font-bold text-xl text-primary">{stats.shift1.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} Kg</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Recharges: <span className="font-medium text-foreground">{stats.shift1.recharges.toLocaleString('fr-FR')}</span></span>
                                <span>Consignes: <span className="font-medium text-foreground">{stats.shift1.consignes.toLocaleString('fr-FR')}</span></span>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-lg">Shift 2</span>
                                <span className="font-bold text-xl text-primary">{stats.shift2.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} Kg</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Recharges: <span className="font-medium text-foreground">{stats.shift2.recharges.toLocaleString('fr-FR')}</span></span>
                                <span>Consignes: <span className="font-medium text-foreground">{stats.shift2.consignes.toLocaleString('fr-FR')}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t my-4"></div>

                    {/* Lines Breakdown */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Détail par Ligne</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {stats.lines.map((line) => (
                                <div key={line.id} className="p-3 bg-card border rounded-md hover:bg-accent/5 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 text-primary font-bold w-8 h-8 flex items-center justify-center rounded-full">
                                                {line.id}
                                            </div>
                                            <span className="font-bold text-lg">{line.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} Kg</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm bg-muted/20 p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Recharges:</span>
                                            <span className="font-medium">{line.recharges.toLocaleString('fr-FR')} Btl</span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="font-medium">{(line.rechargesKg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T</span>
                                        </div>
                                        <div className="h-4 w-px bg-border"></div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Consignes:</span>
                                            <span className="font-medium">{line.consignes.toLocaleString('fr-FR')} Btl</span>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="font-medium">{(line.consignesKg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>

        </div>
    );
};

export default CentreEmplisseurView;
