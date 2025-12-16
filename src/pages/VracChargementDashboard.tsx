import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { VracDemandeChargement, VracClient } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';

import VracChargementValidation from '@/components/vrac/VracChargementValidation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    Truck,
    CalendarIcon,
    Search,
    Filter,
    CheckCircle,
    Clock,
    RefreshCw,
    Weight,
    Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemandeWithClient extends VracDemandeChargement {
    vrac_clients: VracClient;
}

const VracChargementDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [demandes, setDemandes] = useState<DemandeWithClient[]>([]);
    const [clients, setClients] = useState<VracClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'charge'>('all');
    const [validationDemande, setValidationDemande] = useState<VracDemandeChargement | null>(null);
    const [validationOpen, setValidationOpen] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');

            // Load clients
            const { data: clientsData } = await supabase
                .from('vrac_clients')
                .select('*')
                .eq('actif', true)
                .order('nom_affichage');

            setClients(clientsData || []);

            // Load demandes for selected date
            const { data: demandesData, error } = await supabase
                .from('vrac_demandes_chargement')
                .select(`
          *,
          vrac_clients (*)
        `)
                .eq('date_chargement', dateStr)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setDemandes((demandesData || []) as DemandeWithClient[]);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les données',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [selectedDate, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleValidate = async (demandeId: string, tonnage: number, notes?: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('vrac_demandes_chargement')
                .update({
                    statut: 'charge',
                    tonnage_charge: tonnage,
                    notes: notes,
                    validated_at: new Date().toISOString(),
                })
                .eq('id', demandeId);

            if (error) throw error;

            toast({
                title: 'Chargement validé',
                description: `Tonnage de ${tonnage} T enregistré`,
            });

            await loadData();
            return true;
        } catch (error) {
            console.error('Error validating:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de valider le chargement',
                variant: 'destructive',
            });
            return false;
        }
    };

    const openValidation = (demande: VracDemandeChargement) => {
        setValidationDemande(demande);
        setValidationOpen(true);
    };

    // Filter demandes
    const filteredDemandes = demandes.filter(d => {
        const matchesSearch =
            d.immatriculation_tracteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.immatriculation_citerne.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.numero_bon?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesClient = clientFilter === 'all' || d.client_id === clientFilter;
        const matchesStatus = statusFilter === 'all' || d.statut === statusFilter;

        return matchesSearch && matchesClient && matchesStatus;
    });

    // Stats
    const stats = {
        total: demandes.length,
        enAttente: demandes.filter(d => d.statut === 'en_attente').length,
        charges: demandes.filter(d => d.statut === 'charge').length,
        tonnageTotal: demandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard')}
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                            <Weight className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Chargements VRAC</h1>
                            <p className="text-sm text-emerald-400">Validation des tonnages</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/vrac-admin')}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Administration
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={loadData}
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Truck className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                                    <p className="text-xs text-slate-400">Total camions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <Clock className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.enAttente}</p>
                                    <p className="text-xs text-slate-400">En attente</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.charges}</p>
                                    <p className="text-xs text-slate-400">Chargés</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Weight className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.tonnageTotal.toFixed(1)}</p>
                                    <p className="text-xs text-slate-400">Tonnes total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4">
                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-48 justify-start text-left font-normal bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(d) => d && setSelectedDate(d)}
                                        locale={fr}
                                        className="bg-slate-800"
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Search */}
                            <div className="relative flex-1 min-w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>

                            {/* Client Filter */}
                            <Select value={clientFilter} onValueChange={setClientFilter}>
                                <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600 text-white">
                                    <Building2 className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Client" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all">Tous les clients</SelectItem>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.nom_affichage}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'en_attente' | 'charge')}>
                                <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="en_attente">En attente</SelectItem>
                                    <SelectItem value="charge">Chargé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Demandes Table */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Truck className="w-5 h-5 text-orange-500" />
                            Camions du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })} ({filteredDemandes.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-slate-400">Chargement...</div>
                        ) : filteredDemandes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                Aucun camion pour cette date
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700 hover:bg-transparent">
                                            <TableHead className="text-slate-400">Client</TableHead>
                                            <TableHead className="text-slate-400">Tracteur</TableHead>
                                            <TableHead className="text-slate-400">Citerne</TableHead>
                                            <TableHead className="text-slate-400">N° Bon</TableHead>
                                            <TableHead className="text-slate-400">Statut</TableHead>
                                            <TableHead className="text-slate-400 text-right">Tonnage</TableHead>
                                            <TableHead className="text-slate-400 text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDemandes.map((demande) => (
                                            <TableRow key={demande.id} className="border-slate-700 hover:bg-slate-700/30">
                                                <TableCell>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                        {demande.vrac_clients?.nom_affichage || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-white font-mono">
                                                    {demande.immatriculation_tracteur}
                                                </TableCell>
                                                <TableCell className="text-white font-mono">
                                                    {demande.immatriculation_citerne}
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    {demande.numero_bon || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {demande.statut === 'charge' ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Chargé
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            En attente
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-white font-semibold">
                                                    {demande.tonnage_charge ? `${demande.tonnage_charge.toFixed(2)} T` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {demande.statut === 'en_attente' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openValidation(demande)}
                                                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                                                        >
                                                            <Weight className="w-4 h-4 mr-1" />
                                                            Valider
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Validation Modal */}
            <VracChargementValidation
                demande={validationDemande}
                open={validationOpen}
                onOpenChange={setValidationOpen}
                onValidate={handleValidate}
            />
        </div>
    );
};

export default VracChargementDashboard;
