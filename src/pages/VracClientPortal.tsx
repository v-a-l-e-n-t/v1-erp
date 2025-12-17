import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VracUser, VracDemandeChargement, VracDemandeFormData } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, Clock, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import VracDemandeForm from '@/components/vrac/VracDemandeForm';
import { useAudit } from "@/hooks/useAudit";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import { useVracAuth } from "@/hooks/useVracAuth";

// Local type to match the fetched data structure and injected session info
// We can simplify this now that we assume useVracAuth is the source of truth for identity
// But looking at existing code, 'user' state is used heavily. I will map hook session to 'user'.

type ExtendedVracUser = Omit<VracUser, 'vrac_clients'> & {
    vrac_clients: { nom_affichage: string } | null;
    email?: string;
    prenom?: string;
};

const VracClientPortal: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, isAuthenticated, loading: authLoading, logout } = useVracAuth();

    // We keep these states for now to minimize refactor risk
    const [user, setUser] = useState<ExtendedVracUser | null>(null);
    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);
    const [loading, setLoading] = useState(true); // Data loading
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { logAction } = useAudit();
    const [clientName, setClientName] = useState<string>('Client');

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || !session) {
                navigate('/vrac-login');
            } else {
                // Initialize user state from session
                const mappedUser: ExtendedVracUser = {
                    id: session.user_id,
                    client_id: session.client_id,
                    nom: session.user_nom,
                    actif: true, // Assumed active if logged in
                    created_at: '', // Not needed for display
                    vrac_clients: { nom_affichage: session.client_nom_affichage },
                    email: session.user_nom // Using name as email/display for now
                };
                setUser(mappedUser);
                setClientName(session.client_nom_affichage);
                loadDemandes(session.user_id);
            }
        }
    }, [isAuthenticated, session, authLoading, navigate]);

    // Explicit load function taking userId to avoid stale state issues
    const loadDemandes = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vrac_demandes_chargement')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setDemandes(data as unknown as VracDemandeChargement[]);
        }
        setLoading(false);
    };

    // Stats calculation
    const stats = {
        total: demandes.length,
        enAttente: demandes.filter(d => d.statut === 'en_attente').length,
        validees: demandes.filter(d => d.statut === 'validee' || d.statut === 'charge' || d.statut === 'terminee').length,
        tonnageTotal: demandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
    };

    const activeDemandes = demandes.filter(d => d.statut === 'en_attente');
    const historyDemandes = demandes.filter(d => d.statut !== 'en_attente');

    const handleLogout = () => {
        logout();
        navigate('/vrac-login');
    };

    const handleSubmitDemande = async (formData: VracDemandeFormData): Promise<boolean> => {
        if (!user) return false;

        try {
            const now = new Date().toISOString();
            const payload = {
                user_id: user.id,
                client_id: user.client_id,
                ...formData,
                date_chargement: formData.date_chargement || now.split('T')[0],
                statut: 'en_attente',
                validated_by: null,
                notes: null,
                last_modified_by: user.email || clientName,
                last_modified_at: now
            };

            const { data: newDemande, error } = await supabase
                .from('vrac_demandes_chargement')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            await logAction({
                table_name: 'vrac_demandes_chargement',
                record_id: newDemande.id,
                action: 'CREATE',
                details: formData
            });

            toast({
                title: 'Demande envoyée',
                description: 'Votre demande de chargement a été enregistrée avec succès.',
            });

            setIsFormOpen(false);
            if (user) loadDemandes(user.id);
            return true;
        } catch (error: any) {
            console.error('Error submitting demande:', error);
            toast({
                title: 'Erreur',
                description: error.message || "Impossible d'envoyer la demande",
                variant: 'destructive',
            });
            return false;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'en_attente':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>;
            case 'validee':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Validée</Badge>;
            case 'refusee':
                return <Badge variant="destructive">Refusée</Badge>;
            case 'terminee':
                return <Badge variant="secondary">Terminée</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <span className="text-white font-bold text-lg">GPL</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Espace Client</h1>
                            <p className="text-sm text-slate-500 font-medium">{clientName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-slate-900">{user?.nom}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter">
                            <LogOut className="w-5 h-5 text-slate-500" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Demandes</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">En Attente</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.enAttente}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Validées / Chargées</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stats.validees}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <FileText className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Volume Total</p>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    {(stats.tonnageTotal * 1000).toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-400">kg</span>
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Tableau de bord</h2>
                        <p className="text-slate-500">Gérez vos demandes et consultez l'historique</p>
                    </div>

                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-4 h-4 mr-2" />
                                Nouvelle Demande
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Nouvelle demande de chargement</DialogTitle>
                                <DialogDescription>
                                    Remplissez les informations du camion et du bon de commande.
                                </DialogDescription>
                            </DialogHeader>
                            <VracDemandeForm
                                onSubmit={handleSubmitDemande}
                                onCancel={() => setIsFormOpen(false)}
                                isDialog={true}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-1 bg-slate-50 border-b border-slate-100 flex gap-1">
                            <Button variant="ghost" className="flex-1 bg-white shadow-sm text-slate-800 font-medium">
                                Demandes en cours ({activeDemandes.length})
                            </Button>
                            {/* Note: Ideally implementation of Tabs component here, simplified for single-file edit context */}
                        </div>

                        {demandes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Aucune demande</h3>
                                <p className="text-slate-500 max-w-sm mt-2 mb-6">
                                    Vous n'avez pas encore effectué de demande de chargement.
                                </p>
                                <Button onClick={() => setIsFormOpen(true)} variant="outline">
                                    Créer la première demande
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {/* Only showing ACTIVE demands first as default view roughly */}
                                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        En cours / À venir
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Date demandée</TableHead>
                                                <TableHead>N° Bon</TableHead>
                                                <TableHead>Tracteur</TableHead>
                                                <TableHead>Citerne</TableHead>
                                                <TableHead>Date demande</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeDemandes.length > 0 ? activeDemandes.map((demande) => (
                                                <TableRow key={demande.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium text-slate-900">
                                                        {format(parseISO(demande.date_chargement), 'dd MMM yyyy', { locale: fr })}
                                                    </TableCell>
                                                    <TableCell>{demande.numero_bon || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded w-fit">{demande.immatriculation_tracteur}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{demande.immatriculation_citerne}</TableCell>
                                                    <TableCell className="text-slate-500 text-xs">
                                                        {format(parseISO(demande.created_at), 'dd/MM/yyyy HH:mm')}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(demande.statut)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <AuditHistoryDialog
                                                                tableName="vrac_demandes_chargement"
                                                                recordId={demande.id}
                                                                recordTitle={`Demande ${demande.numero_bon || 'du ' + demande.date_chargement}`}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 italic">
                                                        Aucune demande en cours
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="px-6 py-4 bg-slate-50/50 border-t border-b border-slate-100 mt-8">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <History className="w-4 h-4 text-slate-400" />
                                        Historique récent
                                    </h3>
                                </div>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>N° Bon</TableHead>
                                                <TableHead>Tracteur</TableHead>
                                                <TableHead>Tonnage Chargé</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historyDemandes.length > 0 ? historyDemandes.map((demande) => (
                                                <TableRow key={demande.id} className="hover:bg-slate-50/50 opacity-90">
                                                    <TableCell className="font-medium text-slate-700">
                                                        {format(parseISO(demande.date_chargement), 'dd MMM yyyy', { locale: fr })}
                                                    </TableCell>
                                                    <TableCell>{demande.numero_bon || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{demande.immatriculation_tracteur}</TableCell>
                                                    <TableCell>
                                                        {demande.tonnage_charge ? (
                                                            <span className="font-bold text-emerald-600">
                                                                {(demande.tonnage_charge * 1000).toLocaleString('fr-FR')} kg
                                                            </span>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(demande.statut)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <AuditHistoryDialog
                                                                tableName="vrac_demandes_chargement"
                                                                recordId={demande.id}
                                                                recordTitle={`Demande ${demande.numero_bon || 'du ' + demande.date_chargement}`}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 italic">
                                                        Aucun historique disponible
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VracClientPortal;
