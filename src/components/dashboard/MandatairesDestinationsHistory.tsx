import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, CalendarIcon, Download, RotateCcw, MapPin, TrendingUp, PieChart } from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SearchableSelect } from "./SearchableSelect";

interface Mandataire {
  id: string;
  nom: string;
}

interface VenteMandataire {
  id: string;
  date: string;
  mandataire_id: string;
  client: string | null;
  destination: string | null;
  r_b6: number | null;
  r_b12: number | null;
  r_b28: number | null;
  r_b38: number | null;
  r_b11_carbu: number | null;
  c_b6: number | null;
  c_b12: number | null;
  c_b28: number | null;
  c_b38: number | null;
  c_b11_carbu: number | null;
  mandataires?: { nom: string };
}

interface DestinationStats {
  destination: string;
  tonnage: number;
  percentage: number;
  count: number;
}

type FilterType = "all" | "year" | "month" | "period" | "day";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ec4899", "#06b6d4", "#6366f1", "#84cc16", "#f43f5e"];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MandatairesDestinationsHistory = () => {
  const [ventes, setVentes] = useState<VenteMandataire[]>([]);
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMandataire, setSelectedMandataire] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [dateStart, setDateStart] = useState<Date | undefined>(undefined);
  const [dateEnd, setDateEnd] = useState<Date | undefined>(undefined);
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ventesResult, mandatairesResult] = await Promise.all([
        supabase
          .from("ventes_mandataires")
          .select("*, mandataires(nom)")
          .order("date", { ascending: false }),
        supabase.from("mandataires").select("*").order("nom")
      ]);

      if (ventesResult.error) throw ventesResult.error;
      if (mandatairesResult.error) throw mandatairesResult.error;

      setVentes(ventesResult.data || []);
      setMandataires(mandatairesResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filters
  const { clients, destinations, years } = useMemo(() => {
    const clientsSet = new Set<string>();
    const destinationsSet = new Set<string>();
    const yearsSet = new Set<number>();

    ventes.forEach(v => {
      if (v.client) clientsSet.add(v.client);
      if (v.destination) destinationsSet.add(v.destination);
      yearsSet.add(getYear(new Date(v.date)));
    });

    return {
      clients: Array.from(clientsSet).sort(),
      destinations: Array.from(destinationsSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a)
    };
  }, [ventes]);

  const filteredVentes = useMemo(() => {
    return ventes.filter((vente) => {
      const matchesSearch =
        searchTerm === "" ||
        vente.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vente.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vente.mandataires?.nom?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMandataire =
        selectedMandataire === "all" || vente.mandataire_id === selectedMandataire;

      const matchesClient =
        selectedClient === "all" || vente.client === selectedClient;

      const matchesDestination =
        selectedDestination === "all" || vente.destination === selectedDestination;

      const venteDate = new Date(vente.date);
      let matchesDate = true;

      if (filterType === "year") {
        const yearStart = startOfYear(new Date(parseInt(selectedYear), 0, 1));
        const yearEnd = endOfYear(new Date(parseInt(selectedYear), 0, 1));
        matchesDate = venteDate >= yearStart && venteDate <= yearEnd;
      } else if (filterType === "month") {
        const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1));
        const monthEnd = endOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1));
        matchesDate = venteDate >= monthStart && venteDate <= monthEnd;
      } else if (filterType === "period") {
        const matchesDateStart = !dateStart || venteDate >= dateStart;
        const matchesDateEnd = !dateEnd || venteDate <= dateEnd;
        matchesDate = matchesDateStart && matchesDateEnd;
      } else if (filterType === "day" && singleDate) {
        matchesDate = format(venteDate, "yyyy-MM-dd") === format(singleDate, "yyyy-MM-dd");
      }

      return matchesSearch && matchesMandataire && matchesClient && matchesDestination && matchesDate;
    });
  }, [ventes, searchTerm, selectedMandataire, selectedClient, selectedDestination, filterType, selectedYear, selectedMonth, dateStart, dateEnd, singleDate]);

  const calculateTonnageKg = (v: VenteMandataire) => {
    const recharges = (v.r_b6 || 0) * 6 + (v.r_b12 || 0) * 12.5 + (v.r_b28 || 0) * 28 + (v.r_b38 || 0) * 38 + (v.r_b11_carbu || 0) * 11;
    const consignes = (v.c_b6 || 0) * 6 + (v.c_b12 || 0) * 12.5 + (v.c_b28 || 0) * 28 + (v.c_b38 || 0) * 38 + (v.c_b11_carbu || 0) * 11;
    return recharges + consignes;
  };

  const totalTonnage = filteredVentes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);

  // Calculate destination statistics
  const destinationStats: DestinationStats[] = useMemo(() => {
    return destinations
      .map(dest => {
        const destVentes = filteredVentes.filter(v => v.destination === dest);
        const tonnage = destVentes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);
        return {
          destination: dest || "Non spécifié",
          tonnage,
          percentage: totalTonnage > 0 ? (tonnage / totalTonnage) * 100 : 0,
          count: destVentes.length
        };
      })
      .filter(d => d.tonnage > 0)
      .sort((a, b) => b.tonnage - a.tonnage);
  }, [destinations, filteredVentes, totalTonnage]);

  const handleExport = () => {
    const exportData = destinationStats.map((d) => ({
      Destination: d.destination,
      "Nombre de ventes": d.count,
      "Tonnage (Kg)": d.tonnage.toFixed(2),
      "Pourcentage": `${d.percentage.toFixed(2)}%`
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Destinations");
    XLSX.writeFile(wb, `destinations_mandataires_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Export réussi");
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMandataire("all");
    setSelectedClient("all");
    setSelectedDestination("all");
    setFilterType("all");
    setDateStart(undefined);
    setDateEnd(undefined);
    setSingleDate(undefined);
  };

  const pieData = destinationStats.slice(0, 10).map((d, i) => ({
    name: d.destination,
    value: d.tonnage,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
        <MapPin className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">Destinations:</span>
          <span className="ml-2 font-bold">{destinationStats.length}</span>
          <span className="ml-4 text-sm text-muted-foreground">Total tonnage:</span>
          <span className="ml-2 font-bold">{totalTonnage.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Kg</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Row 1: Period Type */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="year">Année</SelectItem>
            <SelectItem value="month">Mois</SelectItem>
            <SelectItem value="period">Période</SelectItem>
            <SelectItem value="day">Jour</SelectItem>
          </SelectContent>
        </Select>

        {filterType === "year" && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterType === "month" && (
          <>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {filterType === "period" && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateStart ? format(dateStart, "dd/MM/yy") : "Début"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateStart} onSelect={setDateStart} locale={fr} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateEnd ? format(dateEnd, "dd/MM/yy") : "Fin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateEnd} onSelect={setDateEnd} locale={fr} />
              </PopoverContent>
            </Popover>
          </>
        )}

        {filterType === "day" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {singleDate ? format(singleDate, "dd/MM/yyyy") : "Choisir un jour"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} locale={fr} />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Filters Row 2: Entity filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <SearchableSelect
          options={mandataires.map(m => ({ value: m.id, label: m.nom }))}
          value={selectedMandataire}
          onValueChange={setSelectedMandataire}
          placeholder="Mandataire"
          allLabel="Tous mandataires"
        />

        <SearchableSelect
          options={clients.map(c => ({ value: c, label: c }))}
          value={selectedClient}
          onValueChange={setSelectedClient}
          placeholder="Client"
          allLabel="Tous clients"
        />

        <SearchableSelect
          options={destinations.map(d => ({ value: d, label: d }))}
          value={selectedDestination}
          onValueChange={setSelectedDestination}
          placeholder="Destination"
          allLabel="Toutes destinations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Répartition par Destination
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Tonnage (Kg)</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  ) : destinationStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucune destination trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    destinationStats.map((stat, i) => (
                      <TableRow key={stat.destination}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <Badge variant="outline">{stat.destination}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{stat.count}</TableCell>
                        <TableCell className="text-right font-bold">
                          {stat.tonnage.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {stat.percentage.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Graphique des Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString("fr-FR")} Kg`, "Tonnage"]}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Aucune donnée à afficher
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MandatairesDestinationsHistory;
