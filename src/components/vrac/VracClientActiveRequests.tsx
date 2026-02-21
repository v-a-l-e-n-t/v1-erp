import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import VracStatusBadge from './VracStatusBadge';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracClientActiveRequestsProps {
    demandes: VracDemandeChargement[];
}

const VracClientActiveRequests: React.FC<VracClientActiveRequestsProps> = ({ demandes }) => {
    const pending = demandes.filter(d => d.statut === 'en_attente');

    if (pending.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucune demande en attente</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-amber-500" />
                    En attente ({pending.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tracteur</TableHead>
                            <TableHead>Citerne</TableHead>
                            <TableHead>Chauffeur</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pending.map((d) => (
                            <TableRow key={d.id}>
                                <TableCell className="font-mono font-medium">{d.immatriculation_tracteur}</TableCell>
                                <TableCell className="font-mono">{d.immatriculation_citerne}</TableCell>
                                <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{d.nom_chauffeur || '-'}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(d.created_at), 'dd/MM HH:mm', { locale: fr })}
                                </TableCell>
                                <TableCell>
                                    <VracStatusBadge status={d.statut} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default VracClientActiveRequests;
