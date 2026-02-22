import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracTonnageChartProps {
    demandes: VracDemandeChargement[];
}

const VracTonnageChart: React.FC<VracTonnageChartProps> = ({ demandes }) => {
    const chartData = useMemo(() => {
        const byDay = new Map<string, number>();
        demandes
            .filter(d => d.statut === 'charge' && d.tonnage_charge)
            .forEach(d => {
                const day = d.date_chargement;
                byDay.set(day, (byDay.get(day) || 0) + (d.tonnage_charge || 0));
            });

        return Array.from(byDay.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tonnage]) => ({
                date: format(parseISO(date), 'dd/MM', { locale: fr }),
                tonnage: Math.round(tonnage * 1000),
            }));
    }, [demandes]);

    if (chartData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Pas de données de tonnage
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Tonnage par jour (kg)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(28, 90%, 55%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(28, 90%, 55%)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                            labelFormatter={(label) => `Le ${label}`}
                            formatter={(value: number) => [`${Math.round(value).toLocaleString('fr-FR')} kg`, 'Tonnage']}
                            labelStyle={{ fontWeight: 600 }}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="tonnage"
                            stroke="hsl(28, 90%, 55%)"
                            strokeWidth={2}
                            fill="url(#tonnageGrad)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default VracTonnageChart;
