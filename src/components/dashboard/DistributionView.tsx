import { useState } from 'react';
import { format, endOfMonth, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import VentesParMandataireTable from '@/components/dashboard/VentesParMandataireTable';
import MandatairesVentesHistory from '@/components/dashboard/MandatairesVentesHistory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fr } from 'date-fns/locale';

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

    const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

    const getStartDate = () => {
        if (filterType === 'month') return `${selectedMonth}-01`;
        if (filterType === 'date' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        return `${selectedMonth}-01`;
    };

    const getEndDate = () => {
        if (filterType === 'month') {
            // Utiliser date-fns pour obtenir le dernier jour du mois de manière fiable
            const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
            return format(endOfMonth(monthDate), 'yyyy-MM-dd');
        }
        if (filterType === 'date' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.to) return format(dateRange.to, 'yyyy-MM-dd');
        if (filterType === 'range' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        // Fallback pour le mois par défaut
        const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
        return format(endOfMonth(monthDate), 'yyyy-MM-dd');
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

            {/* Ventes par Mandataire & Destinations */}
            <VentesParMandataireTable
                startDate={getStartDate()}
                endDate={getEndDate()}
            />

            {/* Ventes par mandataire - Collapsible */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <div
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                >
                    <div>
                        <h2 className="text-2xl font-bold">Ventes par mandataire</h2>
                        <p className="text-muted-foreground text-sm">Journal complet des opérations de vente</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                        {isHistoryExpanded ? (
                            <ChevronUp className="h-6 w-6" />
                        ) : (
                            <ChevronDown className="h-6 w-6" />
                        )}
                    </Button>
                </div>
                {isHistoryExpanded && (
                    <div className="px-6 pb-6 border-t pt-6">
                        <MandatairesVentesHistory />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DistributionView;
