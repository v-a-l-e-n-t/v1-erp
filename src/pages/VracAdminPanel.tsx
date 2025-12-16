import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VracClient, VracUser } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';

import VracPasswordGenerator from '@/components/vrac/VracPasswordGenerator';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Users, Building2, Trash2, Key, Shield, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VracUserWithClient extends VracUser {
    vrac_clients: VracClient;
}

const VracAdminPanel: React.FC = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState<VracClient[]>([]);
    const [users, setUsers] = useState<VracUserWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load clients
            const { data: clientsData, error: clientsError } = await supabase
                .from('vrac_clients')
                .select('*')
                .order('nom_affichage');

            if (clientsError) throw clientsError;
            setClients(clientsData || []);

            // Load users with their clients
            const { data: usersData, error: usersError } = await supabase
                .from('vrac_users')
                .select(`
          *,
          vrac_clients (*)
        `)
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;
            setUsers((usersData || []) as VracUserWithClient[]);
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
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('vrac_users')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: 'Utilisateur supprimé',
                description: 'L\'accès a été révoqué',
            });

            await loadData();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de supprimer l\'utilisateur',
                variant: 'destructive',
            });
        }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('vrac_users')
                .update({ actif: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: currentStatus ? 'Accès désactivé' : 'Accès réactivé',
                description: currentStatus
                    ? 'L\'utilisateur ne peut plus se connecter'
                    : 'L\'utilisateur peut à nouveau se connecter',
            });

            await loadData();
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de modifier le statut',
                variant: 'destructive',
            });
        }
    };

    // Group users by client
    const usersByClient = clients.map(client => ({
        client,
        users: users.filter(u => u.client_id === client.id),
    }));

    const handleInitClients = async () => {
        setLoading(true);
        try {
            const defaultClients = [
                { nom: 'SIMAM', nom_affichage: 'SIMAM CI', champ_sortie_vrac: 'simam', actif: true },
                { nom: 'VIVO', nom_affichage: 'VIVO ENERGY', champ_sortie_vrac: 'vivo', actif: true },
                { nom: 'TOTAL', nom_affichage: 'TOTAL ENERGIES', champ_sortie_vrac: 'total', actif: true },
                { nom: 'PETRO IVOIRE', nom_affichage: 'PETRO IVOIRE', champ_sortie_vrac: 'petro_ivoire', actif: true },
            ];

            const { error } = await supabase
                .from('vrac_clients')
                .insert(defaultClients);

            if (error) throw error;

            toast({
                title: 'Clients initialisés',
                description: 'Les clients par défaut ont été créés avec succès',
            });

            await loadData();
        } catch (error) {
            console.error('Error initializing clients:', error);
            toast({
                title: 'Erreur',
                description: "Impossible d'initialiser les clients",
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Administration VRAC</h1>
                            <p className="text-sm text-muted-foreground">Gestion des accès clients</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/vrac-chargements')}
                    >
                        Voir les chargements
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Password Generator */}
                    <div className="lg:col-span-1">
                        <VracPasswordGenerator />
                    </div>

                    {/* Users by Client */}
                    <div className="lg:col-span-2 space-y-6">
                        {loading ? (
                            <Card>
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    Chargement...
                                </CardContent>
                            </Card>
                        ) : usersByClient.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">Aucun client configuré</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            La base de données des clients VRAC semble vide. Initialisez les clients par défaut pour commencer.
                                        </p>
                                    </div>
                                    <Button onClick={handleInitClients}>
                                        Initialiser les clients par défaut
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            usersByClient.map(({ client, users: clientUsers }) => (
                                <Card key={client.id}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-primary" />
                                                {client.nom_affichage}
                                            </div>
                                            <Badge variant="secondary">
                                                <Users className="w-3 h-3 mr-1" />
                                                {clientUsers.length} utilisateur{clientUsers.length > 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {clientUsers.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                Aucun utilisateur pour ce client
                                            </p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nom</TableHead>
                                                        <TableHead>Créé le</TableHead>
                                                        <TableHead>Dernière connexion</TableHead>
                                                        <TableHead>Statut</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {clientUsers.map(user => (
                                                        <TableRow key={user.id}>
                                                            <TableCell>
                                                                {user.nom || <span className="text-muted-foreground italic">Non défini</span>}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {format(parseISO(user.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {user.last_login
                                                                    ? format(parseISO(user.last_login), 'dd/MM/yyyy HH:mm', { locale: fr })
                                                                    : <span className="text-muted-foreground">Jamais</span>
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {user.actif ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">
                                                                        Actif
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
                                                                        Inactif
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleToggleUserStatus(user.id, user.actif)}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-100"
                                                                        title={user.actif ? 'Désactiver' : 'Réactiver'}
                                                                    >
                                                                        <UserX className="w-4 h-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>
                                                                                    Supprimer cet accès ?
                                                                                </AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    Cette action est irréversible. L'utilisateur ne pourra plus se connecter.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>
                                                                                    Annuler
                                                                                </AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                                >
                                                                                    Supprimer
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VracAdminPanel;
