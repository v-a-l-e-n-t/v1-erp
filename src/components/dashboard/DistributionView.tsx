import { useState, useEffect, useRef } from 'react';
import { format, endOfMonth, parse, subDays, differenceInDays, startOfMonth, endOfMonth as endOfMonthFn, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import VentesParMandataireTable from '@/components/dashboard/VentesParMandataireTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Package, Download, FileDown, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DistributionViewProps {
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

const DistributionView = ({
    dateRange,
    setDateRange,
    filterType,
    setFilterType,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    availableMonths
}: DistributionViewProps) => {
    const distributionGlobalesRef = useRef<HTMLDivElement>(null);
    const [totalTonnage, setTotalTonnage] = useState<number>(0);
    const [variationPct, setVariationPct] = useState<number>(0);
    const [mandataireStats, setMandataireStats] = useState<Array<{ id: string; nom: string; tonnage: number; percentage: number }>>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

    const getStartDate = () => {
        if (filterType === 'month') return `${selectedMonth}-01`;
        if (filterType === 'date' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        if (filterType === 'year') return `${selectedYear}-01-01`;
        return `${selectedMonth}-01`;
    };

    const getEndDate = () => {
        if (filterType === 'month') {
            const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
            return format(endOfMonth(monthDate), 'yyyy-MM-dd');
        }
        if (filterType === 'date' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.to) return format(dateRange.to, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        if (filterType === 'year') return `${selectedYear}-12-31`;
        const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
        return format(endOfMonth(monthDate), 'yyyy-MM-dd');
    };

    // Fetch distribution data and calculate stats
    useEffect(() => {
        const fetchDistributionData = async () => {
            try {
                // Calculate start and end dates
                let startDate: string;
                let endDate: string;
                
                if (filterType === 'month') {
                    startDate = `${selectedMonth}-01`;
                    const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
                    endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
                } else if (filterType === 'date' && selectedDate) {
                    startDate = format(selectedDate, 'yyyy-MM-dd');
                    endDate = format(selectedDate, 'yyyy-MM-dd');
                } else if (filterType === 'range' && dateRange?.from) {
                    startDate = format(dateRange.from, 'yyyy-MM-dd');
                    endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
                } else if (filterType === 'year') {
                    startDate = `${selectedYear}-01-01`;
                    endDate = `${selectedYear}-12-31`;
                } else {
                    startDate = `${selectedMonth}-01`;
                    const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
                    endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
                }

                // Fetch current period data
                const BATCH_SIZE = 1000;
                const allVentes: any[] = [];
                let offset = 0;
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('ventes_mandataires')
                        .select(`
                            *,
                            mandataires:mandataire_id (id, nom)
                        `)
                        .gte('date', startDate)
                        .lte('date', endDate)
                        .range(offset, offset + BATCH_SIZE - 1)
                        .order('date', { ascending: false });

                    if (error) {
                        console.error('Batch error:', error);
                        break;
                    }

                    if (data && data.length > 0) {
                        allVentes.push(...data);
                        hasMore = data.length === BATCH_SIZE;
                        offset += BATCH_SIZE;
                    } else {
                        hasMore = false;
                    }
                }

                // Calculate tonnage
                const calculateTonnage = (v: any) => {
                    const recharges = (v.r_b6 || 0) * 6 + (v.r_b12 || 0) * 12.5 + (v.r_b28 || 0) * 28 + (v.r_b38 || 0) * 38 + (v.r_b11_carbu || 0) * 12.5;
                    const consignes = (v.c_b6 || 0) * 6 + (v.c_b12 || 0) * 12.5 + (v.c_b28 || 0) * 28 + (v.c_b38 || 0) * 38 + (v.c_b11_carbu || 0) * 12.5;
                    return recharges + consignes;
                };

                const currentTotal = allVentes.reduce((sum, v) => sum + calculateTonnage(v), 0);
                setTotalTonnage(currentTotal);

                // Group by mandataire
                const mandataireMap = new Map<string, { id: string; nom: string; tonnage: number }>();
                allVentes.forEach(v => {
                    const mandataire = v.mandataires as any;
                    if (mandataire) {
                        const key = mandataire.id;
                        const existing = mandataireMap.get(key);
                        const tonnage = calculateTonnage(v);
                        if (existing) {
                            existing.tonnage += tonnage;
                        } else {
                            mandataireMap.set(key, { id: mandataire.id, nom: mandataire.nom, tonnage });
                        }
                    }
                });

                const totalTonnage = Array.from(mandataireMap.values()).reduce((sum, m) => sum + m.tonnage, 0);
                const mandataireStatsArray = Array.from(mandataireMap.values())
                    .map(m => ({
                        ...m,
                        percentage: totalTonnage > 0 ? (m.tonnage / totalTonnage) * 100 : 0
                    }))
                    .sort((a, b) => b.tonnage - a.tonnage)
                    .slice(0, 10); // Top 10 mandataires

                setMandataireStats(mandataireStatsArray);

                // Calculate variation vs previous period
                let prevQuery: any = supabase.from('ventes_mandataires').select('*');

                if (filterType === 'month') {
                    const [y, m] = selectedMonth.split('-').map(Number);
                    const prevDate = subMonths(new Date(y, m - 1, 1), 1);
                    const prevStartDate = format(startOfMonth(prevDate), 'yyyy-MM-dd');
                    const prevEndDate = format(endOfMonthFn(prevDate), 'yyyy-MM-dd');
                    prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
                } else if (filterType === 'date' && selectedDate) {
                    const prevDate = subDays(selectedDate, 1);
                    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
                    prevQuery = prevQuery.eq('date', prevDateStr);
                } else if (filterType === 'range' && dateRange?.from) {
                    const from = dateRange.from;
                    const to = dateRange.to || dateRange.from;
                    const daysDiff = differenceInDays(to, from) + 1;
                    const prevTo = subDays(from, 1);
                    const prevFrom = subDays(prevTo, daysDiff - 1);
                    const prevFromStr = format(prevFrom, 'yyyy-MM-dd');
                    const prevToStr = format(prevTo, 'yyyy-MM-dd');
                    prevQuery = prevQuery.gte('date', prevFromStr).lte('date', prevToStr);
                } else if (filterType === 'year') {
                    const prevYear = selectedYear - 1;
                    const prevStartDate = `${prevYear}-01-01`;
                    const prevEndDate = `${prevYear}-12-31`;
                    prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate);
                }

                const { data: prevData } = await prevQuery;

                if (prevData && prevData.length > 0) {
                    const prevTotal = prevData.reduce((sum: number, v: any) => {
                        const recharges = (v.r_b6 || 0) * 6 + (v.r_b12 || 0) * 12.5 + (v.r_b28 || 0) * 28 + (v.r_b38 || 0) * 38 + (v.r_b11_carbu || 0) * 12.5;
                        const consignes = (v.c_b6 || 0) * 6 + (v.c_b12 || 0) * 12.5 + (v.c_b28 || 0) * 28 + (v.c_b38 || 0) * 38 + (v.c_b11_carbu || 0) * 12.5;
                        return sum + recharges + consignes;
                    }, 0);
                    const variation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
                    setVariationPct(variation);
                } else {
                    setVariationPct(0);
                }
            } catch (error) {
                console.error('Error fetching distribution data:', error);
            }
        };

        fetchDistributionData();
    }, [filterType, selectedMonth, selectedDate, dateRange, selectedYear]);

    const formatNumber = (num: number) => {
        return num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Dashboard Distribution</h2>
                    <p className="text-muted-foreground">Suivi des mandataires, destinations et livraisons</p>
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

                    {filterType === 'year' && (
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Distribution Globales Section Wrapper for Export */}
            <div ref={distributionGlobalesRef} id="distribution-globales" className="space-y-4 p-2 bg-background/50 rounded-xl">
                {/* Distribution Globales - Total */}
                <Card className="bg-orange-50/30 border-orange-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Distribution Globales
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsImage(distributionGlobalesRef, 'distribution-globales')}
                                    className="h-8"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Image
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsPDF(distributionGlobalesRef, 'distribution-globales')}
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
                            <p className="text-sm text-muted-foreground uppercase font-bold mb-1">Cumul des ventes par mandataire</p>
                            <p className="text-3xl font-extrabold text-primary">{formatNumber(totalTonnage)} Kg</p>
                            <div className={cn("flex items-center justify-center text-xs font-medium mt-1", variationPct >= 0 ? "text-green-600" : "text-red-600")}>
                                {variationPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {Math.abs(variationPct).toFixed(1)}% vs période préc.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Répartition par Mandataire */}
                <Card className="border-orange-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-orange-600" />
                            Répartition par Mandataire (Top 10)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {mandataireStats.length === 0 ? (
                                <p className="text-center py-4 text-muted-foreground">Aucune donnée pour cette période</p>
                            ) : (
                                mandataireStats.map((mandataire) => (
                                    <div key={mandataire.id} className="p-2 bg-orange-50/50 rounded-lg border border-orange-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{mandataire.nom}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-extrabold text-orange-600">{formatNumber(mandataire.tonnage)} Kg</span>
                                                <span className="text-muted-foreground">|</span>
                                                <span className="text-sm font-bold text-foreground">{mandataire.percentage.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ventes par Mandataire & Destinations */}
            <VentesParMandataireTable
                startDate={getStartDate()}
                endDate={getEndDate()}
            />
        </div>
    );
};

export default DistributionView;
