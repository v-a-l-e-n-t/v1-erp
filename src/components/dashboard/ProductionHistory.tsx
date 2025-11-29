import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Pencil, Trash2, History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ProductionHistoryProps {
    history: any[];
    loading: boolean;
    filterType: 'all' | 'month' | 'date' | 'range';
    setFilterType: (type: 'all' | 'month' | 'date' | 'range') => void;
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
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={filterType} onValueChange={(value: 'all' | 'month' | 'date' | 'range') => setFilterType(value)}>
                        <SelectTrigger className="w-[130px] h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les dates</SelectItem>
                            <SelectItem value="month">Par mois</SelectItem>
                            <SelectItem value="date">Par date</SelectItem>
                            <SelectItem value="range">Par période</SelectItem>
                        </SelectContent>
                    </Select>

                    {filterType === 'month' && (
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[150px] h-8 text-sm">
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
                                <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal h-8 text-sm", !selectedDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={fr} disabled={{ after: new Date() }} />
                            </PopoverContent>
                        </Popover>
                    )}

                    {filterType === 'range' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal h-8 text-sm", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}` : format(dateRange.from, "dd/MM/yyyy")) : "Période"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} locale={fr} disabled={{ after: new Date() }} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    )}

                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                        <SelectTrigger className="w-[100px] h-8 text-sm">
                            <SelectValue placeholder="Shift" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="1">Shift 1</SelectItem>
                            <SelectItem value="2">Shift 2</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={ligneFilter} onValueChange={setLigneFilter}>
                        <SelectTrigger className="w-[100px] h-8 text-sm">
                            <SelectValue placeholder="Ligne" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes</SelectItem>
                            {[1, 2, 3, 4, 5].map(l => (
                                <SelectItem key={l} value={l.toString()}>Ligne {l}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={chefFilter} onValueChange={setChefFilter}>
                        <SelectTrigger className="w-[150px] h-8 text-sm">
                            <SelectValue placeholder="Chef" />
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
            </CardHeader>

            <div className="px-6 pb-2 text-sm text-muted-foreground">
                {history.length} résultat{history.length > 1 ? 's' : ''} trouvé{history.length > 1 ? 's' : ''}
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
                                    <th className="text-right p-2 font-semibold">Tonnage</th>
                                    <th className="text-right p-2 font-semibold">Recharges</th>
                                    <th className="text-right p-2 font-semibold">Consignes</th>
                                    <th className="text-right p-2 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((shift: any) => (
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
                                        <td className="p-2 text-right font-bold">
                                            {((shift.tonnage_total || 0) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
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
                                ))}
                            </tbody>
                        </table>
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
