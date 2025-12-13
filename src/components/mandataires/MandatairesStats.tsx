import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Package, MapPin, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface Mandataire {
  id: string;
  nom: string;
}

interface VenteMandataire {
  id: string;
  date: string;
  mandataire_id: string;
  destination: string | null;
  r_b6: number;
  r_b12: number;
  r_b28: number;
  r_b38: number;
  r_b11_carbu: number;
  c_b6: number;
  c_b12: number;
  c_b28: number;
  c_b38: number;
  c_b11_carbu: number;
}

interface MandataireStats {
  mandataire: string;
  totalRecharges: number;
  totalConsignes: number;
  tonnage: number;
  ventesCount: number;
}

interface DestinationStats {
  destination: string;
  count: number;
  totalBouteilles: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const MandatairesStats = () => {
  const [ventes, setVentes] = useState<VenteMandataire[]>([]);
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current");

  useEffect(() => {
    fetchData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "current":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "previous":
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case "quarter":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "all":
      default:
        return { start: null, end: null };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("ventes_mandataires")
        .select("*");

      if (start && end) {
        query = query
          .gte("date", start.toISOString().split("T")[0])
          .lte("date", end.toISOString().split("T")[0]);
      }

      const [ventesRes, mandatairesRes] = await Promise.all([
        query.order("date", { ascending: false }),
        supabase.from("mandataires").select("*").order("nom"),
      ]);

      if (ventesRes.error) throw ventesRes.error;
      if (mandatairesRes.error) throw mandatairesRes.error;

      setVentes(ventesRes.data || []);
      setMandataires(mandatairesRes.data || []);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate tonnage (approximation based on bottle sizes)
  const calculateTonnage = (vente: VenteMandataire) => {
    const recharges = 
      (vente.r_b6 * 6) + 
      (vente.r_b12 * 12.5) + 
      (vente.r_b28 * 28) + 
      (vente.r_b38 * 38) + 
      (vente.r_b11_carbu * 11);
    return recharges / 1000; // Convert to tonnes
  };

  const getTotalBouteilles = (vente: VenteMandataire) => {
    return vente.r_b6 + vente.r_b12 + vente.r_b28 + vente.r_b38 + vente.r_b11_carbu +
           vente.c_b6 + vente.c_b12 + vente.c_b28 + vente.c_b38 + vente.c_b11_carbu;
  };

  // Stats by mandataire
  const mandataireStats: MandataireStats[] = mandataires.map(m => {
    const mandataireVentes = ventes.filter(v => v.mandataire_id === m.id);
    return {
      mandataire: m.nom,
      totalRecharges: mandataireVentes.reduce((sum, v) => 
        sum + v.r_b6 + v.r_b12 + v.r_b28 + v.r_b38 + v.r_b11_carbu, 0),
      totalConsignes: mandataireVentes.reduce((sum, v) => 
        sum + v.c_b6 + v.c_b12 + v.c_b28 + v.c_b38 + v.c_b11_carbu, 0),
      tonnage: mandataireVentes.reduce((sum, v) => sum + calculateTonnage(v), 0),
      ventesCount: mandataireVentes.length,
    };
  }).filter(s => s.ventesCount > 0).sort((a, b) => b.tonnage - a.tonnage);

  // Stats by destination
  const destinationStats: DestinationStats[] = Object.entries(
    ventes.reduce((acc, v) => {
      const dest = v.destination || "Non spécifié";
      if (!acc[dest]) acc[dest] = { count: 0, totalBouteilles: 0 };
      acc[dest].count++;
      acc[dest].totalBouteilles += getTotalBouteilles(v);
      return acc;
    }, {} as Record<string, { count: number; totalBouteilles: number }>)
  )
    .map(([destination, data]) => ({ destination, ...data }))
    .sort((a, b) => b.count - a.count);

  // Global totals
  const totalVentes = ventes.length;
  const totalRecharges = ventes.reduce((sum, v) => 
    sum + v.r_b6 + v.r_b12 + v.r_b28 + v.r_b38 + v.r_b11_carbu, 0);
  const totalConsignes = ventes.reduce((sum, v) => 
    sum + v.c_b6 + v.c_b12 + v.c_b28 + v.c_b38 + v.c_b11_carbu, 0);
  const totalTonnage = ventes.reduce((sum, v) => sum + calculateTonnage(v), 0);

  const formatNumber = (num: number) => new Intl.NumberFormat("fr-FR").format(Math.round(num));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mois en cours</SelectItem>
            <SelectItem value="previous">Mois précédent</SelectItem>
            <SelectItem value="quarter">3 derniers mois</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalVentes)}</div>
            <p className="text-xs text-muted-foreground">bons de sortie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recharges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalRecharges)}</div>
            <p className="text-xs text-muted-foreground">bouteilles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consignes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalConsignes)}</div>
            <p className="text-xs text-muted-foreground">bouteilles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tonnage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTonnage.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">tonnes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Mandataires Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Mandataires
            </CardTitle>
            <CardDescription>Par tonnage</CardDescription>
          </CardHeader>
          <CardContent>
            {mandataireStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mandataireStats.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="mandataire" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} T`, "Tonnage"]}
                  />
                  <Bar dataKey="tonnage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Destinations Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Répartition par Destination
            </CardTitle>
            <CardDescription>Top 5 destinations</CardDescription>
          </CardHeader>
          <CardContent>
            {destinationStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={destinationStats.slice(0, 5)}
                    dataKey="count"
                    nameKey="destination"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ destination, percent }) => 
                      `${destination.substring(0, 15)}${destination.length > 15 ? "..." : ""} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {destinationStats.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par Mandataire</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mandataire</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Recharges</TableHead>
                <TableHead className="text-right">Consignes</TableHead>
                <TableHead className="text-right">Tonnage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : mandataireStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune donnée
                  </TableCell>
                </TableRow>
              ) : (
                mandataireStats.map((stat, index) => (
                  <TableRow key={stat.mandataire}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        )}
                        {stat.mandataire}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{stat.ventesCount}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.totalRecharges)}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.totalConsignes)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {stat.tonnage.toFixed(2)} T
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MandatairesStats;
