import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import type { DemandeWithClient } from '@/types/vrac';

interface VracClientDistributionChartProps {
    demandes: DemandeWithClient[];
}

const COLORS = [
    'hsl(28, 90%, 55%)',   // orange (primary)
    'hsl(142, 76%, 36%)',  // green
    'hsl(215, 70%, 55%)',  // blue
    'hsl(350, 70%, 55%)',  // red
    'hsl(280, 60%, 55%)',  // purple
];

const VracClientDistributionChart: React.FC<VracClientDistributionChartProps> = ({ demandes }) => {
    const chartData = useMemo(() => {
        const byClient = new Map<string, number>();
        demandes
            .filter(d => d.statut === 'charge' && d.tonnage_charge)
            .forEach(d => {
                const name = d.vrac_clients?.nom_affichage || 'Inconnu';
                byClient.set(name, (byClient.get(name) || 0) + (d.tonnage_charge || 0));
            });

        return Array.from(byClient.entries())
            .map(([name, tonnage]) => ({
                name,
                value: Math.round(tonnage * 1000),
            }))
            .sort((a, b) => b.value - a.value);
    }, [demandes]);

    if (chartData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Pas de données de distribution
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    Répartition par client (kg)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {chartData.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Tonnage']}
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default VracClientDistributionChart;
