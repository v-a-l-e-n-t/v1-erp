import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Pencil, Trash2, History, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ProductionHistoryProps {
    history: any[];
    loading: boolean;
    filterType: 'all' | 'year' | 'month' | 'period' | 'day';
    setFilterType: (type: 'all' | 'year' | 'month' | 'period' | 'day') => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    shiftFilter: string;
    setShiftFilter: (shift: string) => void;
    ligneFilter: string;
    setLigneFilter: (ligne: string) => void;
    chefFilter: string;
    setChefFilter: (chef: string) => void;
    availableMonths: string[];
    allAgents: any[];
    onEdit: (shiftId: string) => void;
    onDelete: (shiftId: string) => void;
}

const ProductionHistory = ({
    history,
    loading,
    filterType,
    setFilterType,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
    dateRange,
    setDateRange,
    shiftFilter,
    setShiftFilter,
    ligneFilter,
    setLigneFilter,
    chefFilter,
    setChefFilter,
    availableMonths,
    allAgents,
    onEdit,
    onDelete
}: ProductionHistoryProps) => {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [expandedShift, setExpandedShift] = useState<string | null>(null);

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

    // Réinitialiser la page quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, selectedYear, selectedMonth, selectedDate, dateRange, shiftFilter, ligneFilter, chefFilter]);

    // Calcul de la pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return history.slice(startIndex, endIndex);
    }, [history, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(history.length / itemsPerPage);

    const handleDeleteClick = (shiftId: string) => {
        setShiftToDelete(shiftId);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (shiftToDelete) {
            onDelete(shiftToDelete);
            setDeleteConfirmOpen(false);
            setShiftToDelete(null);
        }
    };

    return (
        <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <History className="h-5 w-5" />
                    HISTORIQUE DES SAISIES
                </CardTitle>

                {/* Filters */}
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-semibold">Période</Label>
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
                    </div>

                    {filterType === 'year' && (
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs font-semibold">Année</Label>
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
                        </div>
                    )}

                    {filterType === 'month' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold">Année</Label>
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
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold">Mois</Label>
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
                            </div>
                        </>
                    )}

                    {filterType === 'day' && (
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs font-semibold">Date</Label>
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
                        </div>
                    )}

                    {filterType === 'period' && (
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs font-semibold">Période</Label>
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
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-semibold">Shift</Label>
                        <Select value={shiftFilter} onValueChange={setShiftFilter}>
                            <SelectTrigger className="w-[100px] h-8 text-sm">
                                <SelectValue placeholder="Tous" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="1">Shift 1</SelectItem>
                                <SelectItem value="2">Shift 2</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-semibold">Ligne</Label>
                        <Select value={ligneFilter} onValueChange={setLigneFilter}>
                            <SelectTrigger className="w-[100px] h-8 text-sm">
                                <SelectValue placeholder="Toutes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes</SelectItem>
                                {[1, 2, 3, 4, 5].map(l => (
                                    <SelectItem key={l} value={l.toString()}>Ligne {l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label className="text-xs font-semibold">Agent</Label>
                        <Select value={chefFilter} onValueChange={setChefFilter}>
                            <SelectTrigger className="w-[150px] h-8 text-sm">
                                <SelectValue placeholder="Tous" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                {allAgents.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                        {agent.prenom} {agent.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <div className="px-6 pb-2 pt-4">
                <div className="inline-block px-3 py-1.5 bg-primary/10 text-primary rounded-md font-semibold text-sm">
                    {history.length} résultat{history.length > 1 ? 's' : ''} trouvé{history.length > 1 ? 's' : ''}
                </div>
            </div>

            <CardContent className="pt-2">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Aucune saisie trouvée pour cette période
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 font-semibold">Date</th>
                                    <th className="text-left p-2 font-semibold">Shift</th>
                                    <th className="text-left p-2 font-semibold">Chef de Quart</th>
                                    <th className="text-center p-2 font-semibold">Heure d'arrêt</th>
                                    <th className="text-right p-2 font-semibold">Tonnage (Kg)</th>
                                    <th className="text-right p-2 font-semibold">Recharges</th>
                                    <th className="text-right p-2 font-semibold">Consignes</th>
                                    <th className="text-right p-2 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((shift: any) => {
                                    // Helper to format downtime
                                    const formatDowntime = (minutes: number) => {
                                        if (!minutes) return '-';
                                        const h = Math.floor(minutes / 60);
                                        const m = Math.round(minutes % 60);
                                        if (h === 0) return `${m} min`;
                                        return `${h}h ${m.toString().padStart(2, '0')}`;
                                    };

                                    const isExpanded = expandedShift === shift.id;

                                    return (
                                        <>
                                            <tr key={shift.id} className="border-b hover:bg-muted/50">
                                                <td className="p-2">{format(new Date(shift.date), 'dd/MM/yyyy')}</td>
                                                <td className="p-2">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-medium",
                                                        shift.shift_type === '10h-19h' ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                                    )}>
                                                        {shift.shift_type}
                                                    </span>
                                                </td>
                                                <td className="p-2 font-medium">
                                                    {shift.chef_quart ? `${shift.chef_quart.prenom} ${shift.chef_quart.nom}` : '-'}
                                                </td>
                                                <td className="p-2 text-center text-red-600 font-medium">
                                                    {formatDowntime(shift.temps_arret_total_minutes)}
                                                </td>
                                                <td className="p-2 text-right font-bold">
                                                    {((shift.tonnage_total || 0) * 1000).toLocaleString('fr-FR')}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {shift.cumul_recharges_total?.toLocaleString('fr-FR')}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {shift.cumul_consignes_total?.toLocaleString('fr-FR')}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onEdit(shift.id)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(shift.id)}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && shift.lignes_production && shift.lignes_production.length > 0 && (
                                                <tr key={`${shift.id}-details`} className="bg-muted/30">
                                                    <td colSpan={8} className="p-0">
                                                        <div className="px-8 py-4">
                                                            <h4 className="font-semibold text-sm mb-3">Détails par ligne de production</h4>
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b">
                                                                        <th className="text-left p-2 font-medium">Ligne</th>
                                                                        <th className="text-left p-2 font-medium">Chef de Ligne</th>
                                                                        <th className="text-center p-2 font-medium">Temps d'arrêt</th>
                                                                        <th className="text-right p-2 font-medium">Tonnage (Kg)</th>
                                                                        <th className="text-right p-2 font-medium">Recharges</th>
                                                                        <th className="text-right p-2 font-medium">Consignes</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {shift.lignes_production.map((ligne: any) => (
                                                                        <tr key={ligne.id} className="border-b last:border-0">
                                                                            <td className="p-2">
                                                                                <span className="font-medium">Ligne {ligne.numero_ligne}</span>
                                                                            </td>
                                                                            <td className="p-2">
                                                                                {ligne.chef_ligne ? `${ligne.chef_ligne.prenom} ${ligne.chef_ligne.nom}` : '-'}
                                                                            </td>
                                                                            <td className="p-2 text-center text-red-600">
                                                                                {formatDowntime(ligne.temps_arret_ligne_minutes)}
                                                                            </td>
                                                                            <td className="p-2 text-right font-medium">
                                                                                {((ligne.tonnage_ligne || 0) * 1000).toLocaleString('fr-FR')}
                                                                            </td>
                                                                            <td className="p-2 text-right">
                                                                                {((ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0)).toLocaleString('fr-FR')}
                                                                            </td>
                                                                            <td className="p-2 text-right">
                                                                                {((ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0)).toLocaleString('fr-FR')}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {history.length > 0 && (
                            <div className="flex items-center justify-between p-4 border-t">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Afficher</span>
                                    <Select
                                        value={itemsPerPage.toString()}
                                        onValueChange={(value) => {
                                            setItemsPerPage(Number(value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15">15</SelectItem>
                                            <SelectItem value="30">30</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground">
                                        sur {history.length} entrée{history.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        Premier
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Précédent
                                    </Button>
                                    <span className="text-sm px-4">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Suivant
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Dernier
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div >
                )}
            </CardContent >

            {/* Delete Confirmation Dialog */}
            < Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Êtes-vous sûr de vouloir supprimer cette saisie de production ?</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Cette action est irréversible et supprimera toutes les données associées (lignes, arrêts, etc.).
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </Card >
    );
};

export default ProductionHistory;
