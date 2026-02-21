import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { History, Search, CalendarIcon, Filter } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import VracStatusBadge from './VracStatusBadge';
import type { VracDemandeChargement, DemandeStatut } from '@/types/vrac';

interface VracClientHistoryProps {
    demandes: VracDemandeChargement[];
}

const VracClientHistory: React.FC<VracClientHistoryProps> = ({ demandes }) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DemandeStatut>('all');
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();

    const filtered = useMemo(() => {
        return demandes
            .filter(d => {
                // Search
                if (search) {
                    const q = search.toLowerCase();
                    if (
                        !d.immatriculation_tracteur.toLowerCase().includes(q) &&
                        !d.immatriculation_citerne.toLowerCase().includes(q) &&
                        !(d.nom_chauffeur || '').toLowerCase().includes(q) &&
                        !(d.numero_bon || '').toLowerCase().includes(q)
                    ) return false;
                }
                // Status
                if (statusFilter !== 'all' && d.statut !== statusFilter) return false;
                // Date range
                const date = parseISO(d.date_chargement);
                if (dateFrom && date < startOfDay(dateFrom)) return false;
                if (dateTo && date > endOfDay(dateTo)) return false;
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [demandes, search, statusFilter, dateFrom, dateTo]);

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setDateFrom(undefined);
        setDateTo(undefined);
    };

    const hasFilters = search || statusFilter !== 'all' || dateFrom || dateTo;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="w-5 h-5 text-muted-foreground" />
                        Historique
                    </CardTitle>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                            Effacer les filtres
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher immatriculation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                        <SelectTrigger className="w-[140px] h-9">
                            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="en_attente">En attente</SelectItem>
                            <SelectItem value="charge">Chargé</SelectItem>
                            <SelectItem value="refusee">Refusée</SelectItem>
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {dateFrom ? format(dateFrom, 'dd/MM', { locale: fr }) : 'Du'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {dateTo ? format(dateTo, 'dd/MM', { locale: fr }) : 'Au'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Tracteur</TableHead>
                                <TableHead>Citerne</TableHead>
                                <TableHead>Chauffeur</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Tonnage</TableHead>
                                <TableHead>Motif</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                        Aucun résultat
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="text-sm">
                                            {format(new Date(d.date_chargement), 'dd/MM/yy')}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-medium">
                                            {d.immatriculation_tracteur}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {d.immatriculation_citerne}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                                            {d.nom_chauffeur || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <VracStatusBadge status={d.statut} motifRefus={d.motif_refus} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {d.tonnage_charge
                                                ? `${Math.round(d.tonnage_charge * 1000).toLocaleString()} kg`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                            {d.motif_refus || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-xs text-muted-foreground text-right">
                    {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                </p>
            </CardContent>
        </Card>
    );
};

export default VracClientHistory;
