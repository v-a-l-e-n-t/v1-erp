import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { Agent, Role } from "@/types/production";
import { z } from "zod";

const agentSchema = z.object({
    nom: z.string()
        .trim()
        .min(1, "Le nom est requis")
        .max(100, "Le nom ne peut pas dépasser 100 caractères"),
    prenom: z.string()
        .trim()
        .min(1, "Le prénom est requis")
        .max(100, "Le prénom ne peut pas dépasser 100 caractères"),
    role: z.string().min(1, "Le rôle est requis"),
});

interface AgentFormProps {
    agent?: Agent;
    roles: Role[];
    onSubmit: (data: Omit<Agent, 'id'>) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

const LIGNES = [1, 2, 3, 4, 5] as const;

export const AgentForm = ({ agent, roles, onSubmit, onCancel, loading }: AgentFormProps) => {
    const [formData, setFormData] = useState({
        nom: agent?.nom || '',
        prenom: agent?.prenom || '',
        role: agent?.role || (roles[0]?.code ?? ''),
    });
    const [lignesAffectees, setLignesAffectees] = useState<number[]>(
        agent?.lignes_affectees ?? [],
    );
    const [errors, setErrors] = useState<{ nom?: string; prenom?: string; role?: string }>({});

    useEffect(() => {
        if (agent) {
            setFormData({
                nom: agent.nom,
                prenom: agent.prenom,
                role: agent.role,
            });
            setLignesAffectees(agent.lignes_affectees ?? []);
        } else {
            // reset si on bascule en création
            setLignesAffectees([]);
        }
    }, [agent]);

    const handleChange = (field: 'nom' | 'prenom', value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const toggleLigne = (n: number) => {
        setLignesAffectees(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b),
        );
    };

    // Un chef de quart n'a pas de ligne → on grise/masque le bloc lignes
    const isChefQuart = formData.role === 'chef_quart';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const validated = agentSchema.parse(formData);
            await onSubmit({
                nom: validated.nom,
                prenom: validated.prenom,
                role: validated.role,
                lignes_affectees: isChefQuart ? [] : lignesAffectees,
            });
            setFormData({ nom: '', prenom: '', role: roles[0]?.code ?? '' });
            setLignesAffectees([]);
            setErrors({});
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: { nom?: string; prenom?: string; role?: string } = {};
                error.errors.forEach((err) => {
                    const path = err.path[0] as keyof typeof fieldErrors;
                    if (path) fieldErrors[path] = err.message;
                });
                setErrors(fieldErrors);
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{agent ? 'Modifier' : 'Ajouter'} un agent</CardTitle>
                <CardDescription>
                    {agent ? "Modifier les informations de l'agent" : 'Créer un nouvel agent'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <div>
                        <Label htmlFor="role">Rôle *</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, role: value }));
                                if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
                            }}
                        >
                            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(r => (
                                    <SelectItem key={r.id} value={r.code}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-sm text-destructive mt-1">{errors.role}</p>
                        )}
                    </div>

                    {!isChefQuart && (
                        <div>
                            <Label>Lignes d'affectation</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Coche les lignes sur lesquelles l'agent peut travailler.
                                Laisse vide si non applicable.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {LIGNES.map(n => (
                                    <label
                                        key={n}
                                        className="flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer hover:bg-muted/30"
                                    >
                                        <Checkbox
                                            checked={lignesAffectees.includes(n)}
                                            onCheckedChange={() => toggleLigne(n)}
                                        />
                                        <span className="text-sm font-medium">Ligne {n}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {isChefQuart && (
                        <p className="text-xs text-muted-foreground italic">
                            Un chef de quart n'est pas affecté à une ligne spécifique.
                        </p>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
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
