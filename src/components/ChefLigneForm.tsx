import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { ChefLigne } from "@/types/production";
import { z } from "zod";

const chefLigneSchema = z.object({
  nom: z.string()
    .trim()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  prenom: z.string()
    .trim()
    .min(1, "Le prénom est requis")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères")
});

interface ChefLigneFormProps {
  chef?: ChefLigne;
  onSubmit: (data: Omit<ChefLigne, 'id'>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export const ChefLigneForm = ({ chef, onSubmit, onCancel, loading }: ChefLigneFormProps) => {
  const [formData, setFormData] = useState({
    nom: chef?.nom || '',
    prenom: chef?.prenom || ''
  });
  const [errors, setErrors] = useState<{ nom?: string; prenom?: string }>({});

  useEffect(() => {
    if (chef) {
      setFormData({
        nom: chef.nom,
        prenom: chef.prenom
      });
    }
  }, [chef]);

  const handleChange = (field: 'nom' | 'prenom', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = chefLigneSchema.parse(formData);
      await onSubmit({
        nom: validated.nom,
        prenom: validated.prenom
      });
      setFormData({ nom: '', prenom: '' });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { nom?: string; prenom?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'nom' || err.path[0] === 'prenom') {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chef ? 'Modifier' : 'Ajouter'} un chef de ligne</CardTitle>
        <CardDescription>
          {chef ? 'Modifier les informations du chef de ligne' : 'Créer un nouveau chef de ligne'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              type="text"
              value={formData.nom}
              onChange={(e) => handleChange('nom', e.target.value)}
              maxLength={100}
              className={errors.nom ? 'border-destructive' : ''}
            />
            {errors.nom && (
              <p className="text-sm text-destructive mt-1">{errors.nom}</p>
            )}
          </div>

          <div>
            <Label htmlFor="prenom">Prénom *</Label>
            <Input
              id="prenom"
              type="text"
              value={formData.prenom}
              onChange={(e) => handleChange('prenom', e.target.value)}
              maxLength={100}
              className={errors.prenom ? 'border-destructive' : ''}
            />
            {errors.prenom && (
              <p className="text-sm text-destructive mt-1">{errors.prenom}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
