import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { DemandeStatut } from '@/types/vrac';

interface VracStatusBadgeProps {
    status: DemandeStatut;
    motifRefus?: string;
}

const statusConfig: Record<DemandeStatut, {
    label: string;
    icon: React.ElementType;
    className: string;
}> = {
    en_attente: {
        label: 'En attente',
        icon: Clock,
        className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
    },
    charge: {
        label: 'Chargé',
        icon: CheckCircle,
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    },
    refusee: {
        label: 'Refusée',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
    },
};

const VracStatusBadge: React.FC<VracStatusBadgeProps> = ({ status, motifRefus }) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    const badge = (
        <Badge variant="outline" className={`gap-1 ${config.className}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </Badge>
    );

    if (status === 'refusee' && motifRefus) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{badge}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs font-medium">Motif du refus :</p>
                    <p className="text-xs">{motifRefus}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return badge;
};

export default VracStatusBadge;
