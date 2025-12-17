import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Trash2, Edit2, Search, Filter, Truck, Check, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VracDemandeChargement, VracClient } from '@/types/vrac';

interface VracDemandesListProps {
    demandes: VracDemandeChargement[];
    onDelete?: (id: string) => Promise<void>;
    onEdit?: (demande: VracDemandeChargement) => void;
    showClient?: boolean;
    allowActions?: boolean;
    loading?: boolean;
    clients?: VracClient[];
    showClientFilter?: boolean;
}

const VracDemandesList: React.FC<VracDemandesListProps> = ({
    demandes,
    onDelete,
    onEdit,
    showClient = false,
    allowActions = true,
    loading = false,
    clients = [],
    showClientFilter = false,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'charge'>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredDemandes = demandes.filter(demande => {
        const matchesSearch =
            demande.immatriculation_tracteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demande.immatriculation_citerne.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (demande.numero_bon?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || demande.statut === statusFilter;
        const matchesClient = !showClientFilter || clientFilter === 'all' || demande.client_id === clientFilter;

        return matchesSearch && matchesStatus && matchesClient;
    });

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        setDeletingId(id);
        await onDelete(id);
        setDeletingId(null);
    };

    const getStatusBadge = (statut: string) => {
        if (statut === 'charge') {
            return (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">
                    <Check className="w-3 h-3 mr-1" />
                    Chargé
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100">
                <Clock className="w-3 h-3 mr-1" />
                En attente
            </Badge>
        );
    };

    return (
        <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Liste des camions ({filteredDemandes.length})
                    </CardTitle>

                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full sm:w-48"
                            />
                        </div>

                        {/* Client Filter */}
                        {showClientFilter && clients.length > 0 && (
                            <Select value={clientFilter} onValueChange={setClientFilter}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Client" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les clients</SelectItem>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.nom_affichage || client.nom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'en_attente' | 'charge')}>
                            <SelectTrigger className="w-full sm:w-40">
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
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Chargement...
                    </div>
                ) : filteredDemandes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Aucun camion trouvé
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    {showClient && <TableHead>Client</TableHead>}
                                    <TableHead>Tracteur</TableHead>
                                    <TableHead>Citerne</TableHead>
                                    <TableHead>N° Bon</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Tonnage</TableHead>
                                    {allowActions && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDemandes.map((demande) => (
                                    <TableRow key={demande.id}>
                                        <TableCell>
                                            {format(parseISO(demande.date_chargement), 'dd/MM/yyyy', { locale: fr })}
                                        </TableCell>
                                        {showClient && (
                                            <TableCell>
                                                {demande.vrac_clients?.nom_affichage || '-'}
                                            </TableCell>
                                        )}
                                        <TableCell className="font-mono font-medium">
                                            {demande.immatriculation_tracteur}
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">
                                            {demande.immatriculation_citerne}
                                        </TableCell>
                                        <TableCell>
                                            {demande.numero_bon || <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(demande.statut)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {demande.tonnage_charge
                                                ? `${(demande.tonnage_charge * 1000).toLocaleString('fr-FR')} kg`
                                                : '-'
                                            }
                                        </TableCell>
                                        {allowActions && (
                                            <TableCell className="text-right">
                                                {demande.statut === 'en_attente' && (
                                                    <div className="flex justify-end gap-2">
                                                        {onEdit && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onEdit(demande)}
                                                                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {onDelete && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                        disabled={deletingId === demande.id}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            Supprimer ce camion ?
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Cette action est irréversible. Le camion {demande.immatriculation_tracteur} sera supprimé.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>
                                                                            Annuler
                                                                        </AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(demande.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Supprimer
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default VracDemandesList;
