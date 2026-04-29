import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History as HistoryIcon,
  ChevronDown,
  ChevronRight,
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
import { StockSpherePrint } from '@/components/sphere-stock/StockSpherePrint';
import {
  EMPTY_SPHERE_INPUT,
  formatFr,
  SPHERE_IDS,
  type SphereId,
  type SphereInputStrings,
  type SphereResult,
} from '@/utils/sphereStockCompute';

interface SessionRow {
  id: string;
  user_name: string;
  created_at: string;
  spheres: Record<
    SphereId,
    {
      input?: Partial<SphereInputStrings>;
      result?: Partial<SphereResult>;
    }
  >;
  stock_jour_kg: number | null;
  stock_exploitable_kg: number | null;
  creux_total_kg: number | null;
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

const EMPTY_RESULT_FALLBACK: SphereResult = {
  volumeLiquide: null,
  volumeGazeux: null,
  densiteButaneLiq: null,
  masseVolAirGaz: null,
  pAbs: null,
  masseLiq: null,
  masseGaz: null,
  masseTotale: null,
  creux: null,
};

export default function StockSphereHistory() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppAuth();
  const [, setAuthTick] = useState(0);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printRow, setPrintRow] = useState<SessionRow | null>(null);

  const fetchRows = async () => {
    setError(null);
    const { data, error: e } = await (supabase as any)
      .from('stock_sphere_sessions')
      .select(
        'id, user_name, created_at, spheres, stock_jour_kg, stock_exploitable_kg, creux_total_kg',
      )
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
      .from('stock_sphere_sessions')
      .delete()
      .eq('id', deletingId);
    if (e) {
      toast.error('Échec de la suppression');
    } else {
      toast.success('Calcul supprimé');
      setRows((prev) => (prev ? prev.filter((r) => r.id !== deletingId) : prev));
    }
    setDeletingId(null);
  };

  const handlePrint = (row: SessionRow) => {
    setPrintRow(row);
    // Laisser React rendre le bloc d'impression avant d'ouvrir le dialogue.
    setTimeout(() => window.print(), 50);
  };

  // Après impression, on retire la ligne d'impression pour ne pas garder du DOM.
  useEffect(() => {
    const after = () => setPrintRow(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const printPayload = useMemo(() => {
    if (!printRow) return null;
    const spheres = SPHERE_IDS.reduce<
      Record<SphereId, { input: SphereInputStrings; result: SphereResult }>
    >(
      (acc, id) => {
        const s = printRow.spheres?.[id] ?? {};
        acc[id] = {
          input: { ...EMPTY_SPHERE_INPUT, ...(s.input as SphereInputStrings) },
          result: { ...EMPTY_RESULT_FALLBACK, ...(s.result as SphereResult) },
        };
        return acc;
      },
      {} as Record<SphereId, { input: SphereInputStrings; result: SphereResult }>,
    );
    return {
      spheres,
      summary: {
        stockJour: printRow.stock_jour_kg,
        stockExploitable: printRow.stock_exploitable_kg,
        creuxTotal: printRow.creux_total_kg,
      },
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
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/stock-sphere')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Retour
              </Button>
              <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <HistoryIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Historique des calculs Stock sphères
                </h1>
                <p className="text-xs text-muted-foreground">
                  200 derniers enregistrements
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {error && (
            <Card className="border-destructive/40 mb-4">
              <CardContent className="py-3 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Date / heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-right">Stock du jour</TableHead>
                    <TableHead className="text-right">Stock exploitable</TableHead>
                    <TableHead className="text-right">Creux total</TableHead>
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
                        Aucun calcul enregistré pour l'instant.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows?.map((r) => {
                    const isOpen = openId === r.id;
                    return (
                      <>
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => setOpenId(isOpen ? null : r.id)}
                        >
                          <TableCell>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-xs">
                            {formatDateTime(r.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">{r.user_name}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatFr(r.stock_jour_kg, 0)} kg
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-green-600">
                            {formatFr(r.stock_exploitable_kg, 0)} kg
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-orange-500">
                            {formatFr(r.creux_total_kg, 0)} kg
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className="flex justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Imprimer"
                                onClick={() => handlePrint(r)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Éditer"
                                onClick={() => navigate(`/stock-sphere?session=${r.id}`)}
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
                        {isOpen && (
                          <TableRow key={r.id + '-detail'} className="bg-muted/20">
                            <TableCell colSpan={7} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {SPHERE_IDS.map((id) => {
                                  const sph = r.spheres?.[id];
                                  const masse = sph?.result?.masseTotale ?? null;
                                  const creux = sph?.result?.creux ?? null;
                                  return (
                                    <div
                                      key={id}
                                      className="border rounded-md p-3 bg-background"
                                    >
                                      <div className="font-bold text-orange-500 text-sm mb-2">
                                        {id}
                                      </div>
                                      <dl className="grid grid-cols-2 gap-y-1 text-xs">
                                        <dt className="text-muted-foreground">Masse totale</dt>
                                        <dd className="text-right font-mono tabular-nums">
                                          {formatFr(masse, 0)} kg
                                        </dd>
                                        <dt className="text-muted-foreground">Creux</dt>
                                        <dd className="text-right font-mono tabular-nums">
                                          {formatFr(creux, 0)} kg
                                        </dd>
                                      </dl>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* --- Vue impression (visible uniquement print) --- */}
      {printPayload && (
        <div className="hidden print:block">
          <StockSpherePrint {...printPayload} />
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce calcul ?</AlertDialogTitle>
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
