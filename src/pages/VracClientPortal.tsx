import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VracDemandeChargement } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home, History, CalendarIcon } from 'lucide-react';
import {
    format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear,
    startOfDay, endOfDay, isSameDay, isWithinInterval,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { useVracAuth } from '@/hooks/useVracAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import VracClientHeader from '@/components/vrac/VracClientHeader';
import VracBatchSubmitForm from '@/components/vrac/VracBatchSubmitForm';
import VracClientStatsCards from '@/components/vrac/VracClientStatsCards';
import VracClientActiveRequests from '@/components/vrac/VracClientActiveRequests';
import VracClientHistory from '@/components/vrac/VracClientHistory';

type PeriodType = 'all' | 'year' | 'month' | 'range' | 'day';

/** Génère les années à partir de 2026 jusqu'à l'année courante */
function getYearOptions(): string[] {
    const current = new Date().getFullYear();
    const options: string[] = [];
    for (let y = current; y >= 2026; y--) {
        options.push(String(y));
    }
    return options.length > 0 ? options : ['2026'];
}

/** Noms des mois en français */
const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const VracClientPortal: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, isAuthenticated, loading: authLoading, logout } = useVracAuth();

    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtre période Accueil
    const [periodType, setPeriodType] = useState<PeriodType>('day');
    const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
    const [monthYear, setMonthYear] = useState(() => String(new Date().getFullYear()));
    const [monthNum, setMonthNum] = useState(() => String(new Date().getMonth() + 1));
    const [rangeFrom, setRangeFrom] = useState<Date | undefined>();
    const [rangeTo, setRangeTo] = useState<Date | undefined>();
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(() => new Date());

    const yearOptions = useMemo(() => getYearOptions(), []);

    const loadDemandes = useCallback(async (clientId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vrac_demandes_chargement')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setDemandes(data as unknown as VracDemandeChargement[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || !session) {
                navigate('/vrac-login');
            } else {
                loadDemandes(session.client_id);
            }
        }
    }, [isAuthenticated, session, authLoading, navigate, loadDemandes]);

    const handleLogout = () => {
        logout();
        navigate('/vrac-login');
    };

    const handleBatchSubmit = async (trucks: Array<{ tracteur: string; citerne: string; chauffeur: string }>): Promise<boolean> => {
        if (!session) return false;

        try {
            // Utiliser l'heure locale comme date temporaire (pour forcer l'insertion Not Null)
            const fallbackToday = formatInTimeZone(new Date(), 'Africa/Abidjan', 'yyyy-MM-dd');

            const payload = trucks.map(truck => ({
                user_id: session.user_id,
                client_id: session.client_id,
                immatriculation_tracteur: truck.tracteur,
                immatriculation_citerne: truck.citerne,
                nom_chauffeur: truck.chauffeur,
                date_chargement: fallbackToday,
                statut: 'en_attente',
            }));

            // 1. On insère avec notre date temporaire et on récupère les vraies données du serveur (created_at infaillible)
            const { error: insertError, data: insertedData } = await supabase
                .from('vrac_demandes_chargement')
                .insert(payload)
                .select();

            if (insertError) throw insertError;

            // 2. Auto-correction immédiate de "date_chargement" basée sur le vrai "created_at" côté serveur
            if (insertedData) {
                for (const row of insertedData) {
                    const realDate = formatInTimeZone(new Date(row.created_at), 'Africa/Abidjan', 'yyyy-MM-dd');
                    if (row.date_chargement !== realDate) {
                        await supabase.from('vrac_demandes_chargement')
                            .update({ date_chargement: realDate })
                            .eq('id', row.id);
                    }
                }
            }

            toast({
                title: 'Demande envoyée',
                description: `${trucks.length} camion${trucks.length > 1 ? 's' : ''} enregistré${trucks.length > 1 ? 's' : ''} avec succès.`,
            });

            await loadDemandes(session.client_id);
            return true;
        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: error.message || "Impossible d'envoyer la demande",
                variant: 'destructive',
            });
            return false;
        }
    };

    // Filtrage par période pour les stats
    const filteredByPeriod = useMemo(() => {
        if (periodType === 'all') return demandes;

        return demandes.filter(d => {
            const date = parseISO(d.date_chargement);

            if (periodType === 'year') {
                const y = parseInt(selectedYear);
                return isWithinInterval(date, {
                    start: startOfYear(new Date(y, 0, 1)),
                    end: endOfYear(new Date(y, 0, 1)),
                });
            }

            if (periodType === 'month') {
                const y = parseInt(monthYear);
                const m = parseInt(monthNum);
                return isWithinInterval(date, {
                    start: startOfMonth(new Date(y, m - 1)),
                    end: endOfMonth(new Date(y, m - 1)),
                });
            }

            if (periodType === 'range') {
                if (rangeFrom && date < startOfDay(rangeFrom)) return false;
                if (rangeTo && date > endOfDay(rangeTo)) return false;
                return true;
            }

            if (periodType === 'day' && selectedDay) {
                return isSameDay(date, selectedDay);
            }

            return true;
        });
    }, [demandes, periodType, selectedYear, monthYear, monthNum, rangeFrom, rangeTo, selectedDay]);



    // Stats calculées sur la période sélectionnée
    const stats = useMemo(() => ({
        total: filteredByPeriod.length,
        enAttente: filteredByPeriod.filter(d => d.statut === 'en_attente').length,
        charges: filteredByPeriod.filter(d => d.statut === 'charge').length,
        refuses: filteredByPeriod.filter(d => d.statut === 'refusee').length,
        tonnage: filteredByPeriod.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
    }), [filteredByPeriod]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-background">
            <VracClientHeader
                clientName={session.client_nom}
                userName={session.user_nom}
                onLogout={handleLogout}
            />

            <main className="container mx-auto px-4 py-6 max-w-6xl">
                <Tabs defaultValue="accueil" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="accueil" className="gap-1.5">
                            <Home className="w-4 h-4" />
                            Accueil
                        </TabsTrigger>
                        <TabsTrigger value="historique" className="gap-1.5">
                            <History className="w-4 h-4" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== ONGLET ACCUEIL ========== */}
                    <TabsContent value="accueil" className="space-y-6 mt-0">
                        {/* Filtre période */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                                <SelectTrigger className="w-[160px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes périodes</SelectItem>
                                    <SelectItem value="year">Année</SelectItem>
                                    <SelectItem value="month">Mois</SelectItem>
                                    <SelectItem value="range">Période</SelectItem>
                                    <SelectItem value="day">Jour</SelectItem>
                                </SelectContent>
                            </Select>

                            {periodType === 'year' && (
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="w-[110px] h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map(y => (
                                            <SelectItem key={y} value={y}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {periodType === 'month' && (
                                <>
                                    <Select value={monthYear} onValueChange={setMonthYear}>
                                        <SelectTrigger className="w-[110px] h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {yearOptions.map(y => (
                                                <SelectItem key={y} value={y}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={monthNum} onValueChange={setMonthNum}>
                                        <SelectTrigger className="w-[140px] h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MONTH_NAMES.map((name, i) => (
                                                <SelectItem key={i + 1} value={String(i + 1)}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </>
                            )}

                            {periodType === 'range' && (
                                <>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {rangeFrom ? format(rangeFrom, 'dd/MM/yy', { locale: fr }) : 'Du'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={rangeFrom} onSelect={setRangeFrom} locale={fr} />
                                        </PopoverContent>
                                    </Popover>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {rangeTo ? format(rangeTo, 'dd/MM/yy', { locale: fr }) : 'Au'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={rangeTo} onSelect={setRangeTo} locale={fr} />
                                        </PopoverContent>
                                    </Popover>
                                </>
                            )}

                            {periodType === 'day' && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {selectedDay ? format(selectedDay, 'dd/MM/yyyy', { locale: fr }) : 'Choisir un jour'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={selectedDay} onSelect={setSelectedDay} locale={fr} />
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <VracClientStatsCards
                            total={stats.total}
                            enAttente={stats.enAttente}
                            charges={stats.charges}
                            refuses={stats.refuses}
                            tonnage={stats.tonnage}
                        />

                        <div className="flex justify-end">
                            <div className="w-full sm:w-auto">
                                <VracBatchSubmitForm
                                    onSubmit={handleBatchSubmit}
                                    loading={loading}
                                    clientNom={session.client_nom}
                                    clientId={session.client_id}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <VracClientActiveRequests demandes={demandes} />
                        )}
                    </TabsContent>

                    {/* ========== ONGLET HISTORIQUE ========== */}
                    <TabsContent value="historique" className="mt-0">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <VracClientHistory demandes={demandes} />
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default VracClientPortal;
