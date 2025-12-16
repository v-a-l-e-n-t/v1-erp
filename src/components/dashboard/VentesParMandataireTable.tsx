import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatNumber } from '@/utils/calculations';
import { Users, MapPin, Truck } from 'lucide-react';

interface VentesParMandataireTableProps {
  startDate: string;
  endDate: string;
}

interface MandataireStats {
  id: string;
  nom: string;
  tonnage: number;
  percentage: number;
}

interface DestinationStats {
  destination: string;
  tonnage: number;
  percentage: number;
  livraisons: number;
}

interface TruckStats {
  camion: string;
  tonnage: number;
  rotations: number;
  percentage: number;
}

const VentesParMandataireTable = ({ startDate, endDate }: VentesParMandataireTableProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedMandataire, setSelectedMandataire] = useState<string>('all');
  const [mandataireStats, setMandataireStats] = useState<MandataireStats[]>([]);
  const [destinationStats, setDestinationStats] = useState<DestinationStats[]>([]);
  const [truckStats, setTruckStats] = useState<TruckStats[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [mandatairesList, setMandatairesList] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch ventes with mandataires
        const { data: ventes, error } = await supabase
          .from('ventes_mandataires')
          .select(`
            *,
            mandataires:mandataire_id (id, nom)
          `)
          .gte('date', startDate)
          .lte('date', endDate);

        if (error) throw error;

        // Extract unique clients
        const uniqueClients = [...new Set(ventes?.map(v => v.client).filter(Boolean))] as string[];
        setClients(uniqueClients.sort());

        // Extract unique mandataires
        const uniqueMandatairesMap = new Map<string, string>();
        ventes?.forEach(v => {
          const m = v.mandataires as any;
          if (m) uniqueMandatairesMap.set(m.id, m.nom);
        });
        const uniqueMandataires = Array.from(uniqueMandatairesMap.entries())
          .map(([id, nom]) => ({ id, nom }))
          .sort((a, b) => a.nom.localeCompare(b.nom));
        setMandatairesList(uniqueMandataires);

        // Calculate tonnage per mandataire
        const calculateTonnage = (v: any) => {
          const r_b6 = (v.r_b6 || 0) * 6;
          const r_b12 = (v.r_b12 || 0) * 12.5;
          const r_b28 = (v.r_b28 || 0) * 28;
          const r_b38 = (v.r_b38 || 0) * 38;
          const r_b11 = (v.r_b11_carbu || 0) * 11;
          const c_b6 = (v.c_b6 || 0) * 6;
          const c_b12 = (v.c_b12 || 0) * 12.5;
          const c_b28 = (v.c_b28 || 0) * 28;
          const c_b38 = (v.c_b38 || 0) * 38;
          const c_b11 = (v.c_b11_carbu || 0) * 11;
          return r_b6 + r_b12 + r_b28 + r_b38 + r_b11 + c_b6 + c_b12 + c_b28 + c_b38 + c_b11;
        };

        // Filter logic
        let filteredVentes = ventes;

        if (selectedClient !== 'all') {
          filteredVentes = filteredVentes?.filter(v => v.client?.toUpperCase() === selectedClient.toUpperCase()) || [];
        }

        if (selectedMandataire !== 'all') {
          filteredVentes = filteredVentes?.filter(v => (v.mandataires as any)?.id === selectedMandataire) || [];
        }

        // Group by mandataire
        const mandataireMap = new Map<string, { id: string; nom: string; tonnage: number }>();
        filteredVentes?.forEach(v => {
          const mandataire = v.mandataires as any;
          if (mandataire) {
            const key = mandataire.id;
            const existing = mandataireMap.get(key);
            const tonnage = calculateTonnage(v);
            if (existing) {
              existing.tonnage += tonnage;
            } else {
              mandataireMap.set(key, { id: mandataire.id, nom: mandataire.nom, tonnage });
            }
          }
        });

        // Calculate total and percentages
        const totalTonnage = Array.from(mandataireMap.values()).reduce((sum, m) => sum + m.tonnage, 0);
        const mandataireStatsArray: MandataireStats[] = Array.from(mandataireMap.values())
          .map(m => ({
            ...m,
            percentage: totalTonnage > 0 ? (m.tonnage / totalTonnage) * 100 : 0
          }))
          .sort((a, b) => b.tonnage - a.tonnage);

        setMandataireStats(mandataireStatsArray);

        setMandataireStats(mandataireStatsArray);

        // Group by destination (using filteredVentes)
        const destinationMap = new Map<string, { tonnage: number; livraisons: number }>();
        filteredVentes?.forEach(v => {
          if (v.destination) {
            const key = v.destination.toUpperCase();
            const existing = destinationMap.get(key);
            const tonnage = calculateTonnage(v);
            if (existing) {
              existing.tonnage += tonnage;
              existing.livraisons += 1;
            } else {
              destinationMap.set(key, { tonnage, livraisons: 1 });
            }
          }
        });

        const totalDestTonnage = Array.from(destinationMap.values()).reduce((sum, d) => sum + d.tonnage, 0);
        const destinationStatsArray: DestinationStats[] = Array.from(destinationMap.entries())
          .map(([destination, data]) => ({
            destination,
            tonnage: data.tonnage,
            livraisons: data.livraisons,
            percentage: totalDestTonnage > 0 ? (data.tonnage / totalDestTonnage) * 100 : 0
          }))
          .sort((a, b) => b.tonnage - a.tonnage);
        // Removed slice(0, 15) to show all destinations

        setDestinationStats(destinationStatsArray);

        // Group by Truck (Rotation Camions) - using filteredVentes
        const truckMap = new Map<string, { tonnage: number; dates: Set<string> }>();
        filteredVentes?.forEach(v => {
          if (v.camion) {
            const key = v.camion.toUpperCase();
            const existing = truckMap.get(key);
            const tonnage = calculateTonnage(v);
            const date = v.date.split('T')[0]; // Ensure we have YYYY-MM-DD

            if (existing) {
              existing.tonnage += tonnage;
              existing.dates.add(date);
            } else {
              truckMap.set(key, { tonnage, dates: new Set([date]) });
            }
          }
        });

        // Total tonnage for percentage calculation (based on truck stats)
        const totalTruckTonnage = Array.from(truckMap.values()).reduce((sum, t) => sum + t.tonnage, 0);

        const truckStatsArray: TruckStats[] = Array.from(truckMap.entries())
          .map(([camion, data]) => ({
            camion,
            tonnage: data.tonnage,
            rotations: data.dates.size, // 1 Rotation = 1 Unique Day
            percentage: totalTruckTonnage > 0 ? (data.tonnage / totalTruckTonnage) * 100 : 0
          }))
          .sort((a, b) => b.tonnage - a.tonnage);

        setTruckStats(truckStatsArray);

      } catch (error) {
        console.error('Error fetching mandataire stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedClient, selectedMandataire]);

  const totalMandataireTonnage = mandataireStats.reduce((sum, m) => sum + m.tonnage, 0);
  const totalDestTonnage = destinationStats.reduce((sum, d) => sum + d.tonnage, 0);
  const totalTruckTonnage = truckStats.reduce((sum, t) => sum + t.tonnage, 0);

  return (
    <div className="space-y-4">
      {/* Global Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mandataire:</span>
          <Select value={selectedMandataire} onValueChange={setSelectedMandataire}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Tous les mandataires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mandataires</SelectItem>
              {mandatairesList.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Client:</span>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Global Metrics In Header */}
        <div className="ml-auto flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</span>
            <span className="text-xl font-bold text-primary">
              {formatNumber(Math.round(totalMandataireTonnage))} <span className="text-sm font-normal text-muted-foreground">Kg</span>
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rotations</span>
            <span className="text-xl font-bold text-primary">
              {truckStats.reduce((acc, t) => acc + t.rotations, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Ventes Conditionné par Mandataire */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5 text-orange-500" />
                Ventes Conditionné par Mandataire
              </CardTitle>
            </div>
            {/* Local Filters removed */}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : mandataireStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Mandataire</TableHead>
                      <TableHead className="text-right">Tonnage (Kg)</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mandataireStats.map((m, idx) => (
                      <TableRow key={m.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">{m.nom}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatNumber(Math.round(m.tonnage))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <span className="font-medium">{m.percentage.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destinations Globales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-blue-500" />
              Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : destinationStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée pour cette période
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Destination</TableHead>
                      <TableHead className="text-right">Livraisons</TableHead>
                      <TableHead className="text-right">Tonnage</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinationStats.map((d, idx) => (
                      <TableRow key={d.destination} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell className="font-medium">{d.destination}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {d.livraisons}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600 whitespace-nowrap">
                          {formatNumber(Math.round(d.tonnage))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <span className="font-medium">{d.percentage.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rotation Camions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-green-500" />
              Rotation Camions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full justify-between">
            <div>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                </div>
              ) : truckStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[45%]">Camion</TableHead>
                        <TableHead className="text-right">Volume (Kg)</TableHead>
                        <TableHead className="text-right">Rotations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {truckStats.map((t, idx) => (
                        <TableRow key={t.camion} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                          <TableCell className="font-medium">{t.camion}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatNumber(Math.round(t.tonnage))}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {t.rotations}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  );
};

export default VentesParMandataireTable;
