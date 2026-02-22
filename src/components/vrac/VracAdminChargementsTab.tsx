import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Search, CalendarIcon, Filter, Truck } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import VracStatusBadge from './VracStatusBadge';
import VracChargementValidation from './VracChargementValidation';
import VracRefusalDialog from './VracRefusalDialog';
import VracExportButtons from './VracExportButtons';
import type { DemandeWithClient, VracDemandeChargement, VracClient, DemandeStatut } from '@/types/vrac';

interface VracAdminChargementsTabProps {
    demandes: DemandeWithClient[];
    clients: VracClient[];
    onValidate: (demandeId: string, tonnage: number, notes?: string) => Promise<boolean>;
    onRefuse: (demandeId: string, motif: string) => Promise<boolean>;
}

const logoMap: Record<string, string> = {
    'SIMAM': '/images/logo-simam.png',
    'VIVO_ENERGIES': '/images/logo-vivo.png',
    'TOTAL_ENERGIES': '/images/logo-total.png',
    'PETRO_IVOIRE': '/images/logo-petro.png',
};

const VracAdminChargementsTab: React.FC<VracAdminChargementsTabProps> = ({
    demandes, clients, onValidate, onRefuse,
}) => {
    const [selectedDemande, setSelectedDemande] = useState<VracDemandeChargement | null>(null);
    const [validationOpen, setValidationOpen] = useState(false);
    const [refusalOpen, setRefusalOpen] = useState(false);

    // History filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DemandeStatut>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();

    const pendingByClient = useMemo(() => {
        const pending = demandes.filter(d => d.statut === 'en_attente');
        const grouped = new Map<string, DemandeWithClient[]>();
        pending.forEach(d => {
            const clientId = d.client_id;
            const existing = grouped.get(clientId) || [];
            existing.push(d);
            grouped.set(clientId, existing);
        });
        return grouped;
    }, [demandes]);

    const filteredHistory = useMemo(() => {
        return demandes
            .filter(d => {
                if (search) {
                    const q = search.toLowerCase();
                    if (
                        !d.immatriculation_tracteur.toLowerCase().includes(q) &&
                        !d.immatriculation_citerne.toLowerCase().includes(q) &&
                        !(d.nom_chauffeur || '').toLowerCase().includes(q) &&
                        !(d.numero_bon || '').toLowerCase().includes(q)
                    ) return false;
                }
                if (statusFilter !== 'all' && d.statut !== statusFilter) return false;
                if (clientFilter !== 'all' && d.client_id !== clientFilter) return false;
                const date = parseISO(d.date_chargement);
                if (dateFrom && date < startOfDay(dateFrom)) return false;
                if (dateTo && date > endOfDay(dateTo)) return false;
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [demandes, search, statusFilter, clientFilter, dateFrom, dateTo]);

    const openValidation = (d: VracDemandeChargement) => {
        setSelectedDemande(d);
        setValidationOpen(true);
    };

    const openRefusal = (d: VracDemandeChargement) => {
        setSelectedDemande(d);
        setRefusalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Pending requests by client */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    À traiter
                </h3>
                {pendingByClient.size === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground text-sm">
                            Aucune demande en attente
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {clients.filter(c => pendingByClient.has(c.id)).map(client => {
                            const clientDemandes = pendingByClient.get(client.id) || [];
                            const logo = logoMap[client.nom];
                            return (
                                <Card key={client.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-3 text-sm">
                                            {logo ? (
                                                <img src={logo} alt={client.nom} className="h-6 max-w-[80px] object-contain" />
                                            ) : (
                                                <span>{client.nom_affichage}</span>
                                            )}
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {clientDemandes.length} en attente
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableBody>
                                                {clientDemandes.map(d => (
                                                    <TableRow key={d.id}>
                                                        <TableCell className="font-mono text-sm font-medium">
                                                            {d.immatriculation_tracteur}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                                            {d.immatriculation_citerne}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                                                            {d.nom_chauffeur || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                                    onClick={() => openValidation(d)}
                                                                >
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Valider
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                                                    onClick={() => openRefusal(d)}
                                                                >
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Refuser
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Separator />

            {/* History with filters */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Historique complet
                    </h3>
                    <VracExportButtons demandes={filteredHistory} />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                        <SelectTrigger className="w-[130px] h-9">
                            <Filter className="w-3.5 h-3.5 mr-1" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="en_attente">En attente</SelectItem>
                            <SelectItem value="charge">Chargé</SelectItem>
                            <SelectItem value="refusee">Refusée</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                        <SelectTrigger className="w-[150px] h-9">
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous clients</SelectItem>
                            {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.nom_affichage}</SelectItem>
                            ))}
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

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Tracteur</TableHead>
                                    <TableHead>Citerne</TableHead>
                                    <TableHead>Chauffeur</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Tonnage</TableHead>
                                    <TableHead>Motif</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Aucun résultat
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistory.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell className="text-sm">
                                                {format(parseISO(d.date_chargement), 'dd/MM/yy')}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {d.vrac_clients?.nom_affichage || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{d.immatriculation_tracteur}</TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground">{d.immatriculation_citerne}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{d.nom_chauffeur || '-'}</TableCell>
                                            <TableCell>
                                                <VracStatusBadge status={d.statut} motifRefus={d.motif_refus} />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {d.tonnage_charge
                                                    ? `${Math.round(d.tonnage_charge * 1000).toLocaleString('fr-FR')} kg`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                                {d.motif_refus || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {d.statut === 'en_attente' && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => openValidation(d)}
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Valider
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                                            onClick={() => openRefusal(d)}
                                                        >
                                                            <XCircle className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground text-right mt-2">
                    {filteredHistory.length} résultat{filteredHistory.length > 1 ? 's' : ''}
                </p>
            </div>

            {/* Dialogs */}
            <VracChargementValidation
                demande={selectedDemande}
                open={validationOpen}
                onOpenChange={setValidationOpen}
                onValidate={onValidate}
            />
            <VracRefusalDialog
                demande={selectedDemande}
                open={refusalOpen}
                onOpenChange={setRefusalOpen}
                onRefuse={onRefuse}
            />
        </div>
    );
};

export default VracAdminChargementsTab;
