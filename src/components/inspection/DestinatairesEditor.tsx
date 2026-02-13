import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';
import type { InspectionDestinataireMail } from '@/types/inspection';
import { useDestinataires } from '@/hooks/useInspection';

export default function DestinatairesEditor() {
  const { destinataires, loading, refresh } = useDestinataires();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    if (!nom.trim() || !email.trim()) {
      toast.error('Nom et email requis');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Email invalide');
      return;
    }

    const { error } = await supabase.from('inspection_destinataires_mail').insert({
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Cet email existe déjà');
      } else {
        toast.error('Erreur: ' + error.message);
      }
      return;
    }

    toast.success('Destinataire ajouté');
    setNom('');
    setEmail('');
    await refresh();
  };

  const handleToggleActif = async (dest: InspectionDestinataireMail) => {
    await supabase.from('inspection_destinataires_mail').update({ actif: !dest.actif }).eq('id', dest.id);
    toast.success(`Destinataire ${dest.actif ? 'désactivé' : 'activé'}`);
    await refresh();
  };

  const handleDelete = async (dest: InspectionDestinataireMail) => {
    await supabase.from('inspection_destinataires_mail').delete().eq('id', dest.id);
    toast.success('Destinataire supprimé');
    await refresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Liste de diffusion</h3>
      <p className="text-sm text-muted-foreground">Les destinataires actifs recevront le rapport d'inspection par email lors de la validation.</p>

      <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-slate-50">
        <div className="flex-1 min-w-[150px]">
          <Label className="text-xs">Nom</Label>
          <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Chef Maintenance" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: maintenance@saepp.ci" />
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-16">Actif</TableHead>
            <TableHead className="w-16">Suppr.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinataires.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun destinataire</TableCell></TableRow>
          ) : (
            destinataires.map(dest => (
              <TableRow key={dest.id} className={!dest.actif ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{dest.nom}</TableCell>
                <TableCell className="text-sm">{dest.email}</TableCell>
                <TableCell><Switch checked={dest.actif} onCheckedChange={() => handleToggleActif(dest)} /></TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce destinataire ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(dest)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">{destinataires.filter(d => d.actif).length} destinataires actifs</p>
    </div>
  );
}
