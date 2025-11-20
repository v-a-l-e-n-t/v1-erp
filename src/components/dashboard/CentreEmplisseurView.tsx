import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Package, Weight, TrendingUp } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CentreEmplisseurView = () => {
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [stats, setStats] = useState({
        totalTonnage: 0,
        totalBouteilles: 0,
        tonnageByLine: [] as { name: string; value: number }[],
        rechargesByType: [] as { name: string; value: number }[],
        consignesByType: [] as { name: string; value: number }[],
    });

    useEffect(() => {
        fetchStats();
    }, [year]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // Fetch production shifts
            const { data: shifts, error: shiftsError } = await supabase
                .from('production_shifts')
                .select('id, tonnage_total, bouteilles_produites')
                .gte('date', startDate)
                .lte('date', endDate);

            if (shiftsError) throw shiftsError;

            // Fetch line details
            const { data: lines, error: linesError } = await supabase
                .from('lignes_production')
                .select(`
          numero_ligne,
          tonnage_ligne,
          cumul_recharges_b6,
          cumul_recharges_b12,
          cumul_recharges_b28,
          cumul_recharges_b38,
          cumul_consignes_b6,
          cumul_consignes_b12,
          cumul_consignes_b28,
          cumul_consignes_b38,
          production_shifts!inner(date)
        `)
                .gte('production_shifts.date', startDate)
                .lte('production_shifts.date', endDate);

            if (linesError) throw linesError;

            // Calculate aggregates
            const totalTonnage = shifts?.reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0) || 0;
            const totalBouteilles = shifts?.reduce((sum, s) => sum + (s.bouteilles_produites || 0), 0) || 0;

            // Tonnage by Line
            const lineTonnageMap = new Map<number, number>();
            lines?.forEach(l => {
                const current = lineTonnageMap.get(l.numero_ligne) || 0;
                lineTonnageMap.set(l.numero_ligne, current + (Number(l.tonnage_ligne) || 0));
            });
            const tonnageByLine = Array.from(lineTonnageMap.entries())
                .map(([line, tonnage]) => ({ name: `Ligne ${line}`, value: tonnage }))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Bottles by Type
            let b6_r = 0, b12_r = 0, b28_r = 0, b38_r = 0;
            let b6_c = 0, b12_c = 0, b28_c = 0, b38_c = 0;

            lines?.forEach(l => {
                b6_r += l.cumul_recharges_b6 || 0;
                b12_r += l.cumul_recharges_b12 || 0;
                b28_r += l.cumul_recharges_b28 || 0;
                b38_r += l.cumul_recharges_b38 || 0;

                b6_c += l.cumul_consignes_b6 || 0;
                b12_c += l.cumul_consignes_b12 || 0;
                b28_c += l.cumul_consignes_b28 || 0;
                b38_c += l.cumul_consignes_b38 || 0;
            });

            const rechargesByType = [
                { name: 'B6', value: b6_r },
                { name: 'B12', value: b12_r },
                { name: 'B28', value: b28_r },
                { name: 'B38', value: b38_r },
            ].filter(i => i.value > 0);

            const consignesByType = [
                { name: 'B6', value: b6_c },
                { name: 'B12', value: b12_c },
                { name: 'B28', value: b28_c },
                { name: 'B38', value: b38_c },
            ].filter(i => i.value > 0);

            setStats({
                totalTonnage,
                totalBouteilles,
                tonnageByLine,
                rechargesByType,
                consignesByType,
            });

        } catch (error) {
            console.error('Error fetching production stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord Production</h2>
                <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tonnage Total</CardTitle>
                        <Weight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T</div>
                        <p className="text-xs text-muted-foreground">Production cumulée {year}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bouteilles Produites</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBouteilles.toLocaleString('fr-FR')}</div>
                        <p className="text-xs text-muted-foreground">Unités totales</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Moyenne / Shift</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(stats.totalTonnage / 365).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} T
                        </div>
                        <p className="text-xs text-muted-foreground">Estimation journalière</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Production par Ligne</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.tonnageByLine}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} T`, 'Tonnage']} />
                                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                        {stats.tonnageByLine.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Répartition par Type (Recharges)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.rechargesByType}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {stats.rechargesByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [Number(value).toLocaleString('fr-FR'), 'Unités']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CentreEmplisseurView;
