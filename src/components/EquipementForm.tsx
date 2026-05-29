import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Equipement, EquipementLigne, EquipementWithLignes } from "@/types/equipement";

const LIGNES = [1, 2, 3, 4, 5] as const;

interface LigneState {
  affecte: boolean;
  actif: boolean;
  motif: string;
}

interface EquipementFormProps {
  equipement?: EquipementWithLignes;
  onSubmit: (
    data: Omit<Equipement, 'id' | 'created_at'>,
    lignes: Array<Pick<EquipementLigne, 'numero_ligne' | 'actif' | 'motif_inactif'>>,
  ) => void;
  onCancel: () => void;
  loading?: boolean;
}

const emptyLignesState = (): Record<number, LigneState> => {
  const r: Record<number, LigneState> = {};
  LIGNES.forEach(n => { r[n] = { affecte: false, actif: true, motif: '' }; });
  return r;
};

const lignesStateFrom = (lignes: EquipementLigne[] | undefined): Record<number, LigneState> => {
  const r = emptyLignesState();
  (lignes ?? []).forEach(l => {
    r[l.numero_ligne] = {
      affecte: true,
      actif: l.actif,
      motif: l.motif_inactif ?? '',
    };
  });
  return r;
};

export const EquipementForm = ({ equipement, onSubmit, onCancel, loading = false }: EquipementFormProps) => {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [lignesState, setLignesState] = useState<Record<number, LigneState>>(emptyLignesState());
  const [motifError, setMotifError] = useState<number | null>(null);

  useEffect(() => {
    if (equipement) {
      setNom(equipement.nom);
      setCode(equipement.code ?? '');
      setLignesState(lignesStateFrom(equipement.lignes));
    } else {
      setNom('');
      setCode('');
      setLignesState(emptyLignesState());
    }
    setMotifError(null);
  }, [equipement]);

  const updateLigne = (n: number, patch: Partial<LigneState>) => {
    setLignesState(prev => ({ ...prev, [n]: { ...prev[n], ...patch } }));
    if (motifError === n) setMotifError(null);
  };

  const toggleAffecte = (n: number, checked: boolean) => {
    if (checked) {
      updateLigne(n, { affecte: true, actif: true, motif: '' });
    } else {
      updateLigne(n, { affecte: false, actif: true, motif: '' });
    }
  };

  const toggleActif = (n: number, nextActif: boolean) => {
    if (nextActif) {
      updateLigne(n, { actif: true, motif: '' });
    } else {
      updateLigne(n, { actif: false });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    // Validation : toute ligne affectee + inactive doit avoir un motif.
    for (const n of LIGNES) {
      const s = lignesState[n];
      if (s.affecte && !s.actif && !s.motif.trim()) {
        setMotifError(n);
        return;
      }
    }

    const lignes = LIGNES.filter(n => lignesState[n].affecte).map(n => ({
      numero_ligne: n,
      actif: lignesState[n].actif,
      motif_inactif: lignesState[n].actif ? null : lignesState[n].motif.trim(),
    }));

    onSubmit(
      {
        nom: nom.trim(),
        code: code.trim() || null,
        actif: equipement?.actif ?? true,
      },
      lignes,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-primary" />
          {equipement ? 'Modifier équipement' : 'Nouvel équipement'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipement-nom">Nom *</Label>
              <Input
                id="equipement-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Bascule"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipement-code">Code (optionnel)</Label>
              <Input
                id="equipement-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: BSC"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Affectation aux lignes <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <p className="text-xs text-muted-foreground">
              Cochez les lignes sur lesquelles cet équipement est installé. Actif par défaut ; décochez « Actif » pour le marquer en panne (un motif sera demandé).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {LIGNES.map((n) => {
                const s = lignesState[n];
                return (
                  <div
                    key={n}
                    className={cn(
                      "rounded-md border p-3 space-y-2 transition-colors",
                      s.affecte && s.actif && "bg-green-50/40 border-green-200",
                      s.affecte && !s.actif && "bg-amber-50/40 border-amber-300",
                      !s.affecte && "bg-muted/20 border-input",
                      motifError === n && "ring-2 ring-destructive",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Ligne {n}</span>
                      <Checkbox
                        id={`eq-ligne-${n}-aff`}
                        checked={s.affecte}
                        onCheckedChange={(c) => toggleAffecte(n, c === true)}
                        disabled={loading}
                        aria-label={`Affecter ligne ${n}`}
                      />
                    </div>
                    {s.affecte && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`eq-ligne-${n}-actif`}
                            checked={s.actif}
                            onCheckedChange={(c) => toggleActif(n, c === true)}
                            disabled={loading}
                          />
                          <Label
                            htmlFor={`eq-ligne-${n}-actif`}
                            className={cn(
                              "text-xs cursor-pointer font-medium",
                              s.actif ? "text-green-700" : "text-amber-700",
                            )}
                          >
                            {s.actif ? 'Actif' : 'Inactif'}
                          </Label>
                        </div>
                        {!s.actif && (
                          <Textarea
                            value={s.motif}
                            onChange={(e) => updateLigne(n, { motif: e.target.value })}
                            placeholder="Motif d'inactivité *"
                            rows={2}
                            className={cn(
                              "text-xs min-h-[48px]",
                              motifError === n && "border-destructive",
                            )}
                            disabled={loading}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {motifError !== null && (
              <p className="text-xs text-destructive">
                Ligne {motifError} : le motif est requis quand l'équipement est marqué inactif.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {equipement && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                <X className="h-4 w-4 mr-1.5" />
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={loading || !nom.trim()}>
              <Save className="h-4 w-4 mr-1.5" />
              {equipement ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
