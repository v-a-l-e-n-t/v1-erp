import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { InspectionZone, InspectionSousZone, InspectionEquipement } from '@/types/inspection';

interface EquipementEditorProps {
  zones: InspectionZone[];
  sousZones: InspectionSousZone[];
  equipements: InspectionEquipement[];
  onRefresh: () => Promise<void>;
}

export default function EquipementEditor({ zones, sousZones, equipements, onRefresh }: EquipementEditorProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [selectedSousZoneId, setSelectedSousZoneId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipement, setEditingEquipement] = useState<InspectionEquipement | null>(null);

  const [formNom, setFormNom] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrdre, setFormOrdre] = useState('0');
  const [formZoneId, setFormZoneId] = useState('');
  const [formSousZoneId, setFormSousZoneId] = useState<string>('');

  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);
  const zoneSousZones = selectedZoneId !== 'all'
    ? sousZones.filter(sz => sz.zone_id === selectedZoneId && sz.actif).sort((a, b) => a.ordre - b.ordre)
    : [];

  const filteredEquipements = equipements
    .filter(e => {
      if (selectedZoneId !== 'all' && e.zone_id !== selectedZoneId) return false;
      if (selectedSousZoneId !== 'all' && e.sous_zone_id !== selectedSousZoneId) return false;
      return true;
    })
    .sort((a, b) => a.ordre - b.ordre);

  const getZoneName = (zoneId: string) => zones.find(z => z.id === zoneId)?.libelle || '';
  const getSousZoneName = (szId: string | null) => szId ? sousZones.find(sz => sz.id === szId)?.libelle || '' : '—';

  const resetForm = () => {
    setFormNom('');
    setFormDescription('');
    setFormOrdre('0');
    setFormZoneId(selectedZoneId !== 'all' ? selectedZoneId : (activeZones[0]?.id ?? ''));
    setFormSousZoneId('');
    setEditingEquipement(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (eq: InspectionEquipement) => {
    setFormNom(eq.nom);
    setFormDescription(eq.description || '');
    setFormOrdre(String(eq.ordre));
    setFormZoneId(eq.zone_id);
    setFormSousZoneId(eq.sous_zone_id || '');
    setEditingEquipement(eq);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNom.trim() || !formZoneId) {
      toast.error('Nom et zone requis');
      return;
    }

    const data = {
      nom: formNom.trim(),
      description: formDescription.trim() || null,
      ordre: parseInt(formOrdre) || 0,
      zone_id: formZoneId,
      sous_zone_id: formSousZoneId || null,
    };

    if (editingEquipement) {
      const { error } = await supabase.from('inspection_equipements').update(data).eq('id', editingEquipement.id);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Équipement modifié');
    } else {
      const { error } = await supabase.from('inspection_equipements').insert(data);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Équipement ajouté');
    }

    setDialogOpen(false);
    resetForm();
    await onRefresh();
  };

  const handleToggleActif = async (eq: InspectionEquipement) => {
    await supabase.from('inspection_equipements').update({ actif: !eq.actif }).eq('id', eq.id);
    toast.success(`Équipement ${eq.actif ? 'désactivé' : 'activé'}`);
    await onRefresh();
  };

  const handleDelete = async (eq: InspectionEquipement) => {
    await supabase.from('inspection_equipements').update({ actif: false }).eq('id', eq.id);
    toast.success('Équipement désactivé');
    await onRefresh();
  };

  const formSousZones = formZoneId
    ? sousZones.filter(sz => sz.zone_id === formZoneId && sz.actif).sort((a, b) => a.ordre - b.ordre)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Zone</Label>
          <Select value={selectedZoneId} onValueChange={(v) => { setSelectedZoneId(v); setSelectedSousZoneId('all'); }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les zones</SelectItem>
              {activeZones.map(z => <SelectItem key={z.id} value={z.id}>{z.libelle}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {zoneSousZones.length > 0 && (
          <div>
            <Label className="text-xs">Sous-zone</Label>
            <Select value={selectedSousZoneId} onValueChange={setSelectedSousZoneId}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {zoneSousZones.map(sz => <SelectItem key={sz.id} value={sz.id}>{sz.libelle}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button size="sm" onClick={openAddDialog}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEquipement ? 'Modifier' : 'Nouvel'} équipement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={formNom} onChange={e => setFormNom(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div>
              <Label>Zone</Label>
              <Select value={formZoneId} onValueChange={(v) => { setFormZoneId(v); setFormSousZoneId(''); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {activeZones.map(z => <SelectItem key={z.id} value={z.id}>{z.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formSousZones.length > 0 && (
              <div>
                <Label>Sous-zone</Label>
                <Select value={formSousZoneId} onValueChange={setFormSousZoneId}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {formSousZones.map(sz => <SelectItem key={sz.id} value={sz.id}>{sz.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Ordre d'affichage</Label><Input type="number" value={formOrdre} onChange={e => setFormOrdre(e.target.value)} /></div>
            <Button onClick={handleSave} className="w-full">{editingEquipement ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Description</TableHead>
            {selectedZoneId === 'all' && <TableHead>Zone</TableHead>}
            <TableHead>Sous-zone</TableHead>
            <TableHead className="w-16">Ordre</TableHead>
            <TableHead className="w-16">Actif</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEquipements.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucun équipement</TableCell></TableRow>
          ) : (
            filteredEquipements.map(eq => (
              <TableRow key={eq.id} className={!eq.actif ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{eq.nom}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{eq.description || '—'}</TableCell>
                {selectedZoneId === 'all' && <TableCell className="text-sm">{getZoneName(eq.zone_id)}</TableCell>}
                <TableCell className="text-sm">{getSousZoneName(eq.sous_zone_id)}</TableCell>
                <TableCell>{eq.ordre}</TableCell>
                <TableCell><Switch checked={eq.actif} onCheckedChange={() => handleToggleActif(eq)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(eq)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Désactiver cet équipement ?</AlertDialogTitle>
                          <AlertDialogDescription>L'équipement sera désactivé et n'apparaîtra plus dans les nouvelles rondes. L'historique est conservé.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(eq)}>Désactiver</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">{filteredEquipements.filter(e => e.actif).length} équipements actifs</p>
    </div>
  );
}
