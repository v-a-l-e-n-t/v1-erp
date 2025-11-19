import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LigneProduction, ChefLigne, ArretProduction } from "@/types/production";
import { ArretProductionForm } from "./ArretProductionForm";

interface LigneProductionFormProps {
  ligne: LigneProduction;
  index: number;
  chefsLigne: ChefLigne[];
  onUpdate: (index: number, field: keyof LigneProduction, value: any) => void;
  isB12Only?: boolean;
}

export const LigneProductionForm = ({ ligne, index, chefsLigne, onUpdate, isB12Only = false }: LigneProductionFormProps) => {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleAddArret = () => {
    const newArret: ArretProduction = {
      heure_debut: '',
      heure_fin: '',
      type_arret: 'maintenance_corrective',
      lignes_concernees: [ligne.numero_ligne],
      ordre_intervention: '',
      etape_ligne: undefined,
      description: '',
      action_corrective: ''
    };
    const updatedArrets = [...(ligne.arrets || []), newArret];
    onUpdate(index, 'arrets', updatedArrets);
  };

  const handleUpdateArret = (arretIndex: number, field: keyof ArretProduction, value: any) => {
    const updatedArrets = [...(ligne.arrets || [])];
    updatedArrets[arretIndex] = { ...updatedArrets[arretIndex], [field]: value };
    onUpdate(index, 'arrets', updatedArrets);
  };

  const handleRemoveArret = (arretIndex: number) => {
    const updatedArrets = (ligne.arrets || []).filter((_, i) => i !== arretIndex);
    onUpdate(index, 'arrets', updatedArrets);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${isOpen ? 'text-orange-500' : 'text-foreground hover:text-orange-500'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg">Ligne {index + 1}</span>
              {ligne.chef_ligne_id && (
                <span className="text-sm text-muted-foreground">
                  - {chefsLigne.find(c => c.id === ligne.chef_ligne_id)?.prenom} {chefsLigne.find(c => c.id === ligne.chef_ligne_id)?.nom}
                </span>
              )}
            </div>
            {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 border-t space-y-4">
            {/* Chef de ligne et nombre d'agents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`ligne-chef-${index}`}>Chef de Ligne *</Label>
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
                <Label htmlFor={`ligne-agents-${index}`}>Nombre d'agents</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`ligne-agents-${index}`}
                    type="number"
                    min="0"
                    max={[0, 1].includes(index) ? 8 : [2, 3].includes(index) ? 14 : 10}
                    value={ligne.nombre_agents || ''}
                    onChange={(e) => onUpdate(index, 'nombre_agents', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">
                    / {[0, 1].includes(index) ? '08' : [2, 3].includes(index) ? '14' : '10'}
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


            {/* Arrêts de production */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Arrêts de production pour cette ligne</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddArret}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un arrêt
                </Button>
              </div>

              {ligne.arrets && ligne.arrets.length > 0 ? (
                <div className="space-y-3">
                  {ligne.arrets.map((arret, arretIndex) => (
                    <ArretProductionForm
                      key={arretIndex}
                      arret={arret}
                      index={arretIndex}
                      onUpdate={handleUpdateArret}
                      onRemove={handleRemoveArret}
                      allowedLigne={ligne.numero_ligne}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun arrêt enregistré pour cette ligne
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible >
  );
};
