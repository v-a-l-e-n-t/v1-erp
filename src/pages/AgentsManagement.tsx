import { useState, useEffect } from "react";
import { Users, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AgentForm } from "@/components/AgentForm";
import { AgentsList } from "@/components/AgentsList";
import { RolesManagementCard } from "@/components/RolesManagementCard";
import { EquipementForm } from "@/components/EquipementForm";
import { EquipementsList } from "@/components/EquipementsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Agent, Role } from "@/types/production";
import type { Equipement, EquipementLigne, EquipementWithLignes } from "@/types/equipement";
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
    const [equipements, setEquipements] = useState<EquipementWithLignes[]>([]);
    const [editingEquipement, setEditingEquipement] = useState<EquipementWithLignes | undefined>();
    const userEmail = session?.user_name ?? '';
    const { logAction } = useAudit();

    useEffect(() => {
        if (isAuthenticated) {
            loadRoles();
            loadAgents();
            loadEquipements();
        }
    }, [isAuthenticated]);

    // ============== AGENTS ==============

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

    const syncAgentLignes = async (agentId: string, lignes: number[]) => {
        await (supabase as any).from('agents_lignes').delete().eq('agent_id', agentId);
        if (lignes.length > 0) {
            await (supabase as any).from('agents_lignes').insert(
                lignes.map(n => ({ agent_id: agentId, numero_ligne: n })),
            );
        }
    };

    const handleAgentSubmit = async (data: Omit<Agent, 'id'>) => {
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
                await logAction({ table_name: 'agents', record_id: agentId, action: 'UPDATE', details: data });
                toast({ title: "Succès", description: "Agent modifié avec succès" });
            } else {
                const { data: newAgentData, error } = await (supabase as any)
                    .from('agents')
                    .insert(dataWithAudit)
                    .select()
                    .single();
                if (error) throw error;
                agentId = newAgentData.id;
                await logAction({ table_name: 'agents', record_id: agentId, action: 'CREATE', details: data });
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

    const handleAgentEdit = (agent: Agent) => {
        setEditingAgent(agent);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAgentDelete = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await (supabase as any).from('agents').delete().eq('id', id);
            if (error) throw error;
            await logAction({ table_name: 'agents', record_id: id, action: 'DELETE' });
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

    // ============== EQUIPEMENTS ==============

    const loadEquipements = async () => {
        const { data: eq, error: eqErr } = await (supabase as any)
            .from('equipements')
            .select('*')
            .order('nom');
        if (eqErr) {
            console.error("Error loading equipements:", eqErr);
            return;
        }
        const { data: lignes, error: lErr } = await (supabase as any)
            .from('equipements_lignes')
            .select('*');
        if (lErr) {
            console.error("Error loading equipements_lignes:", lErr);
        }
        const byEquipement = new Map<string, EquipementLigne[]>();
        (lignes ?? []).forEach((l: EquipementLigne) => {
            const arr = byEquipement.get(l.equipement_id) ?? [];
            arr.push(l);
            byEquipement.set(l.equipement_id, arr);
        });
        const enriched: EquipementWithLignes[] = (eq || []).map((e: Equipement) => ({
            ...e,
            lignes: byEquipement.get(e.id) ?? [],
        }));
        setEquipements(enriched);
    };

    /** Sync les affectations equipements_lignes : on supprime tout puis on
     *  reinsere la selection. Idempotent. */
    const syncEquipementLignes = async (
        equipementId: string,
        lignes: Array<Pick<EquipementLigne, 'numero_ligne' | 'actif' | 'motif_inactif'>>,
    ) => {
        const userName = userEmail || localStorage.getItem('user_name') || 'Inconnu';
        const now = new Date().toISOString();
        await (supabase as any).from('equipements_lignes').delete().eq('equipement_id', equipementId);
        if (lignes.length > 0) {
            await (supabase as any).from('equipements_lignes').insert(
                lignes.map(l => ({
                    equipement_id: equipementId,
                    numero_ligne: l.numero_ligne,
                    actif: l.actif,
                    motif_inactif: l.motif_inactif,
                    last_modified_by: userName,
                    last_modified_at: now,
                })),
            );
        }
    };

    const handleEquipementSubmit = async (
        data: Omit<Equipement, 'id' | 'created_at'>,
        lignes: Array<Pick<EquipementLigne, 'numero_ligne' | 'actif' | 'motif_inactif'>>,
    ) => {
        setLoading(true);
        try {
            const userName = userEmail || localStorage.getItem('user_name') || 'Inconnu';
            const payload = {
                ...data,
                last_modified_by: userName,
                last_modified_at: new Date().toISOString(),
            };

            let equipementId: string;
            if (editingEquipement) {
                const { error } = await (supabase as any)
                    .from('equipements')
                    .update(payload)
                    .eq('id', editingEquipement.id);
                if (error) throw error;
                equipementId = editingEquipement.id;
                await logAction({ table_name: 'equipements', record_id: equipementId, action: 'UPDATE', details: { ...data, lignes } });
                toast({ title: "Succès", description: "Équipement modifié" });
            } else {
                const { data: created, error } = await (supabase as any)
                    .from('equipements')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                equipementId = created.id;
                await logAction({ table_name: 'equipements', record_id: equipementId, action: 'CREATE', details: { ...data, lignes } });
                toast({ title: "Succès", description: "Équipement ajouté" });
            }

            await syncEquipementLignes(equipementId, lignes);
            await loadEquipements();
            setEditingEquipement(undefined);
        } catch (error: any) {
            console.error('Error saving equipement:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible d'enregistrer l'équipement",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEquipementEdit = (eq: EquipementWithLignes) => {
        setEditingEquipement(eq);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEquipementDelete = async (id: string) => {
        setLoading(true);
        try {
            // equipements_lignes auto-supprime par ON DELETE CASCADE
            const { error } = await (supabase as any).from('equipements').delete().eq('id', id);
            if (error) throw error;
            await logAction({ table_name: 'equipements', record_id: id, action: 'DELETE' });
            toast({ title: "Succès", description: "Équipement supprimé" });
            await loadEquipements();
        } catch (error: any) {
            console.error('Error deleting equipement:', error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible de supprimer l'équipement",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
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
                            <h1 className="text-2xl font-bold">Gestion des Agents et équipements</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    Rôles, agents (multi-lignes) et équipements de production
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
                <Tabs defaultValue="agents" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="agents" className="gap-2">
                            <Users className="h-4 w-4" />
                            Agents
                        </TabsTrigger>
                        <TabsTrigger value="equipements" className="gap-2">
                            <Wrench className="h-4 w-4" />
                            Équipements
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="agents" className="space-y-6">
                        <RolesManagementCard roles={roles} onChanged={loadRoles} />
                        <AgentForm
                            agent={editingAgent}
                            roles={roles}
                            onSubmit={handleAgentSubmit}
                            onCancel={() => setEditingAgent(undefined)}
                            loading={loading}
                        />
                        <AgentsList
                            agents={agents}
                            roles={roles}
                            onEdit={handleAgentEdit}
                            onDelete={handleAgentDelete}
                            loading={loading}
                        />
                    </TabsContent>

                    <TabsContent value="equipements" className="space-y-6">
                        <EquipementForm
                            equipement={editingEquipement}
                            onSubmit={handleEquipementSubmit}
                            onCancel={() => setEditingEquipement(undefined)}
                            loading={loading}
                        />
                        <EquipementsList
                            equipements={equipements}
                            onEdit={handleEquipementEdit}
                            onDelete={handleEquipementDelete}
                            loading={loading}
                        />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default AgentsManagement;
