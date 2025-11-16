import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { ArretProduction, ArretType, EtapeLigne, ARRET_LABELS, ETAPE_LABELS } from "@/types/production";

interface ArretProductionFormProps {
  arret: ArretProduction;
  index: number;
  onUpdate: (index: number, field: keyof ArretProduction, value: any) => void;
  onRemove: (index: number) => void;
  allowedLigne?: number;
}

export const ArretProductionForm = ({ arret, index, onUpdate, onRemove, allowedLigne }: ArretProductionFormProps) => {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Arrêt #{index + 1}</h4>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`arret-debut-${index}`}>Heure de début *</Label>
          <Input
            id={`arret-debut-${index}`}
            type="time"
            value={arret.heure_debut}
            onChange={(e) => onUpdate(index, 'heure_debut', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor={`arret-fin-${index}`}>Heure de fin *</Label>
          <Input
            id={`arret-fin-${index}`}
            type="time"
            value={arret.heure_fin}
            onChange={(e) => onUpdate(index, 'heure_fin', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor={`arret-type-${index}`}>Type d'arrêt *</Label>
          <Select
            value={arret.type_arret}
            onValueChange={(value) => onUpdate(index, 'type_arret', value as ArretType)}
          >
            <SelectTrigger id={`arret-type-${index}`}>
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ARRET_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ligne concernée *</Label>
          <div className="flex gap-4 mt-2">
            {[1, 2, 3, 4, 5].map((ligne) => (
              <div key={ligne} className="flex items-center space-x-2">
                <Checkbox
                  id={`arret-ligne-${index}-${ligne}`}
                  checked={arret.lignes_concernees?.includes(ligne) || false}
                  disabled={allowedLigne !== undefined && ligne !== allowedLigne}
                  onCheckedChange={(checked) => {
                    if (allowedLigne !== undefined && ligne === allowedLigne) {
                      onUpdate(index, 'lignes_concernees', checked ? [ligne] : []);
                    }
                  }}
                />
                <Label 
                  htmlFor={`arret-ligne-${index}-${ligne}`}
                  className={`text-sm font-normal ${allowedLigne !== undefined && ligne !== allowedLigne ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  L{ligne}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor={`arret-etape-${index}`}>Étape de la ligne</Label>
          <Select
            value={arret.etape_ligne || ''}
            onValueChange={(value) => onUpdate(index, 'etape_ligne', value as EtapeLigne)}
          >
            <SelectTrigger id={`arret-etape-${index}`}>
              <SelectValue placeholder="Sélectionner une étape" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ETAPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`arret-ordre-${index}`}>Ordre de travail</Label>
          <Input
            id={`arret-ordre-${index}`}
            type="text"
            value={arret.ordre_intervention || ''}
            onChange={(e) => onUpdate(index, 'ordre_intervention', e.target.value)}
            placeholder="Ex: OI-2024-001"
            maxLength={100}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor={`arret-description-${index}`}>Description</Label>
          <Textarea
            id={`arret-description-${index}`}
            value={arret.description || ''}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            placeholder="Détails de l'arrêt..."
            rows={2}
            maxLength={500}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor={`arret-action-${index}`}>Action corrective</Label>
          <Textarea
            id={`arret-action-${index}`}
            value={arret.action_corrective || ''}
            onChange={(e) => onUpdate(index, 'action_corrective', e.target.value)}
            placeholder="Action corrective effectuée..."
            rows={2}
            maxLength={500}
          />
        </div>
      </div>
    </Card>
  );
};
