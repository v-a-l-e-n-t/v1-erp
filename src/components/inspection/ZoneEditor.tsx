import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { InspectionZone, InspectionSousZone } from '@/types/inspection';

interface ZoneEditorProps {
  zones: InspectionZone[];
  sousZones: InspectionSousZone[];
  onRefresh: () => Promise<void>;
}

export default function ZoneEditor({ zones, sousZones, onRefresh }: ZoneEditorProps) {
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addSousZoneOpen, setAddSousZoneOpen] = useState<string | null>(null);
  const [editZone, setEditZone] = useState<InspectionZone | null>(null);

  const [formNom, setFormNom] = useState('');
  const [formLibelle, setFormLibelle] = useState('');
  const [formPoids, setFormPoids] = useState('1.0');
  const [formOrdre, setFormOrdre] = useState('0');

  const [szFormNom, setSzFormNom] = useState('');
  const [szFormLibelle, setSzFormLibelle] = useState('');
  const [szFormOrdre, setSzFormOrdre] = useState('0');

  const toggleZone = (id: string) => {
    setOpenZones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetZoneForm = () => {
    setFormNom('');
    setFormLibelle('');
    setFormPoids('1.0');
    setFormOrdre('0');
  };

  const handleToggleActif = async (zone: InspectionZone) => {
    await supabase.from('inspection_zones').update({ actif: !zone.actif }).eq('id', zone.id);
    toast.success(`Zone ${zone.actif ? 'désactivée' : 'activée'}`);
    await onRefresh();
  };

  const handleAddZone = async () => {
    if (!formNom.trim() || !formLibelle.trim()) {
      toast.error('Nom et libellé requis');
      return;
    }
    const { error } = await supabase.from('inspection_zones').insert({
      nom: formNom.trim().toUpperCase().replace(/\s+/g, '_'),
      libelle: formLibelle.trim(),
      poids_kpi: parseFloat(formPoids) || 1.0,
      ordre: parseInt(formOrdre) || 0,
    });
    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }
    toast.success('Zone ajoutée');
    resetZoneForm();
    setAddZoneOpen(false);
    await onRefresh();
  };

  const handleEditZone = async () => {
    if (!editZone) return;
    const { error } = await supabase.from('inspection_zones').update({
      libelle: formLibelle.trim(),
      poids_kpi: parseFloat(formPoids) || 1.0,
      ordre: parseInt(formOrdre) || 0,
    }).eq('id', editZone.id);
    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }
    toast.success('Zone modifiée');
    setEditZone(null);
    resetZoneForm();
    await onRefresh();
  };

  const openEditDialog = (zone: InspectionZone) => {
    setFormNom(zone.nom);
    setFormLibelle(zone.libelle);
    setFormPoids(String(zone.poids_kpi));
    setFormOrdre(String(zone.ordre));
    setEditZone(zone);
  };

  const handleAddSousZone = async (zoneId: string) => {
    if (!szFormNom.trim() || !szFormLibelle.trim()) {
      toast.error('Nom et libellé requis');
      return;
    }
    const { error } = await supabase.from('inspection_sous_zones').insert({
      zone_id: zoneId,
      nom: szFormNom.trim(),
      libelle: szFormLibelle.trim(),
      ordre: parseInt(szFormOrdre) || 0,
    });
    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }
    toast.success('Sous-zone ajoutée');
    setSzFormNom('');
    setSzFormLibelle('');
    setSzFormOrdre('0');
    setAddSousZoneOpen(null);
    await onRefresh();
  };

  const handleToggleSousZoneActif = async (sz: InspectionSousZone) => {
    await supabase.from('inspection_sous_zones').update({ actif: !sz.actif }).eq('id', sz.id);
    toast.success(`Sous-zone ${sz.actif ? 'désactivée' : 'activée'}`);
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Zones d'inspection</h3>
        <Dialog open={addZoneOpen} onOpenChange={(open) => { setAddZoneOpen(open); if (open) resetZoneForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter une zone</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle zone</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code (ex: UTILITE)</Label><Input value={formNom} onChange={e => setFormNom(e.target.value)} /></div>
              <div><Label>Libellé</Label><Input value={formLibelle} onChange={e => setFormLibelle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Poids KPI</Label><Input type="number" step="0.1" value={formPoids} onChange={e => setFormPoids(e.target.value)} /></div>
                <div><Label>Ordre</Label><Input type="number" value={formOrdre} onChange={e => setFormOrdre(e.target.value)} /></div>
              </div>
              <Button onClick={handleAddZone} className="w-full">Ajouter</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit zone dialog */}
      <Dialog open={!!editZone} onOpenChange={(open) => { if (!open) { setEditZone(null); resetZoneForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la zone</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code</Label><Input value={formNom} disabled /></div>
            <div><Label>Libellé</Label><Input value={formLibelle} onChange={e => setFormLibelle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Poids KPI</Label><Input type="number" step="0.1" value={formPoids} onChange={e => setFormPoids(e.target.value)} /></div>
              <div><Label>Ordre</Label><Input type="number" value={formOrdre} onChange={e => setFormOrdre(e.target.value)} /></div>
            </div>
            <Button onClick={handleEditZone} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {zones.sort((a, b) => a.ordre - b.ordre).map(zone => {
          const zoneSousZones = sousZones.filter(sz => sz.zone_id === zone.id).sort((a, b) => a.ordre - b.ordre);
          const isOpen = openZones.has(zone.id);

          return (
            <Collapsible key={zone.id} open={isOpen} onOpenChange={() => toggleZone(zone.id)}>
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 bg-slate-50">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-blue-600">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{zone.libelle}</span>
                    <span className="text-xs text-muted-foreground">({zone.nom})</span>
                    <span className="text-xs text-muted-foreground">Poids: {zone.poids_kpi}</span>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <Switch checked={zone.actif} onCheckedChange={() => handleToggleActif(zone)} />
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(zone)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-3 border-t">
                    {zoneSousZones.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Sous-zones</div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Libellé</TableHead>
                              <TableHead className="w-20">Ordre</TableHead>
                              <TableHead className="w-20">Actif</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {zoneSousZones.map(sz => (
                              <TableRow key={sz.id}>
                                <TableCell className="font-mono text-sm">{sz.nom}</TableCell>
                                <TableCell>{sz.libelle}</TableCell>
                                <TableCell>{sz.ordre}</TableCell>
                                <TableCell>
                                  <Switch checked={sz.actif} onCheckedChange={() => handleToggleSousZoneActif(sz)} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune sous-zone</p>
                    )}

                    <Dialog open={addSousZoneOpen === zone.id} onOpenChange={(open) => setAddSousZoneOpen(open ? zone.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="h-3 w-3 mr-1" /> Sous-zone
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Nouvelle sous-zone pour {zone.libelle}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div><Label>Code (ex: S4)</Label><Input value={szFormNom} onChange={e => setSzFormNom(e.target.value)} /></div>
                          <div><Label>Libellé (ex: Sphère S4)</Label><Input value={szFormLibelle} onChange={e => setSzFormLibelle(e.target.value)} /></div>
                          <div><Label>Ordre</Label><Input type="number" value={szFormOrdre} onChange={e => setSzFormOrdre(e.target.value)} /></div>
                          <Button onClick={() => handleAddSousZone(zone.id)} className="w-full">Ajouter</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
