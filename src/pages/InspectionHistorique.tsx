import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, FileText, Download } from 'lucide-react';
import { useInspectionReferentiel, useRondeHistory } from '@/hooks/useInspection';
import { calculateGlobalKPI, getKPIColor, formatSemaineISO, calculateDisponibilite } from '@/utils/inspection';
import { generateInspectionPDF } from '@/utils/inspectionReport';
import InspectionTrendChart from '@/components/inspection/InspectionTrendChart';
import type { InspectionLigneRonde, WeeklyTrendPoint, GlobalKPI } from '@/types/inspection';
import { toast } from 'sonner';

const STATUT_BADGE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  EN_COURS: { label: 'En cours', variant: 'default' },
  EN_ATTENTE_VALIDATION: { label: 'En attente', variant: 'secondary' },
  VALIDEE: { label: 'Validée', variant: 'outline' },
};

export default function InspectionHistorique() {
  const navigate = useNavigate();
  const { zones, sousZones, equipements, loading: refLoading } = useInspectionReferentiel();
  const { rondes, loading: histLoading } = useRondeHistory(52);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trendData, setTrendData] = useState<WeeklyTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Build trend data from validated rondes
  useEffect(() => {
    if (refLoading || histLoading) return;
    (async () => {
      setTrendLoading(true);
      const validatedRondes = rondes.filter(r => r.statut === 'VALIDEE').slice(0, 12).reverse();

      const points: WeeklyTrendPoint[] = [];
      for (const r of validatedRondes) {
        const { data: rondeLignes } = await supabase
          .from('inspection_lignes_ronde')
          .select('*')
          .eq('ronde_id', r.id);

        if (!rondeLignes) continue;
        const typedLignes = rondeLignes as InspectionLigneRonde[];

        const kpi = calculateGlobalKPI(typedLignes, equipements, zones, sousZones);

        const zoneMap: Record<string, number> = {};
        kpi.zones.forEach(z => { zoneMap[z.zone_nom] = z.disponibilite_pct; });

        points.push({
          semaine: r.semaine_iso,
          disponibilite_globale: kpi.disponibilite_globale,
          zones: zoneMap,
        });
      }

      setTrendData(points);
      setTrendLoading(false);
    })();
  }, [refLoading, histLoading, rondes, zones, sousZones, equipements]);

  const filteredRondes = useMemo(() => {
    if (statusFilter === 'all') return rondes;
    return rondes.filter(r => r.statut === statusFilter);
  }, [rondes, statusFilter]);

  const handleDownloadPDF = async (rondeId: string) => {
    setGeneratingId(rondeId);
    try {
      const ronde = rondes.find(r => r.id === rondeId);
      if (!ronde) return;

      const { data: rondeLignes } = await supabase
        .from('inspection_lignes_ronde')
        .select('*')
        .eq('ronde_id', rondeId);

      if (!rondeLignes) return;
      const typedLignes = rondeLignes as InspectionLigneRonde[];
      const kpi = calculateGlobalKPI(typedLignes, equipements, zones, sousZones);

      await generateInspectionPDF(ronde, typedLignes, zones, sousZones, equipements, kpi);
      toast.success('Rapport PDF téléchargé');
    } catch (err) {
      toast.error('Erreur lors de la génération');
      console.error(err);
    }
    setGeneratingId(null);
  };

  const loading = refLoading || histLoading;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/inspection')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Historique des Inspections</h1>
            <p className="text-xs text-muted-foreground">Tendances et rondes passées</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Trend chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tendance — 12 dernières semaines</CardTitle>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <InspectionTrendChart data={trendData} height={300} />
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="VALIDEE">Validées</SelectItem>
                  <SelectItem value="EN_ATTENTE_VALIDATION">En attente</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filteredRondes.length} ronde{filteredRondes.length > 1 ? 's' : ''}</span>
            </div>

            {/* History table */}
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semaine</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Disponibilité</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Soumis par</TableHead>
                      <TableHead>Validé par</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRondes.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune ronde</TableCell></TableRow>
                    ) : (
                      filteredRondes.map(r => {
                        const badge = STATUT_BADGE_CONFIG[r.statut];
                        const disp = r.disponibilite_globale != null ? Number(r.disponibilite_globale) : null;
                        const color = disp !== null ? getKPIColor(disp) : null;
                        const colorClass = color === 'green' ? 'text-green-700' : color === 'orange' ? 'text-orange-600' : color === 'red' ? 'text-red-600' : '';

                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium text-sm">{r.semaine_iso}</TableCell>
                            <TableCell><Badge variant={badge?.variant}>{badge?.label}</Badge></TableCell>
                            <TableCell className={`text-right font-semibold ${colorClass}`}>
                              {disp !== null ? `${disp.toFixed(1)}%` : '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {r.nb_points_remplis}/{r.nb_points_total}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.soumis_par || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.valide_par || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Voir"
                                  onClick={() => {
                                    if (r.statut === 'EN_COURS') navigate(`/inspection/ronde/${r.id}`);
                                    else navigate(`/inspection/ronde/${r.id}/validation`);
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                                {r.statut === 'VALIDEE' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Télécharger PDF"
                                    disabled={generatingId === r.id}
                                    onClick={() => handleDownloadPDF(r.id)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
