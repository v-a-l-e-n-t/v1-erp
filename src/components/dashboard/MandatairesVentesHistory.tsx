import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CalendarIcon, Trash2, Download, RotateCcw, TrendingUp, List, BarChart3 } from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, getYear, getMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { SearchableSelect } from "./SearchableSelect";

interface Mandataire {
  id: string;
  nom: string;
}

interface VenteMandataire {
  id: string;
  date: string;
  mandataire_id: string;
  camion: string | null;
  client: string | null;
  numero_bon_sortie: string;
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

interface AggregatedStat {
  key: string;
  label: string;
  count: number;
  totalRecharges: number;
  totalConsignes: number;
  tonnage: number;
  percentage: number;
}

type FilterType = "all" | "year" | "month" | "period" | "day";
type GroupByType = "mandataire" | "client" | "destination" | "mois";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ec4899", "#06b6d4", "#6366f1", "#84cc16", "#f43f5e"];

const MandatairesVentesHistory = () => {
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("detailed");
  const [groupBy, setGroupBy] = useState<GroupByType>("mandataire");

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
        vente.numero_bon_sortie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vente.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vente.camion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vente.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("ventes_mandataires")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setVentes(ventes.filter((v) => v.id !== deleteId));
      toast.success("Vente supprimée");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteId(null);
    }
  };

  const getTotalRecharges = (v: VenteMandataire) =>
    (v.r_b6 || 0) + (v.r_b12 || 0) + (v.r_b28 || 0) + (v.r_b38 || 0) + (v.r_b11_carbu || 0);

  const getTotalConsignes = (v: VenteMandataire) =>
    (v.c_b6 || 0) + (v.c_b12 || 0) + (v.c_b28 || 0) + (v.c_b38 || 0) + (v.c_b11_carbu || 0);

  const calculateTonnageKg = (v: VenteMandataire) => {
    const recharges = (v.r_b6 || 0) * 6 + (v.r_b12 || 0) * 12.5 + (v.r_b28 || 0) * 28 + (v.r_b38 || 0) * 38 + (v.r_b11_carbu || 0) * 11;
    const consignes = (v.c_b6 || 0) * 6 + (v.c_b12 || 0) * 12.5 + (v.c_b28 || 0) * 28 + (v.c_b38 || 0) * 38 + (v.c_b11_carbu || 0) * 11;
    return recharges + consignes;
  };

  const totalTonnage = filteredVentes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);

  // Aggregated statistics based on groupBy
  const aggregatedStats: AggregatedStat[] = useMemo(() => {
    const groupMap = new Map<string, { label: string; ventes: VenteMandataire[] }>();

    filteredVentes.forEach(v => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case "mandataire":
          key = v.mandataire_id;
          label = v.mandataires?.nom || "Non spécifié";
          break;
        case "client":
          key = v.client || "non_specifie";
          label = v.client || "Non spécifié";
          break;
        case "destination":
          key = v.destination || "non_specifie";
          label = v.destination || "Non spécifié";
          break;
        case "mois":
          const date = new Date(v.date);
          key = `${getYear(date)}-${getMonth(date)}`;
          label = `${MONTHS[getMonth(date)]} ${getYear(date)}`;
          break;
        default:
          key = "unknown";
          label = "Inconnu";
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, { label, ventes: [] });
      }
      groupMap.get(key)!.ventes.push(v);
    });

    const stats = Array.from(groupMap.entries()).map(([key, { label, ventes }]) => {
      const totalRecharges = ventes.reduce((sum, v) => sum + getTotalRecharges(v), 0);
      const totalConsignes = ventes.reduce((sum, v) => sum + getTotalConsignes(v), 0);
      const tonnage = ventes.reduce((sum, v) => sum + calculateTonnageKg(v), 0);

      return {
        key,
        label,
        count: ventes.length,
        totalRecharges,
        totalConsignes,
        tonnage,
        percentage: totalTonnage > 0 ? (tonnage / totalTonnage) * 100 : 0
      };
    });

    // Sort by tonnage descending, except for "mois" which should be chronological
    if (groupBy === "mois") {
      return stats.sort((a, b) => a.key.localeCompare(b.key));
    }
    return stats.sort((a, b) => b.tonnage - a.tonnage);
  }, [filteredVentes, groupBy, totalTonnage]);

  const handleExportDetailed = () => {
    const exportData = filteredVentes.map((v) => ({
      Date: format(new Date(v.date), "dd/MM/yyyy"),
      Mandataire: v.mandataires?.nom || "",
      Camion: v.camion || "",
      Client: v.client || "",
      Destination: v.destination || "",
      "N° Bon Sortie": v.numero_bon_sortie,
      "R_B6": v.r_b6 || 0,
      "R_B12": v.r_b12 || 0,
      "R_B28": v.r_b28 || 0,
      "R_B38": v.r_b38 || 0,
      "R_Carbu": v.r_b11_carbu || 0,
      "C_B6": v.c_b6 || 0,
      "C_B12": v.c_b12 || 0,
      "C_B28": v.c_b28 || 0,
      "C_B38": v.c_b38 || 0,
      "C_Carbu": v.c_b11_carbu || 0,
      "Tonnage (Kg)": calculateTonnageKg(v).toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventes Détaillées");
    XLSX.writeFile(wb, `ventes_detaillees_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Export réussi");
  };

  const handleExportAggregated = () => {
    const groupLabels: Record<GroupByType, string> = {
      mandataire: "Mandataire",
      client: "Client",
      destination: "Destination",
      mois: "Mois"
    };

    const exportData = aggregatedStats.map((stat) => ({
      [groupLabels[groupBy]]: stat.label,
      "Nombre de ventes": stat.count,
      "Total Recharges": stat.totalRecharges,
      "Total Consignes": stat.totalConsignes,
      "Tonnage (Kg)": stat.tonnage.toFixed(2),
      "Pourcentage": `${stat.percentage.toFixed(2)}%`
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Par ${groupLabels[groupBy]}`);
    XLSX.writeFile(wb, `ventes_par_${groupBy}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">Total filtré:</span>
          <span className="ml-2 font-bold">{filteredVentes.length} ventes</span>
          <span className="ml-4 text-sm text-muted-foreground">Tonnage:</span>
          <span className="ml-2 font-bold">{totalTonnage.toLocaleString("fr-FR")} Kg</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
          <Button variant="outline" size="sm" onClick={activeTab === "detailed" ? handleExportDetailed : handleExportAggregated}>
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

      {/* Tabs: Vue Détaillée / Vue Agrégée */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Vue Détaillée
          </TabsTrigger>
          <TabsTrigger value="aggregated" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vue Agrégée
          </TabsTrigger>
        </TabsList>

        {/* Vue Détaillée */}
        <TabsContent value="detailed" className="mt-4">
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="min-w-max">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Mandataire</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>N° Bon</TableHead>
                    <TableHead className="text-right">Recharges</TableHead>
                    <TableHead className="text-right">Consignes</TableHead>
                    <TableHead className="text-right">Tonnage (Kg)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  ) : filteredVentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Aucune vente trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVentes.map((vente) => (
                      <TableRow key={vente.id}>
                        <TableCell className="font-medium">
                          {format(new Date(vente.date), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vente.mandataires?.nom || "-"}</Badge>
                        </TableCell>
                        <TableCell>{vente.camion || "-"}</TableCell>
                        <TableCell>{vente.client || "-"}</TableCell>
                        <TableCell>{vente.destination || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{vente.numero_bon_sortie}</TableCell>
                        <TableCell className="text-right font-medium">
                          {getTotalRecharges(vente)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {getTotalConsignes(vente)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {calculateTonnageKg(vente).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(vente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TabsContent>

        {/* Vue Agrégée */}
        <TabsContent value="aggregated" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Grouper par:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mandataire">Mandataire</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="destination">Destination</SelectItem>
                <SelectItem value="mois">Mois</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{aggregatedStats.length} entrée(s)</Badge>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>
                    {groupBy === "mandataire" && "Mandataire"}
                    {groupBy === "client" && "Client"}
                    {groupBy === "destination" && "Destination"}
                    {groupBy === "mois" && "Mois"}
                  </TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Recharges</TableHead>
                  <TableHead className="text-right">Consignes</TableHead>
                  <TableHead className="text-right">Tonnage (Kg)</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : aggregatedStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune donnée trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  aggregatedStats.map((stat, index) => (
                    <TableRow key={stat.key}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <Badge variant="outline">{stat.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{stat.count}</TableCell>
                      <TableCell className="text-right">{stat.totalRecharges.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">{stat.totalConsignes.toLocaleString("fr-FR")}</TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MandatairesVentesHistory;
