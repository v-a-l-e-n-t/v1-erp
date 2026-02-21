import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracDailyTruckChartProps {
    demandes: VracDemandeChargement[];
}

const VracDailyTruckChart: React.FC<VracDailyTruckChartProps> = ({ demandes }) => {
    const chartData = useMemo(() => {
        const byDay = new Map<string, { en_attente: number; charge: number; refusee: number }>();

        demandes.forEach(d => {
            const day = d.date_chargement;
            const entry = byDay.get(day) || { en_attente: 0, charge: 0, refusee: 0 };
            if (d.statut === 'en_attente') entry.en_attente++;
            else if (d.statut === 'charge') entry.charge++;
            else if (d.statut === 'refusee') entry.refusee++;
            byDay.set(day, entry);
        });

        return Array.from(byDay.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14) // last 14 days
            .map(([date, counts]) => ({
                date: format(parseISO(date), 'dd/MM', { locale: fr }),
                ...counts,
            }));
    }, [demandes]);

    if (chartData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Pas de données
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Camions par jour
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => {
                                const labels: Record<string, string> = {
                                    en_attente: 'En attente',
                                    charge: 'Chargés',
                                    refusee: 'Refusés',
                                };
                                return <span className="text-xs">{labels[value] || value}</span>;
                            }}
                        />
                        <Bar dataKey="charge" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="en_attente" stackId="a" fill="hsl(38, 92%, 50%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="refusee" stackId="a" fill="hsl(0, 84%, 60%)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default VracDailyTruckChart;
