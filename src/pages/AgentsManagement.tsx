import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AgentForm } from "@/components/AgentForm";
import { AgentsList } from "@/components/AgentsList";
import { Agent } from "@/types/production";
import { useAudit } from "@/hooks/useAudit";

const AgentsManagement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // Auth disabled for dev
    const [isAdmin, setIsAdmin] = useState(true);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        checkAuth();
        loadAgents();
    }, []);

    const checkAuth = () => {
        // Authentification propriétaire (localStorage)
        const isAuth = localStorage.getItem("isAuthenticated") === "true";
        const storedUser = localStorage.getItem("user_name");

        if (!isAuth || !storedUser) {
            toast({
                title: "Authentification requise",
                description: "Veuillez vous connecter avec votre identifiant.",
                variant: "destructive"
            });
            setTimeout(() => navigate('/'), 2000);
        } else {
            setUserEmail(storedUser);
        }
    };

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

    const { logAction } = useAudit();

    const handleSubmit = async (data: Omit<Agent, 'id'>) => {
        setLoading(true);

        try {
            // Utiliser le nom stocké dans l'état (récupéré du localStorage)
            const userName = userEmail || localStorage.getItem('user_name') || 'Inconnu';

            const dataWithAudit = {
                ...data,
                last_modified_by: userName,
                last_modified_at: new Date().toISOString()
            };

            if (editingAgent) {
                const { error } = await (supabase as any)
                    .from('agents')
                    .update(dataWithAudit)
                    .eq('id', editingAgent.id);

                if (error) throw error;

                await logAction({
                    table_name: 'agents',
                    record_id: editingAgent.id,
                    action: 'UPDATE',
                    details: data
                });

                toast({
                    title: "Succès",
                    description: "Agent modifié avec succès"
                });
            } else {
                const { data: newAgentData, error } = await (supabase as any)
                    .from('agents')
                    .insert(dataWithAudit)
                    .select()
                    .single();

                if (error) throw error;

                await logAction({
                    table_name: 'agents',
                    record_id: newAgentData.id,
                    action: 'CREATE',
                    details: data
                });

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

            await logAction({
                table_name: 'agents',
                record_id: id,
                action: 'DELETE'
            });

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
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    Chefs de ligne, Chefs de quart, Agents d'exploitation, Agents mouvement
                                </p>
                                {userEmail && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        Utilisateur : {userEmail}
                                    </span>
                                )}
                            </div>
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
