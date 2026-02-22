import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Truck, Settings, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import VracAdminHeader from '@/components/vrac/VracAdminHeader';
import VracAdminDashboardTab from '@/components/vrac/VracAdminDashboardTab';
import VracAdminChargementsTab from '@/components/vrac/VracAdminChargementsTab';
import VracAdminGestionTab from '@/components/vrac/VracAdminGestionTab';
import type { VracClient, DemandeWithClient } from '@/types/vrac';

const VracAdminPanel: React.FC = () => {
    const { toast } = useToast();
    const [clients, setClients] = useState<VracClient[]>([]);
    const [demandes, setDemandes] = useState<DemandeWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [clientsRes, demandesRes] = await Promise.all([
                supabase.from('vrac_clients').select('*').order('nom_affichage'),
                supabase
                    .from('vrac_demandes_chargement')
                    .select('*, vrac_clients(*)')
                    .order('created_at', { ascending: false }),
            ]);

            if (clientsRes.error) throw clientsRes.error;
            if (demandesRes.error) throw demandesRes.error;

            setClients(clientsRes.data || []);
            setDemandes((demandesRes.data || []) as DemandeWithClient[]);
        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les données',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const today = formatInTimeZone(new Date(), 'Africa/Abidjan', 'yyyy-MM-dd');
    const demandesToday = demandes.filter(d => d.date_chargement === today);

    const handleValidate = async (demandeId: string, tonnage: number, notes?: string): Promise<boolean> => {
        const { error } = await supabase
            .from('vrac_demandes_chargement')
            .update({
                statut: 'charge',
                tonnage_charge: tonnage,
                validated_at: formatInTimeZone(new Date(), 'Africa/Abidjan', "yyyy-MM-dd'T'HH:mm:ssXXX"),
                notes: notes || null,
            })
            .eq('id', demandeId);

        if (error) {
            toast({ title: 'Erreur', description: 'Impossible de valider', variant: 'destructive' });
            return false;
        }

        toast({ title: 'Chargement validé', description: `Tonnage: ${Math.round(tonnage * 1000)} kg` });
        await loadData();
        return true;
    };

    const handleRefuse = async (demandeId: string, motif: string): Promise<boolean> => {
        const { error } = await supabase
            .from('vrac_demandes_chargement')
            .update({
                statut: 'refusee',
                motif_refus: motif,
                refused_at: formatInTimeZone(new Date(), 'Africa/Abidjan', "yyyy-MM-dd'T'HH:mm:ssXXX"),
            })
            .eq('id', demandeId);

        if (error) {
            toast({ title: 'Erreur', description: 'Impossible de refuser', variant: 'destructive' });
            return false;
        }

        toast({ title: 'Demande refusée', description: 'Le motif a été enregistré' });
        await loadData();
        return true;
    };

    if (loading && demandes.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <VracAdminHeader />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <VracAdminHeader onRefresh={loadData} loading={loading} />

            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="dashboard" className="gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="hidden sm:inline">Tableau de bord</span>
                            <span className="sm:hidden">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="chargements" className="gap-2">
                            <Truck className="w-4 h-4" />
                            Chargements
                        </TabsTrigger>
                        <TabsTrigger value="gestion" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Gestion
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard">
                        <VracAdminDashboardTab
                            demandesToday={demandesToday}
                            demandesAll={demandes}
                            onSwitchToChargements={() => setActiveTab('chargements')}
                        />
                    </TabsContent>

                    <TabsContent value="chargements">
                        <VracAdminChargementsTab
                            demandes={demandes}
                            clients={clients}
                            onValidate={handleValidate}
                            onRefuse={handleRefuse}
                        />
                    </TabsContent>

                    <TabsContent value="gestion">
                        <VracAdminGestionTab
                            clients={clients}
                            onDataChange={loadData}
                        />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default VracAdminPanel;
