import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VracDemandeChargement } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useVracAuth } from '@/hooks/useVracAuth';
import VracClientHeader from '@/components/vrac/VracClientHeader';
import VracBatchSubmitForm from '@/components/vrac/VracBatchSubmitForm';
import VracClientStatsCards from '@/components/vrac/VracClientStatsCards';
import VracClientActiveRequests from '@/components/vrac/VracClientActiveRequests';
import VracClientHistory from '@/components/vrac/VracClientHistory';

const VracClientPortal: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, isAuthenticated, loading: authLoading, logout } = useVracAuth();

    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);
    const [loading, setLoading] = useState(true);

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
            const today = format(new Date(), 'yyyy-MM-dd');
            const payload = trucks.map(truck => ({
                user_id: session.user_id,
                client_id: session.client_id,
                immatriculation_tracteur: truck.tracteur,
                immatriculation_citerne: truck.citerne,
                nom_chauffeur: truck.chauffeur,
                date_chargement: today,
                statut: 'en_attente',
            }));

            const { error } = await supabase
                .from('vrac_demandes_chargement')
                .insert(payload);

            if (error) throw error;

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

    // Stats
    const stats = {
        total: demandes.length,
        enAttente: demandes.filter(d => d.statut === 'en_attente').length,
        charges: demandes.filter(d => d.statut === 'charge').length,
        refuses: demandes.filter(d => d.statut === 'refusee').length,
        tonnage: demandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
    };

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

            <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
                <VracClientStatsCards
                    total={stats.total}
                    enAttente={stats.enAttente}
                    charges={stats.charges}
                    refuses={stats.refuses}
                    tonnage={stats.tonnage}
                />

                <div className="flex justify-end">
                    <div className="w-full sm:w-auto">
                        <VracBatchSubmitForm onSubmit={handleBatchSubmit} loading={loading} clientNom={session.client_nom} />
                    </div>
                </div>

                <VracClientActiveRequests demandes={demandes} />

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <VracClientHistory demandes={demandes} />
                )}
            </main>
        </div>
    );
};

export default VracClientPortal;
