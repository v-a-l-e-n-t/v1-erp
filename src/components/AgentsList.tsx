import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { Agent, AGENT_ROLES } from "@/types/production";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";

interface AgentsListProps {
    agents: Agent[];
    onEdit: (agent: Agent) => void;
    onDelete: (id: string) => Promise<void>;
    loading: boolean;
}

export const AgentsList = ({ agents, onEdit, onDelete, loading }: AgentsListProps) => {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');

    const handleDeleteClick = (agent: Agent) => {
        setSelectedAgent(agent);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedAgent) {
            await onDelete(selectedAgent.id);
            setDeleteDialogOpen(false);
            setSelectedAgent(null);
        }
    };

    const filteredAgents = agents.filter(agent =>
        filterRole === 'all' || agent.role === filterRole
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Liste des agents</CardTitle>
                                <CardDescription>
                                    {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} affiché{filteredAgents.length > 1 ? 's' : ''} (Total: {agents.length})
                                </CardDescription>
                            </div>
                        </div>
                        <Tabs defaultValue="all" value={filterRole} onValueChange={setFilterRole} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                                <TabsTrigger value="all">Tous</TabsTrigger>
                                <TabsTrigger value="chef_ligne">Chefs de ligne</TabsTrigger>
                                <TabsTrigger value="chef_quart">Chefs de quart</TabsTrigger>
                                <TabsTrigger value="agent_exploitation">Exploitation</TabsTrigger>
                                <TabsTrigger value="agent_mouvement">Mouvement</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAgents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Aucun agent trouvé dans cette catégorie.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Prénom</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAgents.map((agent) => (
                                    <TableRow key={agent.id}>
                                        <TableCell className="font-medium">{agent.nom}</TableCell>
                                        <TableCell>{agent.prenom}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-100 whitespace-nowrap">
                                                {AGENT_ROLES[agent.role] || agent.role || 'Inconnu'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end items-center">
                                                <AuditHistoryDialog
                                                    tableName="agents"
                                                    recordId={agent.id}
                                                    recordTitle={`${agent.nom} ${agent.prenom}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onEdit(agent)}
                                                    disabled={loading}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(agent)}
                                                    disabled={loading}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer {selectedAgent?.prenom} {selectedAgent?.nom} ?
                            Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
