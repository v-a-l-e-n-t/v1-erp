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
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Administration VRAC</h1>
                            <p className="text-sm text-purple-400">Gestion des accès clients</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/vrac-chargements')}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-8 text-center text-slate-400">
                                    Chargement...
                                </CardContent>
                            </Card>
                        ) : (
                            usersByClient.map(({ client, users: clientUsers }) => (
                                <Card key={client.id} className="bg-slate-800/50 border-slate-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-orange-500" />
                                                {client.nom_affichage}
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                                                <Users className="w-3 h-3 mr-1" />
                                                {clientUsers.length} utilisateur{clientUsers.length > 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {clientUsers.length === 0 ? (
                                            <p className="text-sm text-slate-400 text-center py-4">
                                                Aucun utilisateur pour ce client
                                            </p>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-slate-700 hover:bg-transparent">
                                                        <TableHead className="text-slate-400">Nom</TableHead>
                                                        <TableHead className="text-slate-400">Créé le</TableHead>
                                                        <TableHead className="text-slate-400">Dernière connexion</TableHead>
                                                        <TableHead className="text-slate-400">Statut</TableHead>
                                                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {clientUsers.map(user => (
                                                        <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/30">
                                                            <TableCell className="text-white">
                                                                {user.nom || <span className="text-slate-500 italic">Non défini</span>}
                                                            </TableCell>
                                                            <TableCell className="text-slate-300">
                                                                {format(parseISO(user.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                                            </TableCell>
                                                            <TableCell className="text-slate-300">
                                                                {user.last_login
                                                                    ? format(parseISO(user.last_login), 'dd/MM/yyyy HH:mm', { locale: fr })
                                                                    : <span className="text-slate-500">Jamais</span>
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {user.actif ? (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                                        Actif
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
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
                                                                        className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                                                                        title={user.actif ? 'Désactiver' : 'Réactiver'}
                                                                    >
                                                                        <UserX className="w-4 h-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="text-white">
                                                                                    Supprimer cet accès ?
                                                                                </AlertDialogTitle>
                                                                                <AlertDialogDescription className="text-slate-400">
                                                                                    Cette action est irréversible. L'utilisateur ne pourra plus se connecter.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                                                                    Annuler
                                                                                </AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                                    className="bg-red-500 hover:bg-red-600 text-white"
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
