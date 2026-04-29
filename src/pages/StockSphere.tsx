import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Save, History, LogOut, Printer, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SphereStockBlock } from '@/components/sphere-stock/SphereStockBlock';
import { GlobalSummaryBar } from '@/components/sphere-stock/GlobalSummaryBar';
import { StockSpherePrint } from '@/components/sphere-stock/StockSpherePrint';
import { useSphereStock } from '@/hooks/useSphereStock';
import { useAppAuth } from '@/hooks/useAppAuth';
import {
  computeGlobalSummary,
  EMPTY_SPHERE_INPUT,
  SPHERE_IDS,
  type SphereId,
  type SphereInputStrings,
} from '@/utils/sphereStockCompute';
import { buildRandomSphereInput } from '@/utils/sphereStockRandom';
import PasswordGate from '@/components/PasswordGate';
import { supabase } from '@/integrations/supabase/client';

interface LoadedSession {
  id: string;
  user_name: string;
  spheres: Record<SphereId, { input?: SphereInputStrings }>;
  created_at: string;
}

export default function StockSphere() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('session');

  const { session, isAuthenticated, logout } = useAppAuth();
  const [, setAuthTick] = useState(0);

  const s01 = useSphereStock('S01');
  const s02 = useSphereStock('S02');
  const s03 = useSphereStock('S03');
  const sphereByIdResult: Record<SphereId, ReturnType<typeof useSphereStock>> = {
    S01: s01,
    S02: s02,
    S03: s03,
  };

  const summary = useMemo(
    () => computeGlobalSummary([s01.result, s02.result, s03.result]),
    [s01.result, s02.result, s03.result],
  );

  const [saving, setSaving] = useState(false);
  const [showDevButton, setShowDevButton] = useState(false);
  const [editingSession, setEditingSession] = useState<LoadedSession | null>(null);

  // ---- Ctrl+Shift+Z : révèle le bouton dev de remplissage aléatoire ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Sur les claviers FR, "Z" peut être Y selon le layout. On accepte les deux.
      const k = e.key.toLowerCase();
      if (e.ctrlKey && e.shiftKey && (k === 'z' || k === 'w')) {
        e.preventDefault();
        setShowDevButton((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fillRandom = () => {
    s01.setAll(buildRandomSphereInput('S01'));
    s02.setAll(buildRandomSphereInput('S02'));
    s03.setAll(buildRandomSphereInput('S03'));
    toast.success('Données aléatoires injectées dans les 3 sphères');
  };

  // ---- Edit mode : charger une session existante via ?session=<id> ----
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!editId || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('stock_sphere_sessions')
        .select('id, user_name, spheres, created_at')
        .eq('id', editId)
        .single();
      if (error || !data) {
        toast.error("Calcul introuvable");
        setSearchParams({});
        return;
      }
      const row = data as LoadedSession;
      setEditingSession(row);
      SPHERE_IDS.forEach((id) => {
        const sphereInput = row.spheres?.[id]?.input;
        if (sphereInput)
          sphereByIdResult[id].setAll({ ...EMPTY_SPHERE_INPUT, ...sphereInput });
      });
      toast.success(`Édition du calcul du ${new Date(row.created_at).toLocaleString('fr-FR')}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const canSave =
    summary.stockJour !== null &&
    summary.creuxTotal !== null &&
    !!session;

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const spheres = SPHERE_IDS.reduce<Record<string, unknown>>((acc, id) => {
        const { input, result } = sphereByIdResult[id];
        acc[id] = { input, result };
        return acc;
      }, {});

      const payload = {
        user_id: session.user_id,
        user_name: session.user_name,
        spheres,
        stock_jour_kg: summary.stockJour,
        stock_exploitable_kg: summary.stockExploitable,
        creux_total_kg: summary.creuxTotal,
      };

      let error;
      if (editingSession) {
        ({ error } = await (supabase as any)
          .from('stock_sphere_sessions')
          .update(payload)
          .eq('id', editingSession.id));
      } else {
        ({ error } = await (supabase as any)
          .from('stock_sphere_sessions')
          .insert(payload));
      }

      if (error) {
        console.error(error);
        toast.error("Échec de l'enregistrement");
      } else {
        toast.success(editingSession ? 'Calcul mis à jour' : 'Calcul enregistré');
        if (editingSession) {
          setEditingSession(null);
          setSearchParams({});
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setAuthTick((t) => t + 1)} />;
  }

  const printSpheres: Record<SphereId, { input: SphereInputStrings; result: typeof s01.result }> = {
    S01: { input: s01.input, result: s01.result },
    S02: { input: s02.input, result: s02.result },
    S03: { input: s03.input, result: s03.result },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ---------- Écran (caché à l'impression) ---------- */}
      <div className="print:hidden flex flex-col flex-1">
        <header className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Stock sphères butane
                  {editingSession && (
                    <span className="ml-2 text-xs font-normal text-orange-500">
                      (édition d'un calcul du {new Date(editingSession.created_at).toLocaleDateString('fr-FR')})
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Calcul temps réel · S01 · S02 · S03
                  {session && (
                    <>
                      {' · '}
                      <span className="font-medium text-foreground">
                        {session.user_name}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showDevButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillRandom}
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  title="Remplissage aléatoire (debug — Ctrl+Shift+Z)"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Random
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={summary.stockJour === null}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Imprimer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/stock-sphere-history')}
              >
                <History className="h-4 w-4 mr-1.5" />
                Historique
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
                <Save className="h-4 w-4 mr-1.5" />
                {saving
                  ? 'Enregistrement…'
                  : editingSession
                    ? 'Mettre à jour'
                    : 'Enregistrer'}
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} title="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SphereStockBlock sphereId="S01" sphere={s01} />
            <SphereStockBlock sphereId="S02" sphere={s02} />
            <SphereStockBlock sphereId="S03" sphere={s03} />
          </div>
        </main>

        <GlobalSummaryBar summary={summary} />
      </div>

      {/* ---------- Vue impression (visible uniquement print) ---------- */}
      <div className="hidden print:block">
        <StockSpherePrint
          spheres={printSpheres}
          summary={summary}
          occurredAt={new Date()}
        />
      </div>
    </div>
  );
}
