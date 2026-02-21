import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import VracAdminKpiCards from './VracAdminKpiCards';
import VracTonnageChart from './VracTonnageChart';
import VracClientDistributionChart from './VracClientDistributionChart';
import VracDailyTruckChart from './VracDailyTruckChart';
import VracStatusBadge from './VracStatusBadge';
import type { DemandeWithClient, VracDemandeChargement } from '@/types/vrac';

interface VracAdminDashboardTabProps {
    demandesToday: VracDemandeChargement[];
    demandesAll: DemandeWithClient[];
    onSwitchToChargements: () => void;
}

const VracAdminDashboardTab: React.FC<VracAdminDashboardTabProps> = ({
    demandesToday,
    demandesAll,
    onSwitchToChargements,
}) => {
    const pendingToday = demandesToday.filter(d => d.statut === 'en_attente');

    return (
        <div className="space-y-6">
            <VracAdminKpiCards demandesToday={demandesToday} demandesAll={demandesAll} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VracTonnageChart demandes={demandesAll} />
                <VracClientDistributionChart demandes={demandesAll} />
            </div>

            <VracDailyTruckChart demandes={demandesAll} />

            {/* Quick pending overview */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            En attente aujourd'hui ({pendingToday.length})
                        </CardTitle>
                        {pendingToday.length > 5 && (
                            <button
                                onClick={onSwitchToChargements}
                                className="text-xs text-primary hover:underline"
                            >
                                Voir tout
                            </button>
                        )}
                    </div>
                </CardHeader>
                {pendingToday.length > 0 ? (
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Tracteur</TableHead>
                                    <TableHead>Citerne</TableHead>
                                    <TableHead>Heure</TableHead>
                                    <TableHead>Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingToday.slice(0, 5).map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="text-sm font-medium">
                                            {d.vrac_clients?.nom_affichage || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{d.immatriculation_tracteur}</TableCell>
                                        <TableCell className="font-mono text-sm">{d.immatriculation_citerne}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(d.created_at), 'HH:mm', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            <VracStatusBadge status={d.statut} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                ) : (
                    <CardContent>
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Aucune demande en attente
                        </p>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default VracAdminDashboardTab;
