import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Clock, CheckCircle, XCircle, Weight, TrendingUp } from 'lucide-react';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracAdminKpiCardsProps {
    demandesToday: VracDemandeChargement[];
    demandesAll: VracDemandeChargement[];
}

const VracAdminKpiCards: React.FC<VracAdminKpiCardsProps> = ({ demandesToday, demandesAll }) => {
    const todayStats = {
        total: demandesToday.length,
        enAttente: demandesToday.filter(d => d.statut === 'en_attente').length,
        charges: demandesToday.filter(d => d.statut === 'charge').length,
        refuses: demandesToday.filter(d => d.statut === 'refusee').length,
    };

    const globalTonnage = demandesAll.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0);
    const chargedCount = demandesAll.filter(d => d.statut === 'charge').length;
    const avgTonnage = chargedCount > 0 ? globalTonnage / chargedCount : 0;

    const todayCards = [
        { label: "Aujourd'hui", value: todayStats.total, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'En attente', value: todayStats.enAttente, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Chargés', value: todayStats.charges, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Refusés', value: todayStats.refuses, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const globalCards = [
        { label: 'Total général', value: demandesAll.length, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Tonnage cumulé (T)', value: globalTonnage.toLocaleString('fr-FR', { maximumFractionDigits: 3 }), icon: Weight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Moy. / camion (T)', value: avgTonnage.toLocaleString('fr-FR', { maximumFractionDigits: 3 }), icon: Weight, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    ];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {todayCards.map((card) => {
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
            <div className="grid grid-cols-3 gap-3">
                {globalCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label} className="border shadow-sm bg-muted/30">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-md ${card.bg}`}>
                                        <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{card.label}</p>
                                        <p className="text-lg font-bold">{card.value}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default VracAdminKpiCards;
