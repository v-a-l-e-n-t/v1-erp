import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History as HistoryIcon,
  Pencil,
  Trash2,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppAuth } from '@/hooks/useAppAuth';
import PasswordGate from '@/components/PasswordGate';
import { ReceptionPrint } from '@/components/reception/ReceptionPrint';
import { formatFr } from '@/utils/sphereStockCompute';
import {
  EMPTY_MARKETER_SPLIT,
  EMPTY_RECEPTION_STATE,
  type MarketerSplit,
  type ReceptionResult,
  type ReceptionStateInputs,
  type SphereId,
} from '@/utils/receptionCompute';
import type { ReceptionHeader } from '@/pages/Reception';

interface SessionRow {
  id: string;
  user_name: string;
  created_at: string;
  sphere_id: SphereId;
  numero_reception: string | null;
  origine_navire: string | null;
  inputs_avant: ReceptionStateInputs;
  inputs_apres: ReceptionStateInputs;
  results: ReceptionResult;
  marketer_repartition: MarketerSplit | null;
  masse_transferee_kg: number | null;
  // Header fields used for print
  depot: string | null;
  produit: string | null;
  inspecteur: string | null;
  date_mise_sous_douane: string | null;
  date_debut_transfert: string | null;
  date_fin_transfert: string | null;
  date_deblocage: string | null;
  date_jauge_controle: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceptionHistory() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppAuth();
  const [, setAuthTick] = useState(0);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printRow, setPrintRow] = useState<SessionRow | null>(null);

  const fetchRows = async () => {
    setError(null);
    const { data, error: e } = await (supabase as any)
      .from('reception_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (e) setError(e.message);
    else setRows((data ?? []) as SessionRow[]);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRows();
  }, [isAuthenticated]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error: e } = await (supabase as any)
      .from('reception_sessions')
      .delete()
      .eq('id', deletingId);
    if (e) {
      toast.error('Échec de la suppression');
    } else {
      toast.success('Réception supprimée');
      setRows((prev) => (prev ? prev.filter((r) => r.id !== deletingId) : prev));
    }
    setDeletingId(null);
  };

  const handlePrint = (row: SessionRow) => {
    setPrintRow(row);
    setTimeout(() => window.print(), 50);
  };

  useEffect(() => {
    const after = () => setPrintRow(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const printPayload = useMemo(() => {
    if (!printRow) return null;
    const header: ReceptionHeader = {
      numero_reception: printRow.numero_reception ?? '',
      depot: printRow.depot ?? '',
      produit: printRow.produit ?? '',
      origine_navire: printRow.origine_navire ?? '',
      inspecteur: printRow.inspecteur ?? '',
      date_mise_sous_douane: printRow.date_mise_sous_douane ?? '',
      date_debut_transfert: printRow.date_debut_transfert ?? '',
      date_fin_transfert: printRow.date_fin_transfert ?? '',
      date_deblocage: printRow.date_deblocage ?? '',
      date_jauge_controle: printRow.date_jauge_controle ?? '',
    };
    return {
      sphereId: printRow.sphere_id,
      header,
      avantInputs: { ...EMPTY_RECEPTION_STATE, ...(printRow.inputs_avant ?? {}) },
      apresInputs: { ...EMPTY_RECEPTION_STATE, ...(printRow.inputs_apres ?? {}) },
      result: printRow.results,
      marketer: { ...EMPTY_MARKETER_SPLIT, ...(printRow.marketer_repartition ?? {}) },
      occurredAt: new Date(printRow.created_at),
    };
  }, [printRow]);

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setAuthTick((t) => t + 1)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <header className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/reception')}>
                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Retour</span>
              </Button>
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <HistoryIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Historique des réceptions
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  200 dernières réceptions enregistrées
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {error && (
            <Card className="border-destructive/40 mb-4">
              <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / heure</TableHead>
                    <TableHead>N° réception</TableHead>
                    <TableHead>Sphère</TableHead>
                    <TableHead>Navire</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-right">Masse transférée</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows === null && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Chargement…
                      </TableCell>
                    </TableRow>
                  )}
                  {rows?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Aucune réception enregistrée pour l'instant.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows?.map((r) => {
                    const negative = (r.masse_transferee_kg ?? 0) < 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono tabular-nums text-xs">
                          {formatDateTime(r.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.numero_reception || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-orange-500">{r.sphere_id}</span>
                        </TableCell>
                        <TableCell className="text-xs">{r.origine_navire || '—'}</TableCell>
                        <TableCell className="font-medium text-xs">{r.user_name}</TableCell>
                        <TableCell
                          className={`text-right font-mono tabular-nums font-bold ${
                            negative ? 'text-red-600' : ''
                          }`}
                        >
                          {formatFr(r.masse_transferee_kg, 0)} kg
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Imprimer" onClick={() => handlePrint(r)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Éditer"
                              onClick={() => navigate(`/reception?session=${r.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingId(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Vue impression */}
      {printPayload && (
        <div className="hidden print:block">
          <ReceptionPrint {...printPayload} />
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réception ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La ligne d'historique disparaîtra définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
