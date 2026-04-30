import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Save,
  History,
  LogOut,
  LogIn,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ReceptionStateInputsBlock } from '@/components/reception/ReceptionStateInputs';
import { ReceptionResults } from '@/components/reception/ReceptionResults';
import { ReceptionPrint } from '@/components/reception/ReceptionPrint';
import LoginDialog from '@/components/LoginDialog';
import { useAppAuth } from '@/hooks/useAppAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPTY_MARKETER_SPLIT,
  EMPTY_RECEPTION_STATE,
  buildRandomReception,
  computeReception,
  type MarketerSplit,
  type ReceptionResult,
  type ReceptionStateInputs,
  type SphereId,
} from '@/utils/receptionCompute';

interface ReceptionHeader {
  numero_reception: string;
  depot: string;
  produit: string;
  origine_navire: string;
  inspecteur: string;
  date_mise_sous_douane: string;
  date_debut_transfert: string;
  date_fin_transfert: string;
  date_deblocage: string;
  date_jauge_controle: string;
}

const EMPTY_HEADER: ReceptionHeader = {
  numero_reception: '',
  depot: 'SAEPP',
  produit: 'BUTANE',
  origine_navire: '',
  inspecteur: '',
  date_mise_sous_douane: '',
  date_debut_transfert: '',
  date_fin_transfert: '',
  date_deblocage: '',
  date_jauge_controle: '',
};

const SPHERES: { id: SphereId; capacity: string }[] = [
  { id: 'S01', capacity: '3 323 413 L' },
  { id: 'S02', capacity: '3 330 579 L' },
  { id: 'S03', capacity: '3 332 688 L' },
];

export default function Reception() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('session');

  const { session, isAuthenticated, logout } = useAppAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingHistoryNav, setPendingHistoryNav] = useState(false);

  useEffect(() => {
    if (pendingHistoryNav && isAuthenticated) {
      setPendingHistoryNav(false);
      navigate('/reception-history');
    }
  }, [pendingHistoryNav, isAuthenticated, navigate]);

  // Étape 1 : choix de la sphère
  const [selectedSphere, setSelectedSphere] = useState<SphereId | null>(null);

  // Étape 2 : saisie
  const [header, setHeader] = useState<ReceptionHeader>(EMPTY_HEADER);
  const [avantInputs, setAvantInputs] = useState<ReceptionStateInputs>(EMPTY_RECEPTION_STATE);
  const [apresInputs, setApresInputs] = useState<ReceptionStateInputs>(EMPTY_RECEPTION_STATE);
  const [marketer, setMarketer] = useState<MarketerSplit>(EMPTY_MARKETER_SPLIT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDevButton, setShowDevButton] = useState(false);

  // Ctrl+Shift+Z (ou +W sur clavier FR) : bascule l'affichage du bouton dev
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    if (!selectedSphere) return;
    const { avant, apres } = buildRandomReception(selectedSphere);
    setAvantInputs(avant);
    setApresInputs(apres);
    toast.success('Données aléatoires injectées AVANT + APRÈS');
  };

  const result: ReceptionResult = useMemo(
    () =>
      selectedSphere
        ? computeReception(selectedSphere, avantInputs, apresInputs)
        : { avant: { volume_liquide: null, volume_gazeux: null, pression_absolue: null, densite_15C_melange: null, rho_butane_liq: null, rho_air: null, masse_liquide: null, masse_gazeuse: null, masse_totale: null }, apres: { volume_liquide: null, volume_gazeux: null, pression_absolue: null, densite_15C_melange: null, rho_butane_liq: null, rho_air: null, masse_liquide: null, masse_gazeuse: null, masse_totale: null }, masse_transferee: null },
    [selectedSphere, avantInputs, apresInputs],
  );

  // Pré-remplissage AVANT → APRÈS pour les champs identiques par construction
  const prefillFromAvant = () => {
    setApresInputs((prev) => ({
      ...prev,
      densite_recue: prev.densite_recue || avantInputs.densite_recue,
      densite_bac: prev.densite_bac || avantInputs.densite_bac,
    }));
    toast.success('Densités recopiées depuis AVANT');
  };

  // Charger une session existante (édition)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!editId || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('reception_sessions')
        .select('*')
        .eq('id', editId)
        .single();
      if (error || !data) {
        toast.error('Réception introuvable');
        setSearchParams({});
        return;
      }
      setEditingId(data.id);
      setEditingCreatedAt(data.created_at);
      setSelectedSphere(data.sphere_id as SphereId);
      setHeader({
        numero_reception: data.numero_reception ?? '',
        depot: data.depot ?? '',
        produit: data.produit ?? '',
        origine_navire: data.origine_navire ?? '',
        inspecteur: data.inspecteur ?? '',
        date_mise_sous_douane: data.date_mise_sous_douane?.slice(0, 16) ?? '',
        date_debut_transfert: data.date_debut_transfert?.slice(0, 16) ?? '',
        date_fin_transfert: data.date_fin_transfert?.slice(0, 16) ?? '',
        date_deblocage: data.date_deblocage?.slice(0, 16) ?? '',
        date_jauge_controle: data.date_jauge_controle?.slice(0, 16) ?? '',
      });
      setAvantInputs({ ...EMPTY_RECEPTION_STATE, ...(data.inputs_avant ?? {}) });
      setApresInputs({ ...EMPTY_RECEPTION_STATE, ...(data.inputs_apres ?? {}) });
      setMarketer({ ...EMPTY_MARKETER_SPLIT, ...(data.marketer_repartition ?? {}) });
      toast.success(`Édition de la réception du ${new Date(data.created_at).toLocaleString('fr-FR')}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const handleSave = async () => {
    if (!selectedSphere) return;
    setSaving(true);
    try {
      const payload = {
        user_id: session?.user_id ?? null,
        user_name: session?.user_name ?? 'Anonyme',
        sphere_id: selectedSphere,
        numero_reception: header.numero_reception || null,
        depot: header.depot || null,
        produit: header.produit || null,
        origine_navire: header.origine_navire || null,
        inspecteur: header.inspecteur || null,
        date_mise_sous_douane: header.date_mise_sous_douane || null,
        date_debut_transfert: header.date_debut_transfert || null,
        date_fin_transfert: header.date_fin_transfert || null,
        date_deblocage: header.date_deblocage || null,
        date_jauge_controle: header.date_jauge_controle || null,
        inputs_avant: avantInputs,
        inputs_apres: apresInputs,
        results: result,
        marketer_repartition: marketer,
        masse_transferee_kg: result.masse_transferee,
      };

      let error;
      if (editingId) {
        ({ error } = await (supabase as any)
          .from('reception_sessions')
          .update(payload)
          .eq('id', editingId));
      } else {
        ({ error } = await (supabase as any)
          .from('reception_sessions')
          .insert(payload));
      }
      if (error) {
        console.error(error);
        toast.error("Échec de l'enregistrement");
      } else {
        toast.success(editingId ? 'Réception mise à jour' : 'Réception enregistrée');
        if (editingId) {
          setEditingId(null);
          setEditingCreatedAt(null);
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

  const handleHistoryClick = () => {
    if (!isAuthenticated) {
      toast.info("Connecte-toi pour accéder à l'historique");
      setPendingHistoryNav(true);
      setLoginOpen(true);
      return;
    }
    navigate('/reception-history');
  };

  const handlePrint = () => window.print();

  const canSave =
    !!selectedSphere && result.masse_transferee !== null;

  /* ----------------------- Étape 1 : choix sphère ----------------------- */

  if (!selectedSphere) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card/50">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Réception butane
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Calcul de la masse transférée d'un navire vers une sphère
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleHistoryClick} title="Historique">
                <History className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Historique</span>
              </Button>
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={logout} title="Se déconnecter">
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)} title="Se connecter">
                  <LogIn className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Quelle sphère reçoit le produit ?
            </h2>
            <p className="text-sm text-muted-foreground">
              Sélectionne la sphère qui a été remplie pour démarrer le calcul.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SPHERES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSphere(s.id)}
                className="group rounded-lg border-2 border-border hover:border-primary hover:shadow-md transition bg-card p-6 text-center"
              >
                <div className="text-3xl font-bold text-orange-500 mb-1">{s.id}</div>
                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                  Capacité {s.capacity}
                </div>
                <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-primary font-semibold">
                  Choisir cette sphère →
                </div>
              </button>
            ))}
          </div>
        </main>

        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} redirectTo={null} />
      </div>
    );
  }

  /* ----------------------- Étape 2 : saisie ----------------------- */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="print:hidden flex flex-col flex-1">
        <header className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSphere(null)} title="Changer de sphère">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Réception butane — <span className="text-orange-500">{selectedSphere}</span>
                  {editingId && (
                    <span className="ml-2 text-[10px] sm:text-xs font-normal text-orange-500">
                      (édition du {editingCreatedAt && new Date(editingCreatedAt).toLocaleDateString('fr-FR')})
                    </span>
                  )}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  AVANT / APRÈS · Calcul temps réel
                  {session && (
                    <>
                      {' · '}
                      <span className="font-medium text-foreground">{session.user_name}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              {showDevButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillRandom}
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  title="Remplissage aléatoire (debug — Ctrl+Shift+Z)"
                >
                  <Sparkles className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Random</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={result.masse_transferee === null} title="Imprimer">
                <Printer className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Imprimer</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleHistoryClick} title="Historique">
                <History className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Historique</span>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!canSave || saving} title="Enregistrer">
                <Save className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Enregistrer'}
                </span>
              </Button>
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={logout} title="Se déconnecter">
                  <LogOut className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)} title="Se connecter">
                  <LogIn className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Entête réception */}
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">N° réception</Label>
                <Input value={header.numero_reception} onChange={(e) => setHeader({ ...header, numero_reception: e.target.value })} placeholder="001/2026" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Dépôt</Label>
                <Input value={header.depot} onChange={(e) => setHeader({ ...header, depot: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Produit</Label>
                <Input value={header.produit} onChange={(e) => setHeader({ ...header, produit: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Navire</Label>
                <Input value={header.origine_navire} onChange={(e) => setHeader({ ...header, origine_navire: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Inspecteur</Label>
                <Input value={header.inspecteur} onChange={(e) => setHeader({ ...header, inspecteur: e.target.value })} placeholder="ACE / BVI / PETROCI" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Mise sous douane</Label>
                <Input type="datetime-local" value={header.date_mise_sous_douane} onChange={(e) => setHeader({ ...header, date_mise_sous_douane: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Début transfert</Label>
                <Input type="datetime-local" value={header.date_debut_transfert} onChange={(e) => setHeader({ ...header, date_debut_transfert: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Fin transfert</Label>
                <Input type="datetime-local" value={header.date_fin_transfert} onChange={(e) => setHeader({ ...header, date_fin_transfert: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Déblocage</Label>
                <Input type="datetime-local" value={header.date_deblocage} onChange={(e) => setHeader({ ...header, date_deblocage: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Jauge contrôle</Label>
                <Input type="datetime-local" value={header.date_jauge_controle} onChange={(e) => setHeader({ ...header, date_jauge_controle: e.target.value })} className="h-8 text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Saisies AVANT / APRÈS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReceptionStateInputsBlock
              title="AVANT transfert"
              sphereId={selectedSphere}
              inputs={avantInputs}
              onChange={setAvantInputs}
            />
            <div className="space-y-2">
              <ReceptionStateInputsBlock
                title="APRÈS transfert"
                sphereId={selectedSphere}
                inputs={apresInputs}
                onChange={setApresInputs}
              />
              <Button variant="link" size="sm" onClick={prefillFromAvant} className="text-primary h-auto p-0">
                ↳ Recopier les densités depuis AVANT
              </Button>
            </div>
          </div>

          {/* Résultats */}
          <ReceptionResults
            sphereId={selectedSphere}
            avantInputs={avantInputs}
            apresInputs={apresInputs}
            result={result}
            marketer={marketer}
            onMarketerChange={setMarketer}
          />
        </main>
      </div>

      <div className="hidden print:block">
        <ReceptionPrint
          sphereId={selectedSphere}
          header={header}
          avantInputs={avantInputs}
          apresInputs={apresInputs}
          result={result}
          marketer={marketer}
          occurredAt={new Date()}
        />
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} redirectTo={null} />
    </div>
  );
}

export type { ReceptionHeader };
