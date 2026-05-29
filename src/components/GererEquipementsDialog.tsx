import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EquipementWithLignes, EquipementLigne } from "@/types/equipement";

const LIGNES = [1, 2, 3, 4, 5] as const;

interface GererEquipementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipements: EquipementWithLignes[];
  /** Sauvegarde la matrice complete. */
  onSave: (rows: Array<{
    equipement_id: string;
    numero_ligne: number;
    actif: boolean;
    motif_inactif: string | null;
  }>) => Promise<void>;
  saving?: boolean;
}

interface CellState {
  /** L'equipement est-il affecte a cette ligne ? */
  affected: boolean;
  /** Si affecte : est-il actif ? */
  actif: boolean;
  /** Motif si !actif (texte libre, requis cote front). */
  motif: string;
}

type Matrix = Record<string, Record<number, CellState>>;

const initialMatrix = (equipements: EquipementWithLignes[]): Matrix => {
  const m: Matrix = {};
  equipements.forEach(eq => {
    m[eq.id] = {};
    LIGNES.forEach(n => {
      const existing = eq.lignes.find(l => l.numero_ligne === n);
      m[eq.id][n] = {
        affected: !!existing,
        actif: existing ? existing.actif : true,
        motif: existing?.motif_inactif ?? '',
      };
    });
  });
  return m;
};

export const GererEquipementsDialog = ({
  open,
  onOpenChange,
  equipements,
  onSave,
  saving = false,
}: GererEquipementsDialogProps) => {
  const [matrix, setMatrix] = useState<Matrix>(() => initialMatrix(equipements));
  const [motifPrompt, setMotifPrompt] = useState<{ equipementId: string; ligne: number; draft: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Re-init matrix when dialog reopens or data changes
  useEffect(() => {
    if (open) {
      setMatrix(initialMatrix(equipements));
      setErrors([]);
      setMotifPrompt(null);
    }
  }, [open, equipements]);

  const updateCell = (equipementId: string, ligne: number, patch: Partial<CellState>) => {
    setMatrix(prev => ({
      ...prev,
      [equipementId]: {
        ...prev[equipementId],
        [ligne]: { ...prev[equipementId][ligne], ...patch },
      },
    }));
  };

  /** Toggle affectation (case principale "L1"..."L5" cochee = affecte). */
  const toggleAffectation = (equipementId: string, ligne: number, checked: boolean) => {
    if (checked) {
      // (Re-)affecte : actif par defaut.
      updateCell(equipementId, ligne, { affected: true, actif: true, motif: '' });
    } else {
      // Desaffecte (retire la ligne completement de l'equipement)
      updateCell(equipementId, ligne, { affected: false, actif: true, motif: '' });
    }
  };

  /** Toggle actif/inactif d'une cellule deja affectee. Inactif -> demande un motif. */
  const toggleActif = (equipementId: string, ligne: number, nextActif: boolean) => {
    if (!nextActif) {
      // Passage en inactif : on prompt pour le motif.
      const existing = matrix[equipementId][ligne].motif;
      setMotifPrompt({ equipementId, ligne, draft: existing });
    } else {
      // Reactivation : on vide le motif.
      updateCell(equipementId, ligne, { actif: true, motif: '' });
    }
  };

  const confirmMotif = () => {
    if (!motifPrompt) return;
    const m = motifPrompt.draft.trim();
    if (!m) {
      // Le motif est obligatoire.
      return;
    }
    updateCell(motifPrompt.equipementId, motifPrompt.ligne, { actif: false, motif: m });
    setMotifPrompt(null);
  };

  const cancelMotif = () => {
    setMotifPrompt(null);
  };

  const handleSave = async () => {
    // Validation : toute cellule affectee + inactive doit avoir un motif.
    const errs: string[] = [];
    Object.entries(matrix).forEach(([equipementId, byLigne]) => {
      const eq = equipements.find(e => e.id === equipementId);
      Object.entries(byLigne).forEach(([ligneStr, cell]) => {
        if (cell.affected && !cell.actif && !cell.motif.trim()) {
          errs.push(`${eq?.nom ?? equipementId} - Ligne ${ligneStr} : motif requis pour l'inactivation.`);
        }
      });
    });
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const rows: Parameters<typeof onSave>[0] = [];
    Object.entries(matrix).forEach(([equipementId, byLigne]) => {
      Object.entries(byLigne).forEach(([ligneStr, cell]) => {
        if (cell.affected) {
          rows.push({
            equipement_id: equipementId,
            numero_ligne: Number(ligneStr),
            actif: cell.actif,
            motif_inactif: cell.actif ? null : cell.motif.trim(),
          });
        }
      });
    });
    await onSave(rows);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer équipements</DialogTitle>
            <DialogDescription>
              Cochez les lignes sur lesquelles chaque équipement est installé. Les équipements sont actifs par défaut ;
              décochez « Actif » pour le marquer en panne / hors service (un motif sera demandé).
            </DialogDescription>
          </DialogHeader>

          {errors.length > 0 && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" />
                Motif requis
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-destructive">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {equipements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center italic">
              Aucun équipement dans le catalogue. Ajoutez-en un d'abord.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-2 font-semibold min-w-[160px]">Équipement</th>
                    {LIGNES.map(n => (
                      <th key={n} className="text-center p-2 font-semibold min-w-[110px]">Ligne {n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {equipements.map(eq => (
                    <tr key={eq.id}>
                      <td className="p-2 font-medium">
                        {eq.nom}
                        {eq.code && <span className="text-xs text-muted-foreground ml-1">({eq.code})</span>}
                      </td>
                      {LIGNES.map(n => {
                        const cell = matrix[eq.id]?.[n] ?? { affected: false, actif: true, motif: '' };
                        return (
                          <td key={n} className="p-2 align-top">
                            <div className={cn(
                              "rounded-md border p-2 space-y-1.5 transition-colors",
                              cell.affected && cell.actif && "bg-green-50/40 border-green-200",
                              cell.affected && !cell.actif && "bg-amber-50/40 border-amber-300",
                              !cell.affected && "bg-muted/20 border-input",
                            )}>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`${eq.id}-${n}-aff`}
                                  checked={cell.affected}
                                  onCheckedChange={(c) => toggleAffectation(eq.id, n, c === true)}
                                />
                                <Label htmlFor={`${eq.id}-${n}-aff`} className="text-xs cursor-pointer">
                                  Affecté
                                </Label>
                              </div>
                              {cell.affected && (
                                <div className="flex items-center gap-1.5">
                                  <Checkbox
                                    id={`${eq.id}-${n}-actif`}
                                    checked={cell.actif}
                                    onCheckedChange={(c) => toggleActif(eq.id, n, c === true)}
                                  />
                                  <Label
                                    htmlFor={`${eq.id}-${n}-actif`}
                                    className={cn(
                                      "text-xs cursor-pointer",
                                      cell.actif ? "text-green-700 font-medium" : "text-amber-700 font-medium",
                                    )}
                                  >
                                    {cell.actif ? 'Actif' : 'Inactif'}
                                  </Label>
                                </div>
                              )}
                              {cell.affected && !cell.actif && cell.motif && (
                                <p
                                  className="text-[10px] text-amber-800 leading-tight italic max-w-[100px] truncate"
                                  title={cell.motif}
                                >
                                  {cell.motif}
                                </p>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || equipements.length === 0}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-dialog : motif d'inactivite */}
      <Dialog open={!!motifPrompt} onOpenChange={(o) => { if (!o) cancelMotif(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motif d'inactivité</DialogTitle>
            <DialogDescription>
              Indiquez la raison pour laquelle cet équipement passe en inactif sur la ligne {motifPrompt?.ligne}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motifPrompt?.draft ?? ''}
            onChange={(e) => setMotifPrompt(p => p ? { ...p, draft: e.target.value } : p)}
            placeholder="Ex: Panne mécanique, en attente pièce"
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelMotif}>Annuler</Button>
            <Button
              onClick={confirmMotif}
              disabled={!motifPrompt?.draft.trim()}
            >
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
