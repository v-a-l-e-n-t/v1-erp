import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useVracAuth } from '@/hooks/useVracAuth';
import { VracDemandeChargement, VracDemandeFormData, VracStats } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';

import VracLoginForm from '@/components/vrac/VracLoginForm';
import VracDemandeForm from '@/components/vrac/VracDemandeForm';
import VracDemandesList from '@/components/vrac/VracDemandesList';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Truck, Clock, CheckCircle, TrendingUp, CalendarDays } from 'lucide-react';

const VracClientPortal: React.FC = () => {
    const { session, isAuthenticated, logout, loading: authLoading } = useVracAuth();
    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);
    const [stats, setStats] = useState<VracStats>({
        total_demandes_jour: 0,
        demandes_en_attente: 0,
        demandes_chargees: 0,
        tonnage_total_jour: 0
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const loadDemandes = useCallback(async () => {
        if (!session) return;

        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Load all demandes for this client
            const { data, error } = await supabase
                .from('vrac_demandes_chargement')
                .select('*')
                .eq('client_id', session.client_id)
                .order('date_chargement', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const allDemandes = (data || []) as VracDemandeChargement[];
            setDemandes(allDemandes);

            // Calculate stats for today
            const todayDemandes = allDemandes.filter(d => d.date_chargement === today);
            setStats({
                total_demandes_jour: todayDemandes.length,
                demandes_en_attente: todayDemandes.filter(d => d.statut === 'en_attente').length,
                demandes_chargees: todayDemandes.filter(d => d.statut === 'charge').length,
                tonnage_total_jour: todayDemandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
            });
        } catch (error) {
            console.error('Error loading demandes:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les demandes',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [session, toast]);

    useEffect(() => {
        if (isAuthenticated) {
            loadDemandes();
        }
    }, [isAuthenticated, loadDemandes]);

    const handleSubmitDemande = async (data: VracDemandeFormData): Promise<boolean> => {
        if (!session) return false;

        try {
            const { error } = await supabase.from('vrac_demandes_chargement').insert({
                client_id: session.client_id,
                user_id: session.user_id,
                date_chargement: data.date_chargement,
                immatriculation_tracteur: data.immatriculation_tracteur,
                immatriculation_citerne: data.immatriculation_citerne,
                numero_bon: data.numero_bon || null,
            });

            if (error) throw error;

            toast({
                title: 'Camion ajouté',
                description: `${data.immatriculation_tracteur} a été ajouté à la liste`,
            });

            await loadDemandes();
            return true;
        } catch (error) {
            console.error('Error submitting demande:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible d\'ajouter le camion',
                variant: 'destructive',
            });
            return false;
        }
    };

    const handleDeleteDemande = async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('vrac_demandes_chargement')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Camion supprimé',
                description: 'La demande a été supprimée',
            });

            await loadDemandes();
        } catch (error) {
            console.error('Error deleting demande:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de supprimer la demande',
                variant: 'destructive',
            });
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-muted-foreground">Chargement...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <VracLoginForm onLoginSuccess={loadDemandes} />;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayDemandes = demandes.filter(d => d.date_chargement === today);
    const historyDemandes = demandes.filter(d => d.date_chargement !== today);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Espace VRAC</h1>
                            <p className="text-sm text-muted-foreground">{session?.client_nom_affichage}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <CalendarDays className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.total_demandes_jour}</p>
                                    <p className="text-xs text-muted-foreground">Camions aujourd'hui</p>
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
                                    <p className="text-2xl font-bold text-foreground">{stats.demandes_en_attente}</p>
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
                                    <p className="text-2xl font-bold text-foreground">{stats.demandes_chargees}</p>
                                    <p className="text-xs text-muted-foreground">Chargés</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.tonnage_total_jour.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Tonnes chargées</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <VracDemandeForm onSubmit={handleSubmitDemande} loading={loading} />
                    </div>

                    {/* Tabs: Today / History */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="today" className="w-full">
                            <TabsList className="w-full mb-4">
                                <TabsTrigger value="today" className="flex-1">
                                    Aujourd'hui ({todayDemandes.length})
                                </TabsTrigger>
                                <TabsTrigger value="history" className="flex-1">
                                    Historique ({historyDemandes.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="today">
                                <VracDemandesList
                                    demandes={todayDemandes}
                                    onDelete={handleDeleteDemande}
                                    loading={loading}
                                    allowActions={true}
                                />
                            </TabsContent>

                            <TabsContent value="history">
                                <VracDemandesList
                                    demandes={historyDemandes}
                                    loading={loading}
                                    allowActions={false}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VracClientPortal;
