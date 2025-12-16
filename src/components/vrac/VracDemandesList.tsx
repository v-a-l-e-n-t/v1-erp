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
import { VracDemandeChargement } from '@/types/vrac';

interface VracDemandesListProps {
    demandes: VracDemandeChargement[];
    onDelete?: (id: string) => Promise<void>;
    onEdit?: (demande: VracDemandeChargement) => void;
    showClient?: boolean;
    allowActions?: boolean;
    loading?: boolean;
}

const VracDemandesList: React.FC<VracDemandesListProps> = ({
    demandes,
    onDelete,
    onEdit,
    showClient = false,
    allowActions = true,
    loading = false,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'charge'>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredDemandes = demandes.filter(demande => {
        const matchesSearch =
            demande.immatriculation_tracteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demande.immatriculation_citerne.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (demande.numero_bon?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || demande.statut === statusFilter;

        return matchesSearch && matchesStatus;
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
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                    <Check className="w-3 h-3" />
                    Chargé
                </Badge>
            );
        }
        return (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                <Clock className="w-3 h-3" />
                En attente
            </Badge>
        );
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                        <Truck className="w-5 h-5 text-orange-500" />
                        Liste des camions ({filteredDemandes.length})
                    </CardTitle>

                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 w-full sm:w-48"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'en_attente' | 'charge')}>
                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white w-full sm:w-40">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Statut" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
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
                    <div className="text-center py-8 text-slate-400">
                        Chargement...
                    </div>
                ) : filteredDemandes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        Aucun camion trouvé
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Date</TableHead>
                                    {showClient && <TableHead className="text-slate-400">Client</TableHead>}
                                    <TableHead className="text-slate-400">Tracteur</TableHead>
                                    <TableHead className="text-slate-400">Citerne</TableHead>
                                    <TableHead className="text-slate-400">N° Bon</TableHead>
                                    <TableHead className="text-slate-400">Statut</TableHead>
                                    <TableHead className="text-slate-400 text-right">Tonnage</TableHead>
                                    {allowActions && <TableHead className="text-slate-400 text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDemandes.map((demande) => (
                                    <TableRow key={demande.id} className="border-slate-700 hover:bg-slate-700/30">
                                        <TableCell className="text-white">
                                            {format(parseISO(demande.date_chargement), 'dd/MM/yyyy', { locale: fr })}
                                        </TableCell>
                                        {showClient && (
                                            <TableCell className="text-white">
                                                {demande.vrac_clients?.nom_affichage || '-'}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-white font-mono">
                                            {demande.immatriculation_tracteur}
                                        </TableCell>
                                        <TableCell className="text-white font-mono">
                                            {demande.immatriculation_citerne}
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {demande.numero_bon || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(demande.statut)}
                                        </TableCell>
                                        <TableCell className="text-right text-white font-semibold">
                                            {demande.tonnage_charge ? `${demande.tonnage_charge.toFixed(2)} T` : '-'}
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
                                                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
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
                                                                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                                        disabled={deletingId === demande.id}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-white">
                                                                            Supprimer ce camion ?
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-slate-400">
                                                                            Cette action est irréversible. Le camion {demande.immatriculation_tracteur} sera supprimé.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                                                            Annuler
                                                                        </AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(demande.id)}
                                                                            className="bg-red-500 hover:bg-red-600 text-white"
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
