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

interface AgentsListProps {
    agents: Agent[];
    onEdit: (agent: Agent) => void;
    onDelete: (id: string) => Promise<void>;
    loading: boolean;
}

export const AgentsList = ({ agents, onEdit, onDelete, loading }: AgentsListProps) => {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'chef_ligne': return 'default';
            case 'chef_quart': return 'secondary';
            case 'agent_exploitation': return 'outline';
            case 'agent_mouvement': return 'destructive'; // Just for distinction
            default: return 'outline';
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Liste des agents</CardTitle>
                    <CardDescription>
                        {agents.length} agent{agents.length > 1 ? 's' : ''} enregistré{agents.length > 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {agents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Aucun agent enregistré. Ajoutez-en un pour commencer.
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
                                {agents.map((agent) => (
                                    <TableRow key={agent.id}>
                                        <TableCell className="font-medium">{agent.nom}</TableCell>
                                        <TableCell>{agent.prenom}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-100">
                                                {AGENT_ROLES[agent.role]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
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
