import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { LigneProduction, ChefLigne } from "@/types/production";

interface LigneProductionFormProps {
  ligne: LigneProduction;
  index: number;
  chefsLigne: ChefLigne[];
  onUpdate: (index: number, field: keyof LigneProduction, value: any) => void;
  onRemove: (index: number) => void;
  isB12Only?: boolean; // True si on est sur une ligne B12 uniquement
}

export const LigneProductionForm = ({ ligne, index, chefsLigne, onUpdate, onRemove, isB12Only = false }: LigneProductionFormProps) => {
  // Calcul du cumul total
  const cumul = (ligne.recharges_petro_b6 || 0) + (ligne.recharges_petro_b12 || 0) +
                (ligne.recharges_total_b6 || 0) + (ligne.recharges_total_b12 || 0) +
                (ligne.recharges_vivo_b6 || 0) + (ligne.recharges_vivo_b12 || 0) +
                (ligne.consignes_petro_b6 || 0) + (ligne.consignes_petro_b12 || 0) +
                (ligne.consignes_total_b6 || 0) + (ligne.consignes_total_b12 || 0) +
                (ligne.consignes_vivo_b6 || 0) + (ligne.consignes_vivo_b12 || 0);

  // Calcul du tonnage (B6 = 6kg, B12 = 12.5kg)
  const totalB6 = (ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0) +
                  (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
  const totalB12 = (ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0) +
                   (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
  const tonnage = (totalB6 * 6 + totalB12 * 12.5) / 1000; // Convertir en tonnes

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Ligne {index + 1}</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
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
              {!isB12Only && <span>Cumul B6: {(ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0)}</span>}
              <span>Cumul B12: {(ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0)}</span>
              <span>TONNAGE: {((((ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0)) * 6 + 
                      ((ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0)) * 12.5) / 1000).toFixed(3)} T</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">PETRO IVOIRE</p>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
              {!isB12Only && <span>Cumul B6: {(ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0)}</span>}
              <span>Cumul B12: {(ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0)}</span>
              <span>TONNAGE: {((((ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0)) * 6 + 
                      ((ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0)) * 12.5) / 1000).toFixed(3)} T</span>
            </div>
          </div>
          
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-orange-500">PETRO IVOIRE</p>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
    </Card>
  );
};
