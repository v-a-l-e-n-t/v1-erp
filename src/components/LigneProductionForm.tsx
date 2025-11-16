import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LigneProduction, ChefLigne } from "@/types/production";

interface LigneProductionFormProps {
  ligne: LigneProduction;
  index: number;
  chefsLigne: ChefLigne[];
  onUpdate: (index: number, field: keyof LigneProduction, value: any) => void;
  isB12Only?: boolean; // True si on est sur une ligne B12 uniquement
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
  const tonnage = (totalB6 * 6 + totalB12 * 12.5) / 1000; // Convertir en tonnes

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

        <div className="space-y-3">
          <div className="flex items-center justify-between bg-black text-white py-2 px-3 rounded">
            <h5 className="font-medium text-sm">Quantité Recharges</h5>
            <div className="text-sm font-semibold flex gap-4">
              {!isB12Only && <span>Cumul B6: {cumulRechargesB6}</span>}
              <span>Cumul B12: {cumulRechargesB12}</span>
              <span>TONNAGE: {((cumulRechargesB6 * 6 + cumulRechargesB12 * 12.5) / 1000).toFixed(3)} T</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">PETRO IVOIRE</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-rechg-petro-b6-${index}`}>Recharges B6</Label>
                  <Input
                    id={`ligne-rechg-petro-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.recharges_petro_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'recharges_petro_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-rechg-petro-b12-${index}`}>Recharges B12</Label>
                <Input
                  id={`ligne-rechg-petro-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.recharges_petro_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'recharges_petro_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">TOTAL ENERGIES</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-rechg-total-b6-${index}`}>Recharges B6</Label>
                  <Input
                    id={`ligne-rechg-total-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.recharges_total_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'recharges_total_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-rechg-total-b12-${index}`}>Recharges B12</Label>
                <Input
                  id={`ligne-rechg-total-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.recharges_total_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'recharges_total_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">VIVO ENERGIES</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-rechg-vivo-b6-${index}`}>Recharges B6</Label>
                  <Input
                    id={`ligne-rechg-vivo-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.recharges_vivo_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'recharges_vivo_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-rechg-vivo-b12-${index}`}>Recharges B12</Label>
                <Input
                  id={`ligne-rechg-vivo-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.recharges_vivo_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'recharges_vivo_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between bg-black text-white py-2 px-3 rounded">
            <h5 className="font-medium text-sm">Quantité Consignes</h5>
            <div className="text-sm font-semibold flex gap-4">
              {!isB12Only && <span>Cumul B6: {cumulConsignesB6}</span>}
              <span>Cumul B12: {cumulConsignesB12}</span>
              <span>TONNAGE: {((cumulConsignesB6 * 6 + cumulConsignesB12 * 12.5) / 1000).toFixed(3)} T</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">PETRO IVOIRE</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-consig-petro-b6-${index}`}>Consignes B6</Label>
                  <Input
                    id={`ligne-consig-petro-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.consignes_petro_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'consignes_petro_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-consig-petro-b12-${index}`}>Consignes B12</Label>
                <Input
                  id={`ligne-consig-petro-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.consignes_petro_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'consignes_petro_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">TOTAL ENERGIES</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-consig-total-b6-${index}`}>Consignes B6</Label>
                  <Input
                    id={`ligne-consig-total-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.consignes_total_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'consignes_total_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-consig-total-b12-${index}`}>Consignes B12</Label>
                <Input
                  id={`ligne-consig-total-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.consignes_total_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'consignes_total_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">VIVO ENERGIES</p>
            <div className={`grid ${isB12Only ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isB12Only && (
                <div>
                  <Label htmlFor={`ligne-consig-vivo-b6-${index}`}>Consignes B6</Label>
                  <Input
                    id={`ligne-consig-vivo-b6-${index}`}
                    type="number"
                    min="0"
                    value={ligne.consignes_vivo_b6 ?? ''}
                    onChange={(e) => onUpdate(index, 'consignes_vivo_b6', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <Label htmlFor={`ligne-consig-vivo-b12-${index}`}>Consignes B12</Label>
                <Input
                  id={`ligne-consig-vivo-b12-${index}`}
                  type="number"
                  min="0"
                  value={ligne.consignes_vivo_b12 ?? ''}
                  onChange={(e) => onUpdate(index, 'consignes_vivo_b12', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Récapitulatif du tonnage */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">TONNAGE DE LA LIGNE {index + 1}</p>
            <p className="text-4xl font-bold text-orange-500">{tonnage.toFixed(3)} T</p>
          </div>
        </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
