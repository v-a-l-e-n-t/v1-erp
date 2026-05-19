import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AgentForm } from "@/components/AgentForm";
import { AgentsList } from "@/components/AgentsList";
import { RolesManagementCard } from "@/components/RolesManagementCard";
import { Agent, Role } from "@/types/production";
import { useAudit } from "@/hooks/useAudit";
import { useAppAuth } from "@/hooks/useAppAuth";
import PasswordGate from "@/components/PasswordGate";

const AgentsManagement = () => {
    const navigate = useNavigate();
    const { session, isAuthenticated } = useAppAuth();
    const [, setAuthTick] = useState(0);
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
    const userEmail = session?.user_name ?? '';

    useEffect(() => {
        if (isAuthenticated) {
            loadRoles();
            loadAgents();
        }
    }, [isAuthenticated]);

    const loadRoles = async () => {
        const { data, error } = await (supabase as any)
            .from('roles')
            .select('*')
            .order('label');
        if (error) {
            console.error("Error loading roles:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les rôles.",
                variant: "destructive",
            });
            return;
        }
        setRoles(data || []);
    };

    const loadAgents = async () => {
        const { data, error } = await (supabase as any)
            .from('agents')
            .select('*')
            .order('nom');
        if (error) {
            console.error("Error loading agents:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les agents.",
                variant: "destructive",
            });
            return;
        }

        // Charge en parallèle les affectations de lignes
        const { data: aff, error: affErr } = await (supabase as any)
            .from('agents_lignes')
            .select('agent_id, numero_ligne');
        if (affErr) {
            console.error("Error loading agents_lignes:", affErr);
        }
        const byAgent = new Map<string, number[]>();
        (aff ?? []).forEach((row: any) => {
            const arr = byAgent.get(row.agent_id) ?? [];
            arr.push(row.numero_ligne);
            byAgent.set(row.agent_id, arr);
        });

        const enriched = (data || []).map((a: Agent) => ({
            ...a,
            lignes_affectees: (byAgent.get(a.id) ?? []).sort((x, y) => x - y),
        }));
        setAgents(enriched);
    };

    const { logAction } = useAudit();

    // Synchronise les lignes affectées d'un agent : on supprime tout, on
    // réinsère la sélection. Simple et idempotent.
    const syncAgentLignes = async (agentId: string, lignes: number[]) => {
        await (supabase as any).from('agents_lignes').delete().eq('agent_id', agentId);
        if (lignes.length > 0) {
            await (supabase as any).from('agents_lignes').insert(
                lignes.map(n => ({ agent_id: agentId, numero_ligne: n })),
            );
        }
    };

    const handleSubmit = async (data: Omit<Agent, 'id'>) => {
        setLoading(true);
        try {
            const userName = userEmail || localStorage.getItem('user_name') || 'Inconnu';
            const { lignes_affectees, ...agentFields } = data;
            const dataWithAudit = {
                ...agentFields,
                last_modified_by: userName,
                last_modified_at: new Date().toISOString(),
            };

            let agentId: string;
            if (editingAgent) {
                const { error } = await (supabase as any)
                    .from('agents')
                    .update(dataWithAudit)
                    .eq('id', editingAgent.id);
                if (error) throw error;
                agentId = editingAgent.id;
                await logAction({
                    table_name: 'agents',
                    record_id: agentId,
                    action: 'UPDATE',
                    details: data,
                });
                toast({ title: "Succès", description: "Agent modifié avec succès" });
            } else {
                const { data: newAgentData, error } = await (supabase as any)
                    .from('agents')
                    .insert(dataWithAudit)
                    .select()
                    .single();
                if (error) throw error;
                agentId = newAgentData.id;
                await logAction({
                    table_name: 'agents',
                    record_id: agentId,
                    action: 'CREATE',
                    details: data,
                });
                toast({ title: "Succès", description: "Agent ajouté avec succès" });
            }

            await syncAgentLignes(agentId, lignes_affectees ?? []);
            await loadAgents();
            setEditingAgent(undefined);
        } catch (error: any) {
            console.error('Error saving agent:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible d'enregistrer l'agent",
                variant: "destructive",
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
            // agents_lignes auto-supprimé par ON DELETE CASCADE
            const { error } = await (supabase as any)
                .from('agents')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await logAction({
                table_name: 'agents',
                record_id: id,
                action: 'DELETE',
            });
            toast({ title: "Succès", description: "Agent supprimé avec succès" });
            await loadAgents();
        } catch (error: any) {
            console.error('Error deleting agent:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible de supprimer l'agent",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditingAgent(undefined);
    };

    if (!isAuthenticated) {
        return <PasswordGate onAuthenticated={() => setAuthTick((t) => t + 1)} />;
    }

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
                                    Rôles personnalisables + affectation multi-lignes
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

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="space-y-6">
                    <RolesManagementCard roles={roles} onChanged={loadRoles} />

                    <AgentForm
                        agent={editingAgent}
                        roles={roles}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        loading={loading}
                    />

                    <AgentsList
                        agents={agents}
                        roles={roles}
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
