import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { Agent, AgentRole, AGENT_ROLES } from "@/types/production";
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
    role: z.enum(['chef_ligne', 'chef_quart', 'chef_equipe_atelier', 'agent_exploitation', 'agent_mouvement'] as [string, ...string[]], {
        required_error: "Le rôle est requis",
    })
});

interface AgentFormProps {
    agent?: Agent;
    onSubmit: (data: Omit<Agent, 'id'>) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

export const AgentForm = ({ agent, onSubmit, onCancel, loading }: AgentFormProps) => {
    const [formData, setFormData] = useState({
        nom: agent?.nom || '',
        prenom: agent?.prenom || '',
        role: agent?.role || 'chef_ligne' as AgentRole
    });
    const [errors, setErrors] = useState<{ nom?: string; prenom?: string; role?: string }>({});

    useEffect(() => {
        if (agent) {
            setFormData({
                nom: agent.nom,
                prenom: agent.prenom,
                role: agent.role
            });
        }
    }, [agent]);

    const handleChange = (field: 'nom' | 'prenom', value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleRoleChange = (value: AgentRole) => {
        setFormData(prev => ({ ...prev, role: value }));
        if (errors.role) {
            setErrors(prev => ({ ...prev, role: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const validated = agentSchema.parse(formData);
            await onSubmit({
                nom: validated.nom,
                prenom: validated.prenom,
                role: validated.role as AgentRole
            });
            setFormData({ nom: '', prenom: '', role: 'chef_ligne' });
            setErrors({});
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: { nom?: string; prenom?: string; role?: string } = {};
                error.errors.forEach((err) => {
                    const path = err.path[0] as keyof typeof fieldErrors;
                    if (path) {
                        fieldErrors[path] = err.message;
                    }
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
                            onValueChange={(value) => handleRoleChange(value as AgentRole)}
                        >
                            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(AGENT_ROLES).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-sm text-destructive mt-1">{errors.role}</p>
                        )}
                    </div>

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
