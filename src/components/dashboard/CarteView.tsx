import { useState, useMemo, useEffect } from 'react';
import { format, endOfMonth, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import CoteDIvoireMap from '@/components/dashboard/CoteDIvoireMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fr } from 'date-fns/locale';

interface CarteViewProps {
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

const CarteView = ({
    dateRange,
    setDateRange,
    filterType,
    setFilterType,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    availableMonths
}: CarteViewProps) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Années disponibles
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    // Mois disponibles pour l'année sélectionnée (pour le filtre mois)
    const availableMonthsForYear = useMemo(() => {
        if (filterType !== 'month') return [];
        return Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            return `${selectedYear}-${String(month).padStart(2, '0')}`;
        }).reverse();
    }, [selectedYear, filterType]);

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

    const getStartDate = (): string => {
        if (filterType === 'all') {
            // Pour 'all', retourner une date très ancienne pour récupérer toutes les données
            return '2000-01-01';
        }
        if (filterType === 'year') return `${selectedYear}-01-01`;
        if (filterType === 'month') return `${selectedMonth}-01`;
        if (filterType === 'day' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'period' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        // Fallback
        return `${selectedMonth}-01`;
    };

    const getEndDate = (): string => {
        if (filterType === 'all') {
            // Pour 'all', retourner une date très future pour récupérer toutes les données
            return '2100-12-31';
        }
        if (filterType === 'year') return `${selectedYear}-12-31`;
        if (filterType === 'month') {
            // Utiliser date-fns pour obtenir le dernier jour du mois de manière fiable
            const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
            return format(endOfMonth(monthDate), 'yyyy-MM-dd');
        }
        if (filterType === 'day' && selectedDate) return format(selectedDate, 'yyyy-MM-dd');
        if (filterType === 'period' && dateRange?.to) return format(dateRange.to, 'yyyy-MM-dd');
        if (filterType === 'period' && dateRange?.from) return format(dateRange.from, 'yyyy-MM-dd');
        // Fallback
        const monthDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());
        return format(endOfMonth(monthDate), 'yyyy-MM-dd');
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Carte des Régions de Livraison</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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

            {/* Carte des zones de livraison */}
            <CoteDIvoireMap
                startDate={getStartDate()}
                endDate={getEndDate()}
            />
        </div>
    );
};

export default CarteView;

