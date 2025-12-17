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
import { LogOut, Plus, Clock, FileText, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
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

// Local type to match the fetched data structure and injected session info
type ExtendedVracUser = Omit<VracUser, 'vrac_clients'> & {
    vrac_clients: { nom_affichage: string } | null;
    email?: string;
    prenom?: string; // Add if we decide to keep it, but make optional.
};

const VracClientPortal: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [user, setUser] = useState<ExtendedVracUser | null>(null);
    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { logAction } = useAudit();
    const [clientName, setClientName] = useState<string>('Client');

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/vrac-login');
                return;
            }

            // Get Vrac User
            const { data: vracUser, error } = await supabase
                .from('vrac_users')
                .select('*, vrac_clients(nom_affichage)')
                .eq('id', session.user.id)
                .single();

            if (error || !vracUser) {
                console.error('Error fetching vrac user', error);
            } else {
                // Cast the response to match our expected structure since Supabase types might be strict
                const fetchedUser = vracUser as unknown as ExtendedVracUser;

                // Inject email from session
                const userWithEmail: ExtendedVracUser = {
                    ...fetchedUser,
                    email: session.user.email
                };

                setUser(userWithEmail);

                if (fetchedUser.vrac_clients) {
                    setClientName(fetchedUser.vrac_clients.nom_affichage);
                }
                loadDemandes(fetchedUser.id);
            }

        } catch (error) {
            console.error('Auth check error:', error);
            navigate('/vrac-login');
        } finally {
            setLoading(false);
        }
    };

    // Explicit load function taking userId to avoid stale state issues
    const loadDemandes = async (userId: string) => {
        const { data, error } = await supabase
            .from('vrac_demandes_chargement')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Cast strictly typed DB response (string status) to our Frontend Type (Enum status)
            // We assume the DB contains valid values for now.
            setDemandes(data as unknown as VracDemandeChargement[]);
        }
    };


    const handleLogout = async () => {
        await supabase.auth.signOut();
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
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            {/* Logo placeholder */}
                            <span className="text-white font-bold">GPL</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Espace Client</h1>
                            <p className="text-sm text-slate-500">{clientName}</p>
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Mes Demandes de Chargement</h2>
                        <p className="text-slate-500">Suivez l'état de vos programmations</p>
                    </div>

                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
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
                ) : demandes.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Aucune demande</h3>
                            <p className="text-slate-500 max-w-sm mt-2 mb-6">
                                Vous n'avez pas encore effectué de demande de chargement. Commencez par en créer une nouvelle.
                            </p>
                            <Button onClick={() => setIsFormOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Créer une demande
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden border-slate-200 shadow-sm">
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
                                    {demandes.map((demande) => (
                                        <TableRow key={demande.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium">
                                                {format(parseISO(demande.date_chargement), 'dd MMM yyyy', { locale: fr })}
                                            </TableCell>
                                            <TableCell>{demande.numero_bon || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{demande.immatriculation_tracteur}</TableCell>
                                            <TableCell className="font-mono text-xs">{demande.immatriculation_citerne}</TableCell>
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
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default VracClientPortal;
