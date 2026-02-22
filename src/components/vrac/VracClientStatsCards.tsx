import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Clock, CheckCircle, XCircle, Weight } from 'lucide-react';

interface VracClientStatsCardsProps {
    total: number;
    enAttente: number;
    charges: number;
    refuses: number;
    tonnage: number;
}

const VracClientStatsCards: React.FC<VracClientStatsCardsProps> = ({
    total, enAttente, charges, refuses, tonnage,
}) => {
    // Afficher 3 décimales maximum pour garder la précision du tonnage (ex: 29.865)
    const formattedTonnage = tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

    const cards = [
        { label: 'Nb Camions', value: total, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'En attente', value: enAttente, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Chargés', value: charges, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Refusés', value: refuses, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Tonnage (T)', value: formattedTonnage, icon: Weight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.label} className="border shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                                <div className={`p-1.5 rounded-md ${card.bg}`}>
                                    <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default VracClientStatsCards;
