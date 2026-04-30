import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calculator,
  Save,
  History,
  LogOut,
  LogIn,
  Printer,
  Sparkles,
  ChevronRight,
  X,
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

const SPHERE_ORDER: SphereId[] = ['S01', 'S02', 'S03'];

interface SphereSlotState {
  avant: ReceptionStateInputs;
  apres: ReceptionStateInputs;
  marketer: MarketerSplit;
  editingId: string | null;
  editingCreatedAt: string | null;
}

const EMPTY_SLOT: SphereSlotState = {
  avant: EMPTY_RECEPTION_STATE,
  apres: EMPTY_RECEPTION_STATE,
  marketer: EMPTY_MARKETER_SPLIT,
  editingId: null,
  editingCreatedAt: null,
};

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

  // En-tête commun aux 3 sphères
  const [header, setHeader] = useState<ReceptionHeader>(EMPTY_HEADER);

  // State par sphère
  const [slots, setSlots] = useState<Record<SphereId, SphereSlotState>>({
    S01: EMPTY_SLOT,
    S02: EMPTY_SLOT,
    S03: EMPTY_SLOT,
  });

  // Sphère actuellement ouverte (modèle accordéon : 1 seule à la fois)
  const [openSphere, setOpenSphere] = useState<SphereId | null>('S01');

  // Saving + dev random
  const [savingSphere, setSavingSphere] = useState<SphereId | null>(null);
  const [printingSphere, setPrintingSphere] = useState<SphereId | null>(null);
  const [showDevButton, setShowDevButton] = useState(false);

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

  // Résultats par sphère (recalculés à chaque modif)
  const results: Record<SphereId, ReceptionResult> = useMemo(
    () =>
      SPHERE_ORDER.reduce(
        (acc, id) => {
          acc[id] = computeReception(id, slots[id].avant, slots[id].apres);
          return acc;
        },
        {} as Record<SphereId, ReceptionResult>,
      ),
    [slots],
  );

  /* --------------------- Edit mode via ?session=<id> --------------------- */
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
      const sId = data.sphere_id as SphereId;
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
      setSlots((prev) => ({
        ...prev,
        [sId]: {
          avant: { ...EMPTY_RECEPTION_STATE, ...(data.inputs_avant ?? {}) },
          apres: { ...EMPTY_RECEPTION_STATE, ...(data.inputs_apres ?? {}) },
          marketer: { ...EMPTY_MARKETER_SPLIT, ...(data.marketer_repartition ?? {}) },
          editingId: data.id,
          editingCreatedAt: data.created_at,
        },
      }));
      setOpenSphere(sId);
      toast.success(
        `Édition de la réception ${sId} du ${new Date(data.created_at).toLocaleString('fr-FR')}`,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* ------------------------------ Actions ------------------------------- */

  const updateSlot = (id: SphereId, patch: Partial<SphereSlotState>) =>
    setSlots((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleFillRandom = (id: SphereId) => {
    const { avant, apres } = buildRandomReception(id);
    updateSlot(id, { avant, apres });
    toast.success(`Données aléatoires injectées dans ${id}`);
  };

  const handleSave = async (id: SphereId) => {
    const slot = slots[id];
    if (results[id].masse_transferee === null) return;
    setSavingSphere(id);
    try {
      const payload = {
        user_id: session?.user_id ?? null,
        user_name: session?.user_name ?? 'Anonyme',
        sphere_id: id,
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
        inputs_avant: slot.avant,
        inputs_apres: slot.apres,
        results: results[id],
        marketer_repartition: slot.marketer,
        masse_transferee_kg: results[id].masse_transferee,
      };
      let error;
      if (slot.editingId) {
        ({ error } = await (supabase as any)
          .from('reception_sessions')
          .update(payload)
          .eq('id', slot.editingId));
      } else {
        ({ error } = await (supabase as any)
          .from('reception_sessions')
          .insert(payload));
      }
      if (error) {
        console.error(error);
        toast.error("Échec de l'enregistrement");
      } else {
        toast.success(slot.editingId ? `${id} mise à jour` : `${id} enregistrée`);
        if (slot.editingId) {
          updateSlot(id, { editingId: null, editingCreatedAt: null });
          setSearchParams({});
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur réseau');
    } finally {
      setSavingSphere(null);
    }
  };

  const handlePrint = (id: SphereId) => {
    setPrintingSphere(id);
    setTimeout(() => window.print(), 50);
  };

  useEffect(() => {
    const after = () => setPrintingSphere(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const handleHistoryClick = () => {
    if (!isAuthenticated) {
      toast.info("Connecte-toi pour accéder à l'historique");
      setPendingHistoryNav(true);
      setLoginOpen(true);
      return;
    }
    navigate('/reception-history');
  };

  /* ----------------------------- Rendu UI ------------------------------- */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Vue écran (cachée à l'impression) */}
      <div className="print:hidden flex flex-col flex-1">
        <header className="border-b bg-card/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  Réception butane
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Saisie AVANT / APRÈS par sphère
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

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Entête réception (commun aux 3 sphères) */}
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

          {/* Accordéon horizontal des 3 sphères */}
          <div className="flex items-stretch gap-2 min-h-[60vh]">
            {SPHERE_ORDER.map((id) => {
              const isOpen = openSphere === id;
              const slot = slots[id];
              const result = results[id];
              const negative = result.masse_transferee !== null && result.masse_transferee < 0;
              return (
                <div
                  key={id}
                  className={[
                    'relative rounded-lg border-2 overflow-hidden transition-all duration-300 ease-in-out',
                    isOpen
                      ? 'flex-1 border-primary bg-card'
                      : 'w-[140px] sm:w-[160px] border-border bg-muted/40 hover:bg-muted hover:border-primary/50 cursor-pointer',
                  ].join(' ')}
                  onClick={() => !isOpen && setOpenSphere(id)}
                >
                  {/* État replié : bande étroite, titre horizontal lu normalement */}
                  {!isOpen && (
                    <div className="h-full flex flex-col items-center justify-between py-3 px-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="font-bold text-orange-500 text-sm uppercase tracking-[0.3em] whitespace-nowrap">
                        {`SPHERE ${id.replace('S0', '0')}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {result.masse_transferee !== null ? '●' : '○'}
                      </div>
                    </div>
                  )}

                  {/* État ouvert : panneau complet */}
                  {isOpen && (
                    <div className="flex flex-col h-full">
                      {/* Barre supérieure du panneau */}
                      <div className="flex items-center justify-between px-4 py-2 border-b bg-primary/5">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-orange-500 tracking-tight text-base">
                            SPHERE {id}
                          </h2>
                          {slot.editingId && slot.editingCreatedAt && (
                            <span className="text-[10px] text-orange-500">
                              (édition du {new Date(slot.editingCreatedAt).toLocaleDateString('fr-FR')})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {showDevButton && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFillRandom(id)}
                              className="border-purple-500 text-purple-600 hover:bg-purple-50"
                              title="Random (Ctrl+Shift+Z)"
                            >
                              <Sparkles className="h-4 w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Random</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(id)}
                            disabled={result.masse_transferee === null}
                            title="Imprimer"
                          >
                            <Printer className="h-4 w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">Imprimer</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(id)}
                            disabled={result.masse_transferee === null || savingSphere === id}
                            title="Enregistrer"
                          >
                            <Save className="h-4 w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">
                              {savingSphere === id
                                ? 'Enregistrement…'
                                : slot.editingId
                                  ? 'Mettre à jour'
                                  : 'Enregistrer'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSphere(null);
                            }}
                            title="Replier"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Contenu du panneau */}
                      <div className="flex-1 overflow-auto p-4 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <ReceptionStateInputsBlock
                            title="AVANT transfert"
                            sphereId={id}
                            inputs={slot.avant}
                            onChange={(next) => updateSlot(id, { avant: next })}
                          />
                          <div className="space-y-2">
                            <ReceptionStateInputsBlock
                              title="APRÈS transfert"
                              sphereId={id}
                              inputs={slot.apres}
                              onChange={(next) => updateSlot(id, { apres: next })}
                            />
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                updateSlot(id, {
                                  apres: {
                                    ...slot.apres,
                                    densite_recue: slot.apres.densite_recue || slot.avant.densite_recue,
                                    densite_bac: slot.apres.densite_bac || slot.avant.densite_bac,
                                  },
                                })
                              }
                              className="text-primary h-auto p-0"
                            >
                              ↳ Recopier les densités depuis AVANT
                            </Button>
                          </div>
                        </div>

                        <ReceptionResults
                          sphereId={id}
                          avantInputs={slot.avant}
                          apresInputs={slot.apres}
                          result={result}
                          marketer={slot.marketer}
                          onMarketerChange={(next) => updateSlot(id, { marketer: next })}
                        />

                        {negative && (
                          <p className="text-xs text-red-600">
                            ⚠ Masse transférée négative — vérifie les valeurs AVANT / APRÈS.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Vue impression */}
      {printingSphere && (
        <div className="hidden print:block">
          <ReceptionPrint
            sphereId={printingSphere}
            header={header}
            avantInputs={slots[printingSphere].avant}
            apresInputs={slots[printingSphere].apres}
            result={results[printingSphere]}
            marketer={slots[printingSphere].marketer}
            occurredAt={new Date()}
          />
        </div>
      )}

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} redirectTo={null} />
    </div>
  );
}

export type { ReceptionHeader };
