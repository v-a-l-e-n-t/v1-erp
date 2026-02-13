import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Settings, History, ClipboardCheck, ArrowRight, FileText } from 'lucide-react';
import { useInspectionReferentiel, useCurrentRonde, useRondeHistory } from '@/hooks/useInspection';
import { getCurrentISOWeek, formatSemaineISO, calculateGlobalKPI, getKPIColor } from '@/utils/inspection';
import InspectionKPICards from '@/components/inspection/InspectionKPICards';
import type { GlobalKPI, InspectionLigneRonde } from '@/types/inspection';

const STATUT_BADGE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  EN_COURS: { label: 'En cours', variant: 'default' },
  EN_ATTENTE_VALIDATION: { label: 'En attente', variant: 'secondary' },
  VALIDEE: { label: 'Validée', variant: 'outline' },
};

export default function InspectionDashboard() {
  const navigate = useNavigate();
  const { zones, sousZones, equipements, loading: refLoading } = useInspectionReferentiel();
  const { ronde: currentRonde, lignes: currentLignes, loading: currentLoading, createRonde } = useCurrentRonde();
  const { rondes: history, loading: histLoading } = useRondeHistory(5);
  const [creating, setCreating] = useState(false);

  // Last validated ronde KPI
  const [lastKPI, setLastKPI] = useState<GlobalKPI | null>(null);
  const [lastKPILoading, setLastKPILoading] = useState(true);

  useEffect(() => {
    if (refLoading) return;
    (async () => {
      setLastKPILoading(true);
      // Find last validated ronde
      const { data: lastRonde } = await supabase
        .from('inspection_rondes')
        .select('*')
        .eq('statut', 'VALIDEE')
        .order('semaine_iso', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRonde) {
        const { data: lastLignes } = await supabase
          .from('inspection_lignes_ronde')
          .select('*')
          .eq('ronde_id', lastRonde.id);

        // Get previous for delta
        const { data: prevRonde } = await supabase
          .from('inspection_rondes')
          .select('disponibilite_globale')
          .eq('statut', 'VALIDEE')
          .lt('semaine_iso', lastRonde.semaine_iso)
          .order('semaine_iso', { ascending: false })
          .limit(1)
          .maybeSingle();

        const kpi = calculateGlobalKPI(
          (lastLignes as InspectionLigneRonde[]) ?? [],
          equipements,
          zones,
          sousZones,
          prevRonde?.disponibilite_globale ?? null
        );
        setLastKPI(kpi);
      }
      setLastKPILoading(false);
    })();
  }, [refLoading, zones, sousZones, equipements]);

  const handleCreateRonde = async () => {
    setCreating(true);
    const rondeId = await createRonde();
    setCreating(false);
    if (rondeId) {
      navigate(`/inspection/ronde/${rondeId}`);
    }
  };

  const loading = refLoading || currentLoading;
  const currentWeek = getCurrentISOWeek();
  const filledCount = currentLignes.filter(l => l.statut !== null).length;
  const totalCount = currentLignes.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800">Inspection Hebdomadaire</h1>
              <p className="text-xs text-muted-foreground">Ronde d'état des installations du dépôt GPL</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/inspection/configuration')}>
            <Settings className="h-4 w-4 mr-1" /> Config
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Current ronde status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Ronde de la semaine — {formatSemaineISO(currentWeek)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRonde ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUT_BADGE_CONFIG[currentRonde.statut]?.variant || 'default'}>
                          {STATUT_BADGE_CONFIG[currentRonde.statut]?.label || currentRonde.statut}
                        </Badge>
                        {currentRonde.statut === 'EN_COURS' && (
                          <span className="text-sm text-muted-foreground">
                            {filledCount}/{totalCount} points renseignés
                          </span>
                        )}
                      </div>
                      {currentRonde.disponibilite_globale != null && (
                        <p className="text-sm">
                          Disponibilité : <span className="font-semibold">{Number(currentRonde.disponibilite_globale).toFixed(1)}%</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {currentRonde.statut === 'EN_COURS' && (
                        <Button onClick={() => navigate(`/inspection/ronde/${currentRonde.id}`)}>
                          Continuer la saisie <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                      {currentRonde.statut === 'EN_ATTENTE_VALIDATION' && (
                        <Button onClick={() => navigate(`/inspection/ronde/${currentRonde.id}/validation`)}>
                          Valider <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                      {currentRonde.statut === 'VALIDEE' && (
                        <Button variant="outline" onClick={() => navigate(`/inspection/ronde/${currentRonde.id}/validation`)}>
                          <FileText className="h-4 w-4 mr-1" /> Voir le rapport
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Aucune ronde démarrée pour cette semaine.</p>
                    <Button onClick={handleCreateRonde} disabled={creating}>
                      <Plus className="h-4 w-4 mr-1" />
                      {creating ? 'Création...' : 'Démarrer la ronde'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last validated KPIs */}
            {lastKPI && !lastKPILoading && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Dernière ronde validée</h2>
                <InspectionKPICards kpi={lastKPI} />
              </div>
            )}

            {/* Recent history */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Rondes récentes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/inspection/historique')}>
                    <History className="h-4 w-4 mr-1" /> Historique complet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {histLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune ronde enregistrée.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Semaine</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Disponibilité</TableHead>
                        <TableHead>Opérateur</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(r => {
                        const badge = STATUT_BADGE_CONFIG[r.statut];
                        const disp = r.disponibilite_globale != null ? Number(r.disponibilite_globale) : null;
                        const color = disp !== null ? getKPIColor(disp) : null;
                        const colorClass = color === 'green' ? 'text-green-700' : color === 'orange' ? 'text-orange-600' : color === 'red' ? 'text-red-600' : '';
                        return (
                          <TableRow key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => {
                            if (r.statut === 'EN_COURS') navigate(`/inspection/ronde/${r.id}`);
                            else navigate(`/inspection/ronde/${r.id}/validation`);
                          }}>
                            <TableCell className="text-sm font-medium">{r.semaine_iso}</TableCell>
                            <TableCell><Badge variant={badge?.variant}>{badge?.label}</Badge></TableCell>
                            <TableCell className={`text-right font-medium ${colorClass}`}>
                              {disp !== null ? `${disp.toFixed(1)}%` : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.soumis_par || '—'}</TableCell>
                            <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
