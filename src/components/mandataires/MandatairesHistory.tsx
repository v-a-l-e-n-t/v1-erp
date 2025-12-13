import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Download, Trash2, CalendarIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Mandataire {
  id: string;
  nom: string;
}

interface VenteMandataire {
  id: string;
  date: string;
  mandataire_id: string;
  camion: string;
  client: string;
  numero_bon_sortie: string;
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
  mandataires?: Mandataire;
}

const MandatairesHistory = () => {
  const [ventes, setVentes] = useState<VenteMandataire[]>([]);
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMandataire, setSelectedMandataire] = useState<string>("all");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ventesRes, mandatairesRes] = await Promise.all([
        supabase
          .from("ventes_mandataires")
          .select("*, mandataires(id, nom)")
          .order("date", { ascending: false }),
        supabase.from("mandataires").select("*").order("nom"),
      ]);

      if (ventesRes.error) throw ventesRes.error;
      if (mandatairesRes.error) throw mandatairesRes.error;

      setVentes(ventesRes.data || []);
      setMandataires(mandatairesRes.data || []);

      // Extract unique destinations
      const uniqueDestinations = [...new Set(
        (ventesRes.data || [])
          .map(v => v.destination)
          .filter(Boolean) as string[]
      )].sort();
      setDestinations(uniqueDestinations);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredVentes = ventes.filter(vente => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        vente.numero_bon_sortie.toLowerCase().includes(search) ||
        vente.client?.toLowerCase().includes(search) ||
        vente.camion?.toLowerCase().includes(search) ||
        vente.mandataires?.nom.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Mandataire filter
    if (selectedMandataire !== "all" && vente.mandataire_id !== selectedMandataire) {
      return false;
    }

    // Destination filter
    if (selectedDestination !== "all" && vente.destination !== selectedDestination) {
      return false;
    }

    // Date filter
    const venteDate = new Date(vente.date);
    if (dateStart && venteDate < dateStart) return false;
    if (dateEnd && venteDate > dateEnd) return false;

    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ventes_mandataires")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setVentes(ventes.filter(v => v.id !== id));
      toast.success("Vente supprimée");
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleExport = () => {
    const exportData = filteredVentes.map(vente => ({
      Date: format(new Date(vente.date), "dd/MM/yyyy"),
      Mandataire: vente.mandataires?.nom || "",
      Camion: vente.camion,
      Client: vente.client,
      "N° Bon Sortie": vente.numero_bon_sortie,
      Destination: vente.destination || "",
      "R B6": vente.r_b6,
      "R B12": vente.r_b12,
      "R B28": vente.r_b28,
      "R B38": vente.r_b38,
      "R B11 Carbu": vente.r_b11_carbu,
      "C B6": vente.c_b6,
      "C B12": vente.c_b12,
      "C B28": vente.c_b28,
      "C B38": vente.c_b38,
      "C B11 Carbu": vente.c_b11_carbu,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventes Mandataires");
    XLSX.writeFile(wb, `ventes_mandataires_${format(new Date(), "yyyyMMdd")}.xlsx`);
    
    toast.success("Export réussi");
  };

  const getTotalRecharges = (vente: VenteMandataire) => 
    vente.r_b6 + vente.r_b12 + vente.r_b28 + vente.r_b38 + vente.r_b11_carbu;

  const getTotalConsignes = (vente: VenteMandataire) => 
    vente.c_b6 + vente.c_b12 + vente.c_b28 + vente.c_b38 + vente.c_b11_carbu;

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMandataire("all");
    setSelectedDestination("all");
    setDateStart(undefined);
    setDateEnd(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Historique des Ventes</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={handleExport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedMandataire} onValueChange={setSelectedMandataire}>
            <SelectTrigger>
              <SelectValue placeholder="Mandataire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mandataires</SelectItem>
              {mandataires.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDestination} onValueChange={setSelectedDestination}>
            <SelectTrigger>
              <SelectValue placeholder="Destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les destinations</SelectItem>
              {destinations.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateStart ? format(dateStart, "dd/MM/yy", { locale: fr }) : "Date début"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateStart}
                onSelect={setDateStart}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateEnd ? format(dateEnd, "dd/MM/yy", { locale: fr }) : "Date fin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateEnd}
                onSelect={setDateEnd}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {filteredVentes.length} vente(s)
          </Badge>
        </div>

        {/* Table */}
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mandataire</TableHead>
                <TableHead>Camion</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>N° Bon</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Recharges</TableHead>
                <TableHead className="text-right">Consignes</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredVentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucune vente trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredVentes.map((vente) => (
                  <TableRow key={vente.id}>
                    <TableCell>
                      {format(new Date(vente.date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {vente.mandataires?.nom}
                    </TableCell>
                    <TableCell>{vente.camion}</TableCell>
                    <TableCell>{vente.client}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vente.numero_bon_sortie}</Badge>
                    </TableCell>
                    <TableCell>{vente.destination || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {getTotalRecharges(vente)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {getTotalConsignes(vente)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vente.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MandatairesHistory;
