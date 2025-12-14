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

const VentesParMandataireTable = ({ startDate, endDate }: VentesParMandataireTableProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [mandataireStats, setMandataireStats] = useState<MandataireStats[]>([]);
  const [destinationStats, setDestinationStats] = useState<DestinationStats[]>([]);
  const [clients, setClients] = useState<string[]>([]);

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

        // Filter by client if selected
        const filteredVentes = selectedClient === 'all' 
          ? ventes 
          : ventes?.filter(v => v.client?.toUpperCase() === selectedClient.toUpperCase());

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

        // Group by destination (all ventes, no client filter for destinations)
        const destinationMap = new Map<string, { tonnage: number; livraisons: number }>();
        ventes?.forEach(v => {
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
          .sort((a, b) => b.tonnage - a.tonnage)
          .slice(0, 15); // Top 15 destinations

        setDestinationStats(destinationStatsArray);

      } catch (error) {
        console.error('Error fetching mandataire stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedClient]);

  const totalMandataireTonnage = mandataireStats.reduce((sum, m) => sum + m.tonnage, 0);
  const totalDestTonnage = destinationStats.reduce((sum, d) => sum + d.tonnage, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Ventes Conditionné par Mandataire */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-orange-500" />
              Ventes Conditionné par Mandataire
            </CardTitle>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[180px]">
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
          {selectedClient !== 'all' && (
            <p className="text-sm text-muted-foreground mt-1">
              Filtré par client: <span className="font-semibold text-foreground">{selectedClient}</span>
            </p>
          )}
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
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 rounded-full" 
                              style={{ width: `${Math.min(m.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="font-medium w-12 text-right">{m.percentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-orange-50 border-t-2 border-orange-200">
                    <TableCell className="font-bold">CUMUL</TableCell>
                    <TableCell className="text-right font-bold text-orange-700">
                      {formatNumber(Math.round(totalMandataireTonnage))}
                    </TableCell>
                    <TableCell className="text-right font-bold">100%</TableCell>
                  </TableRow>
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
            Destinations (Top 15)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Répartition des livraisons par destination
          </p>
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
                    <TableHead className="w-[45%]">Destination</TableHead>
                    <TableHead className="text-right">Livraisons</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${Math.min(d.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="font-medium w-12 text-right">{d.percentage.toFixed(1)}%</span>
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
    </div>
  );
};

export default VentesParMandataireTable;
