import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useInspectionReferentiel, useRondeById, useAutoSaveLigne } from '@/hooks/useInspection';
import { formatSemaineISO, calculateGlobalKPI } from '@/utils/inspection';
import RondeProgressBar from '@/components/inspection/RondeProgressBar';
import RondeZoneSection from '@/components/inspection/RondeZoneSection';
import RondeAutoSaveIndicator from '@/components/inspection/RondeAutoSaveIndicator';
import type { LigneRondeUpdate } from '@/types/inspection';

const STATUT_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  EN_COURS: { label: 'En cours', variant: 'default' },
  EN_ATTENTE_VALIDATION: { label: 'En attente de validation', variant: 'secondary' },
  VALIDEE: { label: 'Validée', variant: 'outline' },
};

export default function InspectionRonde() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { zones, sousZones, equipements, loading: refLoading } = useInspectionReferentiel();
  const { ronde, lignes, loading: rondeLoading, refresh, setLignes } = useRondeById(id);
  const { saveLigne, saving, lastSaved } = useAutoSaveLigne(id);
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleZone = (zoneId: string) => {
    setOpenZones(prev => {
      const next = new Set(prev);
      next.has(zoneId) ? next.delete(zoneId) : next.add(zoneId);
      return next;
    });
  };

  const handleChange = useCallback((update: LigneRondeUpdate) => {
    // Optimistic update local state
    setLignes(prev => prev.map(l =>
      l.equipement_id === update.equipement_id
        ? { ...l, statut: update.statut, commentaire: update.commentaire, urgent: update.urgent }
        : l
    ));
    saveLigne(update);
  }, [saveLigne, setLignes]);

  const filledCount = lignes.filter(l => l.statut !== null).length;
  const totalCount = lignes.length;
  const isEditable = ronde?.statut === 'EN_COURS';

  const handleSubmit = async () => {
    if (!ronde) return;

    if (filledCount < totalCount) {
      const confirmed = window.confirm(
        `${filledCount}/${totalCount} points renseignés. Voulez-vous soumettre quand même ?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);

    // Calculate KPI
    const kpi = calculateGlobalKPI(lignes, equipements, zones, sousZones);
    const userName = localStorage.getItem('user_name') || 'Opérateur';

    const { error } = await supabase
      .from('inspection_rondes')
      .update({
        statut: 'EN_ATTENTE_VALIDATION',
        date_soumission: new Date().toISOString(),
        soumis_par: userName,
        nb_points_remplis: filledCount,
        disponibilite_globale: kpi.disponibilite_globale,
      })
      .eq('id', ronde.id);

    setSubmitting(false);

    if (error) {
      toast.error('Erreur lors de la soumission');
      return;
    }

    toast.success('Ronde soumise pour validation');
    navigate(`/form-maintenance/ronde/${ronde.id}/validation`);
  };

  const loading = refLoading || rondeLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!ronde) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">Ronde introuvable</p>
        <Button onClick={() => navigate('/form-maintenance')}>Retour</Button>
      </div>
    );
  }

  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);
  const badge = STATUT_BADGE[ronde.statut] || STATUT_BADGE.EN_COURS;

  return (
    <div>
      {/* Progress bar */}
      <div className="container mx-auto px-3 sm:px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-sm text-muted-foreground">{formatSemaineISO(ronde.semaine_iso)}</span>
        </div>
        <RondeProgressBar filled={filledCount} total={totalCount} />
      </div>

      {/* Body */}
      <div className="container mx-auto px-3 sm:px-4 py-4 space-y-3 pb-24">
        {activeZones.map(zone => (
          <RondeZoneSection
            key={zone.id}
            zone={zone}
            sousZones={sousZones}
            equipements={equipements}
            lignes={lignes}
            disabled={!isEditable}
            isOpen={openZones.has(zone.id)}
            onToggle={() => toggleZone(zone.id)}
            onChange={handleChange}
          />
        ))}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t bg-white py-3 px-4 z-10">
        <div className="flex items-center justify-between">
          <RondeAutoSaveIndicator saving={saving} lastSaved={lastSaved} />

          {isEditable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={submitting}>
                  <Send className="h-4 w-4 mr-1.5" />
                  Soumettre pour validation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Soumettre cette ronde ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {filledCount < totalCount
                      ? `Attention : ${filledCount}/${totalCount} points renseignés. La ronde sera soumise en l'état.`
                      : `Tous les ${totalCount} points sont renseignés. La ronde sera envoyée pour validation par le responsable.`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Soumettre</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {ronde.statut === 'EN_ATTENTE_VALIDATION' && (
            <Button onClick={() => navigate(`/form-maintenance/ronde/${ronde.id}/validation`)}>
              Voir la validation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
