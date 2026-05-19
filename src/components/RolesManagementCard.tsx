import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Loader2, ShieldCheck, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Role } from '@/types/production';

interface RolesManagementCardProps {
  roles: Role[];
  onChanged: () => void;
}

/**
 * Mini-CRUD inline des rôles agents.
 * - Création : label libre, code auto-généré (snake_case).
 * - Édition : label seul (le code reste stable pour ne pas casser les agents
 *   existants qui le référencent dans `agents.role`).
 * - Suppression : refusée si des agents l'utilisent encore.
 */
export function RolesManagementCard({ roles, onChanged }: RolesManagementCardProps) {
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Génère un code snake_case à partir du label
  const toCode = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // retire accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error('Le libellé est requis.');
      return;
    }
    const code = toCode(label);
    if (!code) {
      toast.error('Libellé invalide.');
      return;
    }
    if (roles.some((r) => r.code === code)) {
      toast.error(`Le code "${code}" existe déjà.`);
      return;
    }
    setCreating(true);
    const { error } = await (supabase as any)
      .from('roles')
      .insert({ code, label, actif: true });
    setCreating(false);
    if (error) {
      console.error(error);
      toast.error("Échec de la création du rôle.");
      return;
    }
    toast.success(`Rôle "${label}" créé.`);
    setNewLabel('');
    onChanged();
  };

  const handleSaveEdit = async (id: string) => {
    const label = editLabel.trim();
    if (!label) {
      toast.error('Le libellé est requis.');
      return;
    }
    const { error } = await (supabase as any)
      .from('roles')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error(error);
      toast.error("Échec de la mise à jour.");
      return;
    }
    toast.success('Rôle mis à jour.');
    setEditingId(null);
    onChanged();
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    // Vérifier d'abord qu'aucun agent ne l'utilise
    const { count, error: countErr } = await (supabase as any)
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('role', deletingRole.code);
    if (countErr) {
      console.error(countErr);
      toast.error("Échec de la vérification.");
      setDeleting(false);
      return;
    }
    if ((count ?? 0) > 0) {
      toast.error(`Impossible : ${count} agent(s) ont ce rôle. Change-les d'abord.`);
      setDeleting(false);
      setDeletingRole(null);
      return;
    }
    const { error } = await (supabase as any)
      .from('roles')
      .delete()
      .eq('id', deletingRole.id);
    setDeleting(false);
    if (error) {
      console.error(error);
      toast.error("Échec de la suppression.");
      return;
    }
    toast.success(`Rôle "${deletingRole.label}" supprimé.`);
    setDeletingRole(null);
    onChanged();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Gestion des rôles
          </CardTitle>
          <CardDescription>
            Crée librement les rôles que tu pourras affecter aux agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="new-role">Nouveau rôle</Label>
              <Input
                id="new-role"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex : Chef de zone, Opérateur palette…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              {newLabel.trim() && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  code : {toCode(newLabel)}
                </p>
              )}
            </div>
            <Button onClick={handleCreate} disabled={creating || !newLabel.trim()}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Ajouter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Aucun rôle.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(r.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        r.label
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.code}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editingId === r.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEdit(r.id)}
                              title="Enregistrer"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(null)}
                              title="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Renommer"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditLabel(r.label);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingRole(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingRole} onOpenChange={(o) => !o && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rôle "{deletingRole?.label}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Suppression refusée si des agents l'utilisent encore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
