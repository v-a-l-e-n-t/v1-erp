import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RotateCcw, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useInspectionReferentiel, useRondeById, syncAnomalies } from '@/hooks/useInspection';
import { formatSemaineISO, calculateGlobalKPI, getKPIColor } from '@/utils/inspection';
import InspectionKPICards from '@/components/inspection/InspectionKPICards';
import { generateInspectionPDF } from '@/utils/inspectionReport';
import type { GlobalKPI, StatutEquipement, InspectionAnomalie } from '@/types/inspection';

const STATUT_LABELS: Record<StatutEquipement, { label: string; color: string }> = {
  OPERATIONNEL: { label: 'Opérationnel', color: 'bg-green-100 text-green-800' },
  DEGRADE: { label: 'Dégradé', color: 'bg-orange-100 text-orange-800' },
  HORS_SERVICE: { label: 'Hors Service', color: 'bg-red-100 text-red-800' },
};

const ZONE_COLOR_MAP: Record<string, string> = {
  green: 'border-green-300 bg-green-50/30',
  orange: 'border-orange-300 bg-orange-50/30',
  red: 'border-red-300 bg-red-50/30',
};

export default function InspectionValidation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { zones, sousZones, equipements, loading: refLoading } = useInspectionReferentiel();
  const { ronde, lignes, loading: rondeLoading, refresh } = useRondeById(id);
  const [commentaire, setCommentaire] = useState('');
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (ronde?.commentaire_global) setCommentaire(ronde.commentaire_global);
  }, [ronde?.commentaire_global]);

  // Fetch previous ronde for delta
  const [prevDisp, setPrevDisp] = useState<number | null>(null);
  useEffect(() => {
    if (!ronde) return;
    (async () => {
      const { data } = await supabase
        .from('inspection_rondes')
        .select('disponibilite_globale')
        .lt('semaine_iso', ronde.semaine_iso)
        .eq('statut', 'VALIDEE')
        .order('semaine_iso', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPrevDisp(data?.disponibilite_globale ?? null);
    })();
  }, [ronde?.semaine_iso]);

  const kpi: GlobalKPI | null = useMemo(() => {
    if (!ronde || lignes.length === 0) return null;
    return calculateGlobalKPI(lignes, equipements, zones, sousZones, prevDisp);
  }, [lignes, equipements, zones, sousZones, prevDisp, ronde]);

  const handleReturnToEdit = async () => {
    if (!ronde) return;
    await supabase.from('inspection_rondes').update({
      statut: 'EN_COURS',
      date_soumission: null,
    }).eq('id', ronde.id);
    toast.success('Ronde renvoyée en édition');
    navigate(`/form-maintenance/ronde/${ronde.id}`);
  };

  const handleValidate = async () => {
    if (!ronde || !kpi) return;
    setValidating(true);
    const userName = localStorage.getItem('user_name') || 'Responsable';

    const { error } = await supabase.from('inspection_rondes').update({
      statut: 'VALIDEE',
      date_validation: new Date().toISOString(),
      valide_par: userName,
      commentaire_global: commentaire || null,
      disponibilite_globale: kpi.disponibilite_globale,
    }).eq('id', ronde.id);

    setValidating(false);
    if (error) {
      toast.error('Erreur lors de la validation');
      return;
    }

    // Synchroniser les anomalies
    const result = await syncAnomalies(ronde.id, ronde.semaine_iso, lignes, equipements);
    if (result.opened > 0 || result.closed > 0) {
      toast.info(`Anomalies : ${result.opened} ouverte(s), ${result.closed} resolue(s)`);
    }

    toast.success('Ronde validée avec succès');
    await refresh();
  };

  const handleGenerateReport = async () => {
    if (!ronde || !kpi) return;
    setGenerating(true);
    try {
      // Charger les anomalies ouvertes pour le PDF
      const { data: openAnoms } = await supabase
        .from('inspection_anomalies')
        .select('*')
        .eq('statut', 'OUVERTE')
        .order('urgent', { ascending: false })
        .order('date_ouverture', { ascending: true });

      await generateInspectionPDF(ronde, lignes, zones, sousZones, equipements, kpi, (openAnoms as InspectionAnomalie[]) ?? []);
      toast.success('Rapport PDF généré');
    } catch (err) {
      toast.error('Erreur lors de la génération du rapport');
      console.error(err);
    }
    setGenerating(false);
  };

  const handleValidateAndGenerate = async () => {
    if (!ronde || !kpi) return;
    setValidating(true);
    const userName = localStorage.getItem('user_name') || 'Responsable';

    const { error } = await supabase.from('inspection_rondes').update({
      statut: 'VALIDEE',
      date_validation: new Date().toISOString(),
      valide_par: userName,
      commentaire_global: commentaire || null,
      disponibilite_globale: kpi.disponibilite_globale,
    }).eq('id', ronde.id);

    setValidating(false);
    if (error) {
      toast.error('Erreur lors de la validation');
      return;
    }

    // Synchroniser les anomalies
    const result = await syncAnomalies(ronde.id, ronde.semaine_iso, lignes, equipements);
    if (result.opened > 0 || result.closed > 0) {
      toast.info(`Anomalies : ${result.opened} ouverte(s), ${result.closed} resolue(s)`);
    }

    toast.success('Ronde validée');
    await refresh();
    await handleGenerateReport();
  };

  const loading = refLoading || rondeLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!ronde || !kpi) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">Ronde introuvable</p>
        <Button onClick={() => navigate('/form-maintenance')}>Retour</Button>
      </div>
    );
  }

  const isWaitingValidation = ronde.statut === 'EN_ATTENTE_VALIDATION';
  const isValidated = ronde.statut === 'VALIDEE';
  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);

  // Anomalies list for actions table
  const anomalies = lignes
    .filter(l => l.statut === 'DEGRADE' || l.statut === 'HORS_SERVICE')
    .map(l => {
      const eq = equipements.find(e => e.id === l.equipement_id);
      const zone = eq ? zones.find(z => z.id === eq.zone_id) : null;
      const sz = eq?.sous_zone_id ? sousZones.find(s => s.id === eq.sous_zone_id) : null;
      return { ...l, equipement: eq, zone, sousZone: sz };
    })
    .sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      if (a.statut === 'HORS_SERVICE' && b.statut !== 'HORS_SERVICE') return -1;
      if (a.statut !== 'HORS_SERVICE' && b.statut === 'HORS_SERVICE') return 1;
      return 0;
    });

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <InspectionKPICards kpi={kpi} />

        {/* Zone availability bars */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Disponibilité par zone</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {kpi.zones.map(z => (
              <div key={z.zone_id} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate">{z.zone_libelle}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      z.couleur === 'green' ? 'bg-green-500' : z.couleur === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(z.disponibilite_pct, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-14 text-right ${
                  z.couleur === 'green' ? 'text-green-700' : z.couleur === 'orange' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {z.disponibilite_pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Zone details (read-only) */}
        {activeZones.map(zone => {
          const zoneKPI = kpi.zones.find(z => z.zone_id === zone.id);
          if (!zoneKPI) return null;
          const zoneEquips = equipements.filter(e => e.zone_id === zone.id && e.actif).sort((a, b) => a.ordre - b.ordre);
          const zoneSZ = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);

          return (
            <Card key={zone.id} className={`border ${ZONE_COLOR_MAP[zoneKPI.couleur] || ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{zone.libelle}</CardTitle>
                  <Badge className={zoneKPI.couleur === 'green' ? 'bg-green-100 text-green-800' : zoneKPI.couleur === 'orange' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}>
                    {zoneKPI.disponibilite_pct.toFixed(0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {zoneSZ.length > 0 ? (
                  <div className="space-y-3">
                    {zoneSZ.map(sz => {
                      const szKPI = zoneKPI.sous_zones?.find(s => s.sous_zone_id === sz.id);
                      const szEquips = zoneEquips.filter(e => e.sous_zone_id === sz.id);
                      return (
                        <div key={sz.id}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{sz.libelle}</span>
                            {szKPI && <Badge variant="outline" className="text-[10px]">{szKPI.disponibilite_pct.toFixed(0)}%</Badge>}
                          </div>
                          <Table>
                            <TableBody>
                              {szEquips.map(eq => {
                                const l = lignes.find(x => x.equipement_id === eq.id);
                                const st = l?.statut;
                                const cfg = st ? STATUT_LABELS[st] : null;
                                return (
                                  <TableRow key={eq.id} className={l?.urgent ? 'bg-red-50' : ''}>
                                    <TableCell className="text-sm py-1.5">{eq.nom}</TableCell>
                                    <TableCell className="w-28 py-1.5">
                                      {cfg ? <Badge className={cfg.color}>{cfg.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground py-1.5 max-w-[200px] truncate">
                                      {l?.commentaire || ''}
                                    </TableCell>
                                    <TableCell className="w-8 py-1.5">
                                      {l?.urgent && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Table>
                    <TableBody>
                      {zoneEquips.filter(e => !e.sous_zone_id).map(eq => {
                        const l = lignes.find(x => x.equipement_id === eq.id);
                        const st = l?.statut;
                        const cfg = st ? STATUT_LABELS[st] : null;
                        return (
                          <TableRow key={eq.id} className={l?.urgent ? 'bg-red-50' : ''}>
                            <TableCell className="text-sm py-1.5">{eq.nom}</TableCell>
                            <TableCell className="w-28 py-1.5">
                              {cfg ? <Badge className={cfg.color}>{cfg.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-1.5 max-w-[200px] truncate">
                              {l?.commentaire || ''}
                            </TableCell>
                            <TableCell className="w-8 py-1.5">
                              {l?.urgent && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Actions table */}
        {anomalies.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions attendues de la Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead className="w-16">Priorité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map(a => {
                    const st = a.statut ? STATUT_LABELS[a.statut] : null;
                    return (
                      <TableRow key={a.id} className={a.urgent ? 'bg-red-50' : ''}>
                        <TableCell className="text-sm">
                          {a.zone?.libelle || '—'}
                          {a.sousZone ? ` / ${a.sousZone.libelle}` : ''}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{a.equipement?.nom || '—'}</TableCell>
                        <TableCell>{st && <Badge className={st.color}>{st.label}</Badge>}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{a.commentaire || '—'}</TableCell>
                        <TableCell>
                          {a.urgent
                            ? <Badge className="bg-red-600 text-white">URGENT</Badge>
                            : <span className="text-xs text-muted-foreground">Normal</span>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Responsable comment */}
        <Card>
          <CardContent className="pt-4">
            <Label>Remarque du responsable (optionnel)</Label>
            <Textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Ajouter une remarque générale..."
              rows={3}
              disabled={isValidated}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-end pb-8">
          {isWaitingValidation && (
            <>
              <Button variant="outline" onClick={handleReturnToEdit}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Retourner en édition
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={validating}>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Valider et générer le rapport
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Valider cette ronde ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La ronde sera marquée comme validée et le rapport PDF sera généré.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleValidateAndGenerate}>Valider</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {isValidated && (
            <Button onClick={handleGenerateReport} disabled={generating}>
              <FileText className="h-4 w-4 mr-1.5" />
              {generating ? 'Génération...' : 'Télécharger le rapport PDF'}
            </Button>
          )}
        </div>
    </div>
  );
}
