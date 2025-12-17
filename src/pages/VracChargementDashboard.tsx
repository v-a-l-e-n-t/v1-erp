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

import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, addDays } from 'date-fns';

// ... (keep usage of other imports)

const VracChargementDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [demandes, setDemandes] = useState<DemandeWithClient[]>([]);
    const [clients, setClients] = useState<VracClient[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to current month
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'charge'>('all');
    const [validationDemande, setValidationDemande] = useState<VracDemandeChargement | null>(null);
    const [validationOpen, setValidationOpen] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load clients
            const { data: clientsData } = await supabase
                .from('vrac_clients')
                .select('*')
                .eq('actif', true)
                .order('nom_affichage');

            setClients(clientsData || []);

            // Prepare date filter
            let query = supabase
                .from('vrac_demandes_chargement')
                .select(`
                  *,
                  vrac_clients (*)
                `)
                .order('created_at', { ascending: true });

            if (dateRange?.from) {
                const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;

                query = query
                    .gte('date_chargement', fromStr)
                    .lte('date_chargement', toStr);
            }

            const { data: demandesData, error } = await query;

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
    }, [dateRange, toast]);

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

        const matchesStatus = statusFilter === 'all' || d.statut === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: demandes.length,
        enAttente: demandes.filter(d => d.statut === 'en_attente').length,
        charges: demandes.filter(d => d.statut === 'charge').length,
        tonnageTotal: demandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Weight className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Chargements VRAC</h1>
                            <p className="text-xs text-muted-foreground">Suivi temps réel</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* User Info moved here */}
                        <div className="hidden md:flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full border border-border/50 mr-2">
                            <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Building2 className="w-3 h-3" />
                            </span>
                            <span className="text-sm font-medium text-foreground">
                                {localStorage.getItem('user_name') || 'Administrateur'}
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => navigate('/vrac-admin')}
                            className="hidden sm:flex"
                        >
                            Administration
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={loadData}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <Truck className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                                    <p className="text-xs text-muted-foreground">Total camions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.enAttente}</p>
                                    <p className="text-xs text-muted-foreground">En attente</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.charges}</p>
                                    <p className="text-xs text-muted-foreground">Chargés</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <Weight className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.tonnageTotal.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Tonnes total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4">
                            {/* Date Range Picker with Presets */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-[260px] justify-start text-left font-normal",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "d MMM", { locale: fr })} -{" "}
                                                        {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "PPP", { locale: fr })
                                                )
                                            ) : (
                                                <span>Choisir une période</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="p-3 border-b sm:border-b-0 sm:border-r space-y-2 flex flex-col">
                                                <h4 className="font-medium text-sm mb-1 px-1">Rapide</h4>
                                                <Button
                                                    variant="ghost"
                                                    className="justify-start h-8 px-2 text-sm font-normal"
                                                    onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                                                >
                                                    Aujourd'hui
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="justify-start h-8 px-2 text-sm font-normal"
                                                    onClick={() => setDateRange({
                                                        from: startOfMonth(new Date()),
                                                        to: endOfMonth(new Date())
                                                    })}
                                                >
                                                    Ce Mois
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="justify-start h-8 px-2 text-sm font-normal"
                                                    onClick={() => setDateRange({
                                                        from: startOfYear(new Date()),
                                                        to: endOfYear(new Date())
                                                    })}
                                                >
                                                    Cette Année
                                                </Button>
                                                <div className="h-px bg-border my-2" />
                                                <Button
                                                    variant="ghost"
                                                    className="justify-start h-8 px-2 text-sm font-normal"
                                                    onClick={() => setDateRange({
                                                        from: subDays(new Date(), 7),
                                                        to: new Date()
                                                    })}
                                                >
                                                    7 derniers jours
                                                </Button>
                                            </div>
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange}
                                                numberOfMonths={1}
                                                locale={fr}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 min-w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher (immatriculation, bon)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                    type="text"
                                />
                            </div>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'en_attente' | 'charge')}>
                                <SelectTrigger className="w-40">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="en_attente">En attente</SelectItem>
                                    <SelectItem value="charge">Chargé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Client Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['SIMAM', 'VIVO', 'TOTAL', 'PETRO IVOIRE'].map((clientName) => {
                        // Find client ID and data
                        const clientData = clients.find(c => c.nom === clientName);
                        if (!clientData) return null;

                        // Filter demandes for this client
                        const clientDemandes = filteredDemandes.filter(d => d.client_id === clientData.id);
                        const pendingDemandes = clientDemandes.filter(d => d.statut === 'en_attente');
                        const historyDemandes = clientDemandes
                            .filter(d => d.statut === 'charge')
                            .slice(0, 5); // Take only last 5

                        // Logo mapping
                        const logoMap: Record<string, string> = {
                            'SIMAM': '/images/logo-simam.png',
                            'VIVO': '/images/logo-vivo.png',
                            'TOTAL': '/images/logo-total.png',
                            'PETRO IVOIRE': '/images/logo-petro.png'
                        };

                        // Specific styling for logos - user requested larger logos for Vivo/Petro
                        const isLargeLogo = ['VIVO', 'PETRO IVOIRE'].includes(clientName);

                        return (
                            <Card key={clientName} className="flex flex-col h-full border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className={cn(
                                                "bg-white p-2 rounded-lg border border-border flex items-center justify-center overflow-hidden transition-all",
                                                isLargeLogo ? "h-24 w-48" : "h-20 w-40"
                                            )}>
                                                <img
                                                    src={logoMap[clientName]}
                                                    alt={clientName}
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                {/* Client Name removed as requested, keeping only camion count */}
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    {clientDemandes.length} camion{clientDemandes.length > 1 ? 's' : ''} jour
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-0">
                                    <div className="grid grid-rows-[1fr_auto] h-full">
                                        {/* Pending Section */}
                                        <div className="p-4 bg-amber-50/30">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                À Charger ({pendingDemandes.length})
                                            </h4>

                                            {pendingDemandes.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic text-center py-2">
                                                    Aucun camion en attente
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {pendingDemandes.map(d => (
                                                        <div key={d.id} className="bg-white border border-amber-100 rounded-lg p-3 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold text-foreground">{d.immatriculation_tracteur}</span>
                                                                    <span className="text-muted-foreground text-xs">/ {d.immatriculation_citerne}</span>
                                                                </div>
                                                                {d.numero_bon && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">Bon: {d.numero_bon}</p>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openValidation(d)}
                                                                className="h-8 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20"
                                                            >
                                                                Valider
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* History Section */}
                                        <div className="p-4 border-t border-border/50">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Derniers chargements
                                            </h4>

                                            {historyDemandes.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic text-center py-2">
                                                    Aucun historique aujourd'hui
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {historyDemandes.map(d => (
                                                        <div key={d.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                                            <span className="font-mono text-muted-foreground">{d.immatriculation_tracteur}</span>
                                                            <div className="flex items-center">
                                                                <span className="font-bold text-emerald-600 mr-2">{d.tonnage_charge?.toFixed(2)} T</span>
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
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
