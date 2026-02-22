import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { History, Search, CalendarIcon, Filter, X } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
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
    const [tonnageOp, setTonnageOp] = useState<'none' | 'lt' | 'gt' | 'eq'>('none');
    const [tonnageValue, setTonnageValue] = useState('');

    const filtered = useMemo(() => {
        return demandes
            .filter(d => {
                // Recherche immatriculation / chauffeur / bon
                if (search) {
                    const q = search.toLowerCase();
                    if (
                        !d.immatriculation_tracteur.toLowerCase().includes(q) &&
                        !d.immatriculation_citerne.toLowerCase().includes(q) &&
                        !(d.nom_chauffeur || '').toLowerCase().includes(q) &&
                        !(d.numero_bon || '').toLowerCase().includes(q)
                    ) return false;
                }
                // Statut
                if (statusFilter !== 'all' && d.statut !== statusFilter) return false;
                // Plage de dates
                const date = parseISO(d.date_chargement);
                if (dateFrom && date < startOfDay(dateFrom)) return false;
                if (dateTo && date > endOfDay(dateTo)) return false;
                // Tonnage
                if (tonnageOp !== 'none' && tonnageValue) {
                    const target = parseFloat(tonnageValue);
                    if (!isNaN(target)) {
                        const t = d.tonnage_charge || 0;
                        if (tonnageOp === 'lt' && t >= target) return false;
                        if (tonnageOp === 'gt' && t <= target) return false;
                        if (tonnageOp === 'eq' && Math.round(t) !== Math.round(target)) return false;
                    }
                }
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [demandes, search, statusFilter, dateFrom, dateTo, tonnageOp, tonnageValue]);

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setDateFrom(undefined);
        setDateTo(undefined);
        setTonnageOp('none');
        setTonnageValue('');
    };

    const hasFilters = search || statusFilter !== 'all' || dateFrom || dateTo || (tonnageOp !== 'none' && tonnageValue);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="w-5 h-5 text-muted-foreground" />
                        Historique
                    </CardTitle>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                            <X className="w-3 h-3" />
                            Effacer les filtres
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Filtres — une seule ligne */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Immatriculation, chauffeur..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                {dateFrom ? format(dateFrom, 'dd/MM/yy', { locale: fr }) : 'Du'}
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
                                {dateTo ? format(dateTo, 'dd/MM/yy', { locale: fr }) : 'Au'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} />
                        </PopoverContent>
                    </Popover>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                        <SelectTrigger className="w-[130px] h-9">
                            <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="en_attente">En attente</SelectItem>
                            <SelectItem value="charge">Chargé</SelectItem>
                            <SelectItem value="refusee">Refusée</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Tonnage</span>
                        <Select value={tonnageOp} onValueChange={(v) => setTonnageOp(v as any)}>
                            <SelectTrigger className="w-[60px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">--</SelectItem>
                                <SelectItem value="lt">&lt;</SelectItem>
                                <SelectItem value="gt">&gt;</SelectItem>
                                <SelectItem value="eq">=</SelectItem>
                            </SelectContent>
                        </Select>
                        {tonnageOp !== 'none' && (
                            <Input
                                type="number"
                                placeholder="T"
                                value={tonnageValue}
                                onChange={(e) => setTonnageValue(e.target.value)}
                                className="w-[70px] h-9"
                            />
                        )}
                    </div>
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
                                            {format(parseISO(d.date_chargement), 'dd/MM/yy')}
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
                                                ? `${Math.round(d.tonnage_charge).toLocaleString('fr-FR')} T`
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
