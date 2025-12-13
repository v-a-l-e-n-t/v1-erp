import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Package, MapPin, TrendingUp, Building2 } from "lucide-react";
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
  client: string | null;
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
  tonnageKg: number;
  percentage: number;
}

interface DestinationStats {
  destination: string;
  tonnageKg: number;
  percentage: number;
}

const COLORS = [
  "hsl(var(--primary))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

const MandatairesStats = () => {
  const [ventes, setVentes] = useState<VenteMandataire[]>([]);
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");

  // Get unique clients from data
  const uniqueClients = [...new Set(ventes.map(v => v.client).filter(Boolean))].sort();

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

  // Calculate tonnage in Kg (not tonnes)
  const calculateTonnageKg = (vente: VenteMandataire) => {
    return (vente.r_b6 * 6) + 
           (vente.r_b12 * 12.5) + 
           (vente.r_b28 * 28) + 
           (vente.r_b38 * 38) + 
           (vente.r_b11_carbu * 11);
  };

  // Filter ventes by selected client
  const filteredVentes = selectedClient === "all" 
    ? ventes 
    : ventes.filter(v => v.client === selectedClient);

  // Total tonnage for filtered data
  const totalTonnageKg = filteredVentes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);

  // Stats by mandataire with percentage
  const mandataireStats: MandataireStats[] = mandataires.map(m => {
    const mandataireVentes = filteredVentes.filter(v => v.mandataire_id === m.id);
    const tonnageKg = mandataireVentes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);
    return {
      mandataire: m.nom,
      tonnageKg,
      percentage: totalTonnageKg > 0 ? (tonnageKg / totalTonnageKg) * 100 : 0,
    };
  }).filter(s => s.tonnageKg > 0).sort((a, b) => b.tonnageKg - a.tonnageKg);

  // Stats by destination with percentage
  const destinationStatsMap: Record<string, number> = {};
  filteredVentes.forEach(v => {
    const dest = v.destination || "Non spécifié";
    if (!destinationStatsMap[dest]) destinationStatsMap[dest] = 0;
    destinationStatsMap[dest] += calculateTonnageKg(v);
  });

  const destinationStats: DestinationStats[] = Object.entries(destinationStatsMap)
    .map(([destination, tonnageKg]) => ({
      destination,
      tonnageKg,
      percentage: totalTonnageKg > 0 ? (tonnageKg / totalTonnageKg) * 100 : 0,
    }))
    .sort((a, b) => b.tonnageKg - a.tonnageKg);

  // Global totals
  const totalVentes = filteredVentes.length;
  const totalRecharges = filteredVentes.reduce((sum, v) => 
    sum + v.r_b6 + v.r_b12 + v.r_b28 + v.r_b38 + v.r_b11_carbu, 0);
  const totalConsignes = filteredVentes.reduce((sum, v) => 
    sum + v.c_b6 + v.c_b12 + v.c_b28 + v.c_b38 + v.c_b11_carbu, 0);

  const formatNumber = (num: number) => new Intl.NumberFormat("fr-FR", { 
    minimumFractionDigits: 3, 
    maximumFractionDigits: 3 
  }).format(num);

  const formatPercentage = (num: number) => new Intl.NumberFormat("fr-FR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(num);

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-4">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {uniqueClients.map(client => (
                <SelectItem key={client} value={client!}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

        {selectedClient !== "all" && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Building2 className="h-4 w-4 mr-2" />
            {selectedClient}
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVentes.toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground">bons de sortie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recharges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecharges.toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground">bouteilles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consignes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConsignes.toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground">bouteilles</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tonnage Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatNumber(totalTonnageKg)}</div>
            <p className="text-xs text-muted-foreground">Kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Tables Side by Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Historique des ventes par mandataire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Historique des ventes par mandataire
            </CardTitle>
            <CardDescription>
              {selectedClient !== "all" ? selectedClient : "Tous les clients"} - Total: {formatNumber(totalTonnageKg)} Kg
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">MANDATAIRE</TableHead>
                  <TableHead className="text-right font-bold">Kg</TableHead>
                  <TableHead className="text-right font-bold">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : mandataireStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Aucune donnée
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {mandataireStats.map((stat, index) => (
                      <TableRow key={stat.mandataire} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        <TableCell className="font-medium">{stat.mandataire}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(stat.tonnageKg)}</TableCell>
                        <TableCell className="text-right font-mono">{formatPercentage(stat.percentage)}%</TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatNumber(totalTonnageKg)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">100,00%</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Destination par mandataire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Destination par mandataire
            </CardTitle>
            <CardDescription>
              {selectedClient !== "all" ? selectedClient : "Tous les clients"} - Total: {formatNumber(totalTonnageKg)} Kg
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">DESTINATION</TableHead>
                  <TableHead className="text-right font-bold">Kg</TableHead>
                  <TableHead className="text-right font-bold">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : destinationStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Aucune donnée
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {destinationStats.map((stat, index) => (
                      <TableRow key={stat.destination} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        <TableCell className="font-medium">{stat.destination}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(stat.tonnageKg)}</TableCell>
                        <TableCell className="text-right font-mono">{formatPercentage(stat.percentage)}%</TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatNumber(totalTonnageKg)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">100,00%</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
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
              Top 10 Mandataires
            </CardTitle>
            <CardDescription>Par tonnage (Kg)</CardDescription>
          </CardHeader>
          <CardContent>
            {mandataireStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={mandataireStats.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="mandataire" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)} Kg`, "Tonnage"]}
                  />
                  <Bar dataKey="tonnageKg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
            <CardDescription>Top 6 destinations</CardDescription>
          </CardHeader>
          <CardContent>
            {destinationStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={destinationStats.slice(0, 6)}
                    dataKey="percentage"
                    nameKey="destination"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ destination, percentage }) => 
                      `${destination.substring(0, 12)}${destination.length > 12 ? ".." : ""} ${formatPercentage(percentage)}%`
                    }
                    labelLine={true}
                  >
                    {destinationStats.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${formatPercentage(value)}%`, "Part"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MandatairesStats;
