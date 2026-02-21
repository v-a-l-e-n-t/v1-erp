import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VracPasswordGenerator from './VracPasswordGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Users, Building2, Trash2, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { VracClient, VracUser } from '@/types/vrac';

interface VracUserWithClient extends VracUser {
    vrac_clients: VracClient;
}

interface VracAdminGestionTabProps {
    clients: VracClient[];
    onDataChange: () => void;
}

const VracAdminGestionTab: React.FC<VracAdminGestionTabProps> = ({ clients, onDataChange }) => {
    const { toast } = useToast();
    const [users, setUsers] = useState<VracUserWithClient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vrac_users')
            .select('*, vrac_clients(*)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data as VracUserWithClient[]);
        }
        setLoading(false);
    };

    const handleDeleteUser = async (userId: string) => {
        const { error } = await supabase.from('vrac_users').delete().eq('id', userId);
        if (error) {
            toast({ title: 'Erreur', description: "Impossible de supprimer l'utilisateur", variant: 'destructive' });
        } else {
            toast({ title: 'Utilisateur supprimé', description: "L'accès a été révoqué" });
            await loadUsers();
        }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('vrac_users')
            .update({ actif: !currentStatus })
            .eq('id', userId);

        if (error) {
            toast({ title: 'Erreur', description: 'Impossible de modifier le statut', variant: 'destructive' });
        } else {
            toast({
                title: currentStatus ? 'Accès désactivé' : 'Accès réactivé',
                description: currentStatus
                    ? "L'utilisateur ne peut plus se connecter"
                    : "L'utilisateur peut à nouveau se connecter",
            });
            await loadUsers();
        }
    };

    const usersByClient = clients.map(client => ({
        client,
        users: users.filter(u => u.client_id === client.id),
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <VracPasswordGenerator />
                </div>

                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                Chargement...
                            </CardContent>
                        </Card>
                    ) : (
                        usersByClient.map(({ client, users: clientUsers }) => (
                            <Card key={client.id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-primary" />
                                            {client.nom_affichage}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            <Users className="w-3 h-3 mr-1" />
                                            {clientUsers.length}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {clientUsers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            Aucun utilisateur
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
                                                        <TableCell className="font-medium">
                                                            {user.nom || <span className="text-muted-foreground italic">Non défini</span>}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {format(parseISO(user.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {user.last_login
                                                                ? format(parseISO(user.last_login), 'dd/MM/yy HH:mm', { locale: fr })
                                                                : 'Jamais'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.actif ? (
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Actif
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                    Inactif
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => handleToggleUserStatus(user.id, user.actif)}
                                                                    title={user.actif ? 'Désactiver' : 'Réactiver'}
                                                                >
                                                                    <UserX className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Supprimer cet accès ?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Cette action est irréversible. L'utilisateur ne pourra plus se connecter.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
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
        </div>
    );
};

export default VracAdminGestionTab;
