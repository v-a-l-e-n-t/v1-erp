import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AgentForm } from "@/components/AgentForm";
import { AgentsList } from "@/components/AgentsList";
import { Agent } from "@/types/production";

const AgentsManagement = () => {
    const [loading, setLoading] = useState(false);
    // Auth disabled for dev
    const [isAdmin, setIsAdmin] = useState(true);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>();

    useEffect(() => {
        loadAgents();
    }, []);

    const loadAgents = async () => {
        // Assuming table is 'agents' or 'chefs_ligne' with role column
        // For now I will try to use the 'agents' table as we are refactoring.
        // If it fails I will notify user.
        const { data, error } = await (supabase as any)
            .from('agents')
            .select('*')
            .order('nom');

        if (error) {
            console.error("Error loading agents:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les agents (Table 'agents' existante ?)",
                variant: "destructive"
            });
            return;
        }

        setAgents(data || []);
    };

    const handleSubmit = async (data: Omit<Agent, 'id'>) => {
        setLoading(true);

        try {
            if (editingAgent) {
                const { error } = await (supabase as any)
                    .from('agents')
                    .update(data)
                    .eq('id', editingAgent.id);

                if (error) throw error;

                toast({
                    title: "Succès",
                    description: "Agent modifié avec succès"
                });
            } else {
                const { error } = await (supabase as any)
                    .from('agents')
                    .insert(data);

                if (error) throw error;

                toast({
                    title: "Succès",
                    description: "Agent ajouté avec succès"
                });
            }

            await loadAgents();
            setEditingAgent(undefined);
        } catch (error: any) {
            console.error('Error saving agent:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible d'enregistrer l'agent",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (agent: Agent) => {
        setEditingAgent(agent);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        setLoading(true);

        try {
            const { error } = await (supabase as any)
                .from('agents')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Succès",
                description: "Agent supprimé avec succès"
            });

            await loadAgents();
        } catch (error: any) {
            console.error('Error deleting agent:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible de supprimer l'agent",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingAgent(undefined);
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold">Gestion des Agents</h1>
                            <p className="text-sm text-muted-foreground">
                                Chefs de ligne, Chefs de quart, Agents d'exploitation, Agents mouvement
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="space-y-6">
                    <AgentForm
                        agent={editingAgent}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        loading={loading}
                    />

                    <AgentsList
                        agents={agents}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        loading={loading}
                    />
                </div>
            </main>
        </div>
    );
};

export default AgentsManagement;
