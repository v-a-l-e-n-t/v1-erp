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
  const cumulConsignesB6 = (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
  const cumulConsignesB12 = (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
  
  // Calcul du tonnage (B6 = 6kg, B12 = 12.5kg)
  const totalB6 = cumulRechargesB6 + cumulConsignesB6;
  const totalB12 = cumulRechargesB12 + cumulConsignesB12;
  const tonnage = (totalB6 * 6 + totalB12 * 12.5) / 1000;

  // Mettre à jour les valeurs calculées dans le parent
  useEffect(() => {
    onUpdate(index, 'cumul_recharges_b6', cumulRechargesB6);
    onUpdate(index, 'cumul_recharges_b12', cumulRechargesB12);
    onUpdate(index, 'cumul_consignes_b6', cumulConsignesB6);
    onUpdate(index, 'cumul_consignes_b12', cumulConsignesB12);
    onUpdate(index, 'tonnage_ligne', parseFloat(tonnage.toFixed(3)));
  }, [
    ligne.recharges_petro_b6, ligne.recharges_petro_b12,
    ligne.recharges_total_b6, ligne.recharges_total_b12,
    ligne.recharges_vivo_b6, ligne.recharges_vivo_b12,
    ligne.consignes_petro_b6, ligne.consignes_petro_b12,
    ligne.consignes_total_b6, ligne.consignes_total_b12,
    ligne.consignes_vivo_b6, ligne.consignes_vivo_b12
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
            className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${
              isOpen ? 'text-orange-500' : 'text-foreground hover:text-orange-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg">Ligne {index + 1}</span>
              {isB12Only && <span className="text-sm text-muted-foreground">(B12 uniquement)</span>}
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
                    max="8"
                    value={ligne.nombre_agents || ''}
                    onChange={(e) => onUpdate(index, 'nombre_agents', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">/ 08</span>
                </div>
              </div>
            </div>

            {/* Quantités Recharges */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quantité Recharges</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">PETRO IVOIRE</Label>
                  {!isB12Only && (
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
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">TOTAL ENERGIES</Label>
                  {!isB12Only && (
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
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">VIVO ENERGIES</Label>
                  {!isB12Only && (
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
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm bg-muted/30 p-3 rounded-md">
                {!isB12Only && (
                  <div>
                    <span className="font-medium">Cumul B6:</span> {cumulRechargesB6.toLocaleString()} bouteilles
                  </div>
                )}
                <div>
                  <span className="font-medium">Cumul B12:</span> {cumulRechargesB12.toLocaleString()} bouteilles
                </div>
                <div>
                  <span className="font-medium">Tonnage:</span> {((cumulRechargesB6 * 6 + cumulRechargesB12 * 12.5) / 1000).toFixed(3)} T
                </div>
              </div>
            </div>

            {/* Quantités Consignes */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quantité Consignes</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">PETRO IVOIRE</Label>
                  {!isB12Only && (
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
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">TOTAL ENERGIES</Label>
                  {!isB12Only && (
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
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">VIVO ENERGIES</Label>
                  {!isB12Only && (
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
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm bg-muted/30 p-3 rounded-md">
                {!isB12Only && (
                  <div>
                    <span className="font-medium">Cumul B6:</span> {cumulConsignesB6.toLocaleString()} bouteilles
                  </div>
                )}
                <div>
                  <span className="font-medium">Cumul B12:</span> {cumulConsignesB12.toLocaleString()} bouteilles
                </div>
                <div>
                  <span className="font-medium">Tonnage:</span> {((cumulConsignesB6 * 6 + cumulConsignesB12 * 12.5) / 1000).toFixed(3)} T
                </div>
              </div>
            </div>

            {/* Tonnage total de la ligne */}
            <div className="p-3 bg-primary/10 rounded-md">
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
    </Collapsible>
  );
};
