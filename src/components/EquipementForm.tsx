import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wrench, Save, X } from "lucide-react";
import type { Equipement } from "@/types/equipement";

interface EquipementFormProps {
  equipement?: Equipement;
  onSubmit: (data: Omit<Equipement, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EquipementForm = ({ equipement, onSubmit, onCancel, loading = false }: EquipementFormProps) => {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (equipement) {
      setNom(equipement.nom);
      setCode(equipement.code ?? '');
    } else {
      setNom('');
      setCode('');
    }
  }, [equipement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    onSubmit({
      nom: nom.trim(),
      code: code.trim() || null,
      actif: equipement?.actif ?? true,
    });
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
