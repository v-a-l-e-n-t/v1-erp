import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LigneProduction,
  ChefLigne,
  ArretProductionForm as ArretFormType,
  ARRET_CATEGORIES,
  ARRET_LABELS,
  ArretType
} from "@/types/production";
import { Switch } from "@/components/ui/switch";

interface LigneProductionFormProps {
  ligne: LigneProduction;
  index: number;
  chefsLigne: ChefLigne[];
  onUpdate: (index: number, field: keyof LigneProduction, value: any) => void;
  isB12Only?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  /** Heures du shift utilisées comme valeur par défaut quand la ligne devient
   *  Active et n'a pas encore d'heures propres. */
  shiftDebut?: string;
  shiftFin?: string;
  allAgents: any[];
  agentPresences: Record<string, boolean>;
  onAgentPresenceChange: (agentId: string, numeroLigne: number, present: boolean) => void;
}

export const LigneProductionForm = ({
  ligne,
  index,
  chefsLigne,
  onUpdate,
  isB12Only = false,
  isOpen,
  onToggle,
  shiftDebut,
  shiftFin,
  allAgents,
  agentPresences,
  onAgentPresenceChange
}: LigneProductionFormProps) => {
  const actif = ligne.actif !== false; // défaut Actif
  const [showLigneEffectifDialog, setShowLigneEffectifDialog] = useState(false);

  const handleToggleActif = (next: boolean) => {
    onUpdate(index, 'actif', next);
    // Quand on réactive une ligne, on pré-remplit les heures depuis le shift si vides.
    if (next) {
      if (!ligne.heure_debut_reelle && shiftDebut) onUpdate(index, 'heure_debut_reelle', shiftDebut);
      if (!ligne.heure_fin_reelle && shiftFin) onUpdate(index, 'heure_fin_reelle', shiftFin);
    }
  };

  // Calcul des cumuls par type de bouteille
  const cumulRechargesB6 = (ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0);
  const cumulRechargesB12 = (ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0);
  const cumulRechargesB28 = (ligne.recharges_petro_b28 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_vivo_b28 || 0);
  const cumulRechargesB38 = (ligne.recharges_petro_b38 || 0) + (ligne.recharges_total_b38 || 0) + (ligne.recharges_vivo_b38 || 0);

  const cumulConsignesB6 = (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
  const cumulConsignesB12 = (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
  const cumulConsignesB28 = (ligne.consignes_petro_b28 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_vivo_b28 || 0);
  const cumulConsignesB38 = (ligne.consignes_petro_b38 || 0) + (ligne.consignes_total_b38 || 0) + (ligne.consignes_vivo_b38 || 0);

  // Calcul du tonnage (B6 = 6kg, B12 = 12.5kg, B28 = 28kg, B38 = 38kg)
  const tonnageRecharges = (
    cumulRechargesB6 * 6 +
    cumulRechargesB12 * 12.5 +
    cumulRechargesB28 * 28 +
    cumulRechargesB38 * 38
  ) / 1000;

  const tonnageConsignes = (
    cumulConsignesB6 * 6 +
    cumulConsignesB12 * 12.5 +
    cumulConsignesB28 * 28 +
    cumulConsignesB38 * 38
  ) / 1000;

  const tonnage = tonnageRecharges + tonnageConsignes;

  const newMotifsList = ARRET_CATEGORIES.flatMap(c => c.motifs);
  const legacyArrets = (ligne.arrets || []).filter(a => !newMotifsList.includes(a.type_arret));
  const tempsArretCumule = (ligne.arrets || []).reduce((sum, a) => sum + (a.duree_minutes || 0), 0);
  const lineAgents = allAgents.filter(a => a.lignes_affectees?.includes(ligne.numero_ligne));

  // Mettre à jour les valeurs calculées dans le parent
  useEffect(() => {
    onUpdate(index, 'cumul_recharges_b6', cumulRechargesB6);
    onUpdate(index, 'cumul_recharges_b12', cumulRechargesB12);
    onUpdate(index, 'cumul_recharges_b28', cumulRechargesB28);
    onUpdate(index, 'cumul_recharges_b38', cumulRechargesB38);

    onUpdate(index, 'cumul_consignes_b6', cumulConsignesB6);
    onUpdate(index, 'cumul_consignes_b12', cumulConsignesB12);
    onUpdate(index, 'cumul_consignes_b28', cumulConsignesB28);
    onUpdate(index, 'cumul_consignes_b38', cumulConsignesB38);

    onUpdate(index, 'tonnage_ligne', parseFloat(tonnage.toFixed(3)));
  }, [
    ligne.recharges_petro_b6, ligne.recharges_petro_b12, ligne.recharges_petro_b28, ligne.recharges_petro_b38,
    ligne.recharges_total_b6, ligne.recharges_total_b12, ligne.recharges_total_b28, ligne.recharges_total_b38,
    ligne.recharges_vivo_b6, ligne.recharges_vivo_b12, ligne.recharges_vivo_b28, ligne.recharges_vivo_b38,
    ligne.consignes_petro_b6, ligne.consignes_petro_b12, ligne.consignes_petro_b28, ligne.consignes_petro_b38,
    ligne.consignes_total_b6, ligne.consignes_total_b12, ligne.consignes_total_b28, ligne.consignes_total_b38,
    ligne.consignes_vivo_b6, ligne.consignes_vivo_b12, ligne.consignes_vivo_b28, ligne.consignes_vivo_b38
  ]);

  const getDureeForMotif = (motif: ArretType): number => {
    const found = (ligne.arrets || []).find(a => a.type_arret === motif);
    return found?.duree_minutes || 0;
  };

  const handleDureeChange = (motif: ArretType, value: number) => {
    let updatedArrets = [...(ligne.arrets || [])];
    const existingIndex = updatedArrets.findIndex(a => a.type_arret === motif);

    if (value > 0) {
      const arretObj: ArretFormType = {
        numero_ligne: ligne.numero_ligne,
        duree_minutes: value,
        type_arret: motif,
      };
      if (existingIndex > -1) {
        updatedArrets[existingIndex] = arretObj;
      } else {
        updatedArrets.push(arretObj);
      }
    } else {
      if (existingIndex > -1) {
        updatedArrets.splice(existingIndex, 1);
      }
    }
    onUpdate(index, 'arrets', updatedArrets);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle()}>
      <Card className={`border-2 ${!actif ? 'opacity-70' : ''}`}>
        <div className="flex items-stretch w-full">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={`flex-1 flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${isOpen ? 'text-orange-500' : 'text-foreground hover:text-orange-500'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">Ligne {index + 1}</span>
                {!actif && (
                  <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    Inactive
                  </span>
                )}
                {ligne.chef_ligne_id && actif && (
                  <span className="text-sm text-muted-foreground">
                    - {chefsLigne.find(c => c.id === ligne.chef_ligne_id)?.prenom} {chefsLigne.find(c => c.id === ligne.chef_ligne_id)?.nom}
                  </span>
                )}
              </div>
              {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          </CollapsibleTrigger>
          <div
            className="flex items-center gap-2 px-4 border-l"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              id={`ligne-actif-${index}`}
              checked={actif}
              onCheckedChange={handleToggleActif}
            />
            <Label htmlFor={`ligne-actif-${index}`} className="text-xs text-muted-foreground cursor-pointer">
              {actif ? 'Actif' : 'Inactif'}
            </Label>
          </div>
        </div>

        <CollapsibleContent>
          {!actif ? (
            <div className="p-6 border-t text-center text-sm text-muted-foreground">
              Cette ligne est marquée <strong>Inactive</strong> pour ce shift —
              elle est exclue des saisies et des statistiques.
            </div>
          ) : (
          <div className="p-4 pt-0 border-t space-y-4">
            {/* Heures réelles de la ligne */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <Label htmlFor={`ligne-debut-${index}`}>
                  Heure début réelle <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`ligne-debut-${index}`}
                  type="time"
                  value={ligne.heure_debut_reelle ?? ''}
                  onChange={(e) => onUpdate(index, 'heure_debut_reelle', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`ligne-fin-${index}`}>
                  Heure fin réelle <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`ligne-fin-${index}`}
                  type="time"
                  value={ligne.heure_fin_reelle ?? ''}
                  onChange={(e) => onUpdate(index, 'heure_fin_reelle', e.target.value)}
                />
              </div>
            </div>

            {/* Chef de ligne et nombre d'agents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`ligne-chef-${index}`}>
                  Chef de Ligne <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={ligne.chef_ligne_id}
                  onValueChange={(value) => onUpdate(index, 'chef_ligne_id', value)}
                >
                  <SelectTrigger id={`ligne-chef-${index}`}>
                    <SelectValue placeholder="Sélectionner un chef de ligne" />
                  </SelectTrigger>
                  <SelectContent>
                    {chefsLigne.map((chef) => (
                      <SelectItem key={chef.id} value={chef.id}>
                        {chef.prenom} {chef.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Effectif Ligne</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLigneEffectifDialog(true)}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Gérer l'effectif ({ligne.nombre_agents || 0} présents)
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    / {[0, 1].includes(index) ? '08' : [2, 3].includes(index) ? '14' : '10'} max
                  </span>
                </div>
              </div>
            </div>

            {/* Quantités Recharges */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quantité Recharges</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">PETRO IVOIRE</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-recharge-petro-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-recharge-petro-b6`}
                        type="number"
                        min="0"
                        value={ligne.recharges_petro_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'recharges_petro_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-petro-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-petro-b12`}
                          type="number"
                          min="0"
                          value={ligne.recharges_petro_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_petro_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-petro-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-petro-b28`}
                          type="number"
                          min="0"
                          value={ligne.recharges_petro_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_petro_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-petro-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-petro-b38`}
                          type="number"
                          min="0"
                          value={ligne.recharges_petro_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_petro_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">TOTAL ENERGIES</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-recharge-total-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-recharge-total-b6`}
                        type="number"
                        min="0"
                        value={ligne.recharges_total_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'recharges_total_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-total-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-total-b12`}
                          type="number"
                          min="0"
                          value={ligne.recharges_total_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_total_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-total-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-total-b28`}
                          type="number"
                          min="0"
                          value={ligne.recharges_total_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_total_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-total-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-total-b38`}
                          type="number"
                          min="0"
                          value={ligne.recharges_total_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_total_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">VIVO ENERGIES</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-recharge-vivo-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-recharge-vivo-b6`}
                        type="number"
                        min="0"
                        value={ligne.recharges_vivo_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'recharges_vivo_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-vivo-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-vivo-b12`}
                          type="number"
                          min="0"
                          value={ligne.recharges_vivo_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_vivo_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-vivo-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-vivo-b28`}
                          type="number"
                          min="0"
                          value={ligne.recharges_vivo_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_vivo_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-recharge-vivo-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-recharge-vivo-b38`}
                          type="number"
                          min="0"
                          value={ligne.recharges_vivo_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'recharges_vivo_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm bg-muted/30 p-3 rounded-md">
                {index < 4 && (
                  <div>
                    <span className="font-medium">Cumul B6:</span> {cumulRechargesB6.toLocaleString()} bouteilles
                  </div>
                )}
                {index === 4 && (
                  <>
                    <div>
                      <span className="font-medium">Cumul B12:</span> {cumulRechargesB12.toLocaleString()} bouteilles
                    </div>
                    <div>
                      <span className="font-medium">Cumul B28:</span> {cumulRechargesB28.toLocaleString()} bouteilles
                    </div>
                    <div>
                      <span className="font-medium">Cumul B38:</span> {cumulRechargesB38.toLocaleString()} bouteilles
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium">Tonnage:</span> {tonnageRecharges.toFixed(3)} T
                </div>
              </div>
            </div>

            {/* Quantités Consignes */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quantité Consignes</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">PETRO IVOIRE</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-consigne-petro-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-consigne-petro-b6`}
                        type="number"
                        min="0"
                        value={ligne.consignes_petro_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'consignes_petro_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-petro-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-petro-b12`}
                          type="number"
                          min="0"
                          value={ligne.consignes_petro_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_petro_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-petro-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-petro-b28`}
                          type="number"
                          min="0"
                          value={ligne.consignes_petro_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_petro_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-petro-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-petro-b38`}
                          type="number"
                          min="0"
                          value={ligne.consignes_petro_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_petro_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">TOTAL ENERGIES</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-consigne-total-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-consigne-total-b6`}
                        type="number"
                        min="0"
                        value={ligne.consignes_total_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'consignes_total_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-total-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-total-b12`}
                          type="number"
                          min="0"
                          value={ligne.consignes_total_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_total_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-total-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-total-b28`}
                          type="number"
                          min="0"
                          value={ligne.consignes_total_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_total_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-total-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-total-b38`}
                          type="number"
                          min="0"
                          value={ligne.consignes_total_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_total_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">VIVO ENERGIES</Label>
                  {index < 4 && (
                    <div>
                      <Label htmlFor={`ligne-${index}-consigne-vivo-b6`} className="text-xs text-muted-foreground">
                        B6
                      </Label>
                      <Input
                        id={`ligne-${index}-consigne-vivo-b6`}
                        type="number"
                        min="0"
                        value={ligne.consignes_vivo_b6 ?? ''}
                        onChange={(e) => onUpdate(index, 'consignes_vivo_b6', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  {index === 4 && (
                    <>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-vivo-b12`} className="text-xs text-muted-foreground">
                          B12
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-vivo-b12`}
                          type="number"
                          min="0"
                          value={ligne.consignes_vivo_b12 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_vivo_b12', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-vivo-b28`} className="text-xs text-muted-foreground">
                          B28
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-vivo-b28`}
                          type="number"
                          min="0"
                          value={ligne.consignes_vivo_b28 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_vivo_b28', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ligne-${index}-consigne-vivo-b38`} className="text-xs text-muted-foreground">
                          B38
                        </Label>
                        <Input
                          id={`ligne-${index}-consigne-vivo-b38`}
                          type="number"
                          min="0"
                          value={ligne.consignes_vivo_b38 ?? ''}
                          onChange={(e) => onUpdate(index, 'consignes_vivo_b38', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm bg-muted/30 p-3 rounded-md">
                {index < 4 && (
                  <div>
                    <span className="font-medium">Cumul B6:</span> {cumulConsignesB6.toLocaleString()} bouteilles
                  </div>
                )}
                {index === 4 && (
                  <>
                    <div>
                      <span className="font-medium">Cumul B12:</span> {cumulConsignesB12.toLocaleString()} bouteilles
                    </div>
                    <div>
                      <span className="font-medium">Cumul B28:</span> {cumulConsignesB28.toLocaleString()} bouteilles
                    </div>
                    <div>
                      <span className="font-medium">Cumul B38:</span> {cumulConsignesB38.toLocaleString()} bouteilles
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium">Tonnage:</span> {tonnageConsignes.toFixed(3)} T
                </div>
              </div>
            </div>

            {/* Tonnage total de la ligne */}
            <div className="p-3 bg-primary/10 rounded-md mt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Tonnage Total de la Ligne:</span>
                <span className="text-lg font-bold text-primary">{tonnage.toFixed(3)} T</span>
              </div>
            </div>


            {/* Arrêts de production - Refonte */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm">Arrêts de production</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ARRET_CATEGORIES.map((cat, catIdx) => {
                  const subTotal = cat.motifs.reduce((sum, motif) => sum + getDureeForMotif(motif), 0);
                  return (
                    <div key={catIdx} className="space-y-3 border rounded-lg p-3 bg-card">
                      <h5 className="font-medium text-sm text-orange-500">{cat.label}</h5>
                      <div className="space-y-2">
                        {cat.motifs.map((motif) => {
                          const val = getDureeForMotif(motif);
                          return (
                            <div key={motif} className="flex items-center justify-between gap-2">
                              <Label htmlFor={`ligne-${index}-arret-${motif}`} className="text-xs flex-1">
                                {ARRET_LABELS[motif] || motif}
                              </Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  id={`ligne-${index}-arret-${motif}`}
                                  type="number"
                                  min="0"
                                  value={val || ''}
                                  onChange={(e) => handleDureeChange(motif, parseInt(e.target.value) || 0)}
                                  className="w-20 text-right"
                                  placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground">min</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs font-semibold bg-muted/40 p-2 rounded text-right mt-2">
                        Sous-total {cat.label}: {subTotal} min
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* legacy stops */}
              {legacyArrets.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50/50 rounded-lg p-3 space-y-2">
                  <h5 className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">
                    Arrêts Historiques (Lecture seule)
                  </h5>
                  <div className="space-y-1">
                    {legacyArrets.map((arret, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-yellow-900">
                        <span>{ARRET_LABELS[arret.type_arret] || arret.type_arret} {arret.description ? `(${arret.description})` : ''}</span>
                        <span className="font-medium">{arret.duree_minutes} min</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-yellow-700 italic">
                    Ces arrêts proviennent d'une saisie ancienne. Si vous les modifiez, ils seront convertis au nouveau format.
                  </p>
                </div>
              )}

              {/* Cumul total arrêts de la ligne */}
              <div className="p-3 bg-primary/10 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Temps d'arrêt cumulé:</span>
                  <span className="text-sm font-bold text-primary">{tempsArretCumule} min</span>
                </div>
              </div>
            </div>

            {/* Dialog Effectif Ligne */}
            <Dialog open={showLigneEffectifDialog} onOpenChange={setShowLigneEffectifDialog}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Effectif Ligne {ligne.numero_ligne}</DialogTitle>
                  <DialogDescription>
                    Liste des agents affectés à la Ligne {ligne.numero_ligne}. Cochez pour marquer la présence.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4 max-h-[400px] overflow-y-auto pr-2">
                  {lineAgents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun agent affecté à cette ligne. Vous pouvez en affecter depuis la page /agents.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lineAgents.map((agent) => {
                        const isPresent = agentPresences[`${agent.id}_${ligne.numero_ligne}`] !== false;
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {agent.prenom} {agent.nom}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {agent.role === 'chef_ligne' ? 'Chef de Ligne' : agent.role === 'chef_quart' ? 'Chef de Quart' : agent.role === 'chef_equipe_atelier' ? "Chef d'équipe atelier" : agent.role === 'agent_exploitation' ? 'Agent Exploitation' : agent.role === 'agent_mouvement' ? 'Agent Mouvement' : agent.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`ligne-${ligne.numero_ligne}-presence-${agent.id}`}
                                checked={isPresent}
                                onCheckedChange={(checked) => {
                                  onAgentPresenceChange(agent.id, ligne.numero_ligne, checked === true);
                                }}
                              />
                              <Label
                                htmlFor={`ligne-${ligne.numero_ligne}-presence-${agent.id}`}
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                {isPresent ? 'Présent' : 'Absent'}
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setShowLigneEffectifDialog(false)}>
                    Fermer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible >
  );
};
