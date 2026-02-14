import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, MapPin, Layers } from 'lucide-react';
import type { InspectionZone, InspectionSousZone, InspectionEquipement } from '@/types/inspection';

interface EquipementEditorProps {
  zones: InspectionZone[];
  sousZones: InspectionSousZone[];
  equipements: InspectionEquipement[];
  onRefresh: () => Promise<void>;
}

export default function EquipementEditor({ zones, sousZones, equipements, onRefresh }: EquipementEditorProps) {
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipement, setEditingEquipement] = useState<InspectionEquipement | null>(null);

  const [formNom, setFormNom] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrdre, setFormOrdre] = useState('0');
  const [formZoneId, setFormZoneId] = useState('');
  const [formSousZoneId, setFormSousZoneId] = useState<string>('none');

  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);

  const toggleZone = (id: string) => {
    setOpenZones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setFormNom('');
    setFormDescription('');
    setFormOrdre('0');
    setFormZoneId('');
    setFormSousZoneId('none');
    setEditingEquipement(null);
  };

  const openAddDialog = (zoneId?: string, sousZoneId?: string) => {
    resetForm();
    if (zoneId) setFormZoneId(zoneId);
    if (sousZoneId) setFormSousZoneId(sousZoneId);
    setDialogOpen(true);
  };

  const openEditDialog = (eq: InspectionEquipement) => {
    setFormNom(eq.nom);
    setFormDescription(eq.description || '');
    setFormOrdre(String(eq.ordre));
    setFormZoneId(eq.zone_id);
    setFormSousZoneId(eq.sous_zone_id || 'none');
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
      sous_zone_id: formSousZoneId === 'none' ? null : formSousZoneId || null,
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

  const totalActifs = equipements.filter(e => e.actif).length;

  const renderEquipementRow = (eq: InspectionEquipement) => (
    <div
      key={eq.id}
      className={`flex items-center justify-between py-2 px-3 rounded-md border ${!eq.actif ? 'opacity-40 bg-slate-50' : 'bg-white'}`}
    >
      <div className="flex-1 min-w-0 mr-3">
        <div className="font-medium text-sm">{eq.nom}</div>
        {eq.description && (
          <div className="text-xs text-muted-foreground truncate">{eq.description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground">#{eq.ordre}</span>
        <Switch checked={eq.actif} onCheckedChange={() => handleToggleActif(eq)} />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(eq)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
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
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Équipements</h3>
          <Badge variant="secondary" className="text-xs">{totalActifs} actifs</Badge>
        </div>
        <Button size="sm" onClick={() => openAddDialog()}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Add/Edit dialog */}
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
              <Select value={formZoneId} onValueChange={(v) => { setFormZoneId(v); setFormSousZoneId('none'); }}>
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
                    <SelectItem value="none">Aucune</SelectItem>
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

      {/* Grouped by zone */}
      <div className="space-y-3">
        {activeZones.map(zone => {
          const isOpen = openZones.has(zone.id);
          const zoneSZ = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);
          const zoneEquips = equipements.filter(e => e.zone_id === zone.id).sort((a, b) => a.ordre - b.ordre);
          const activeCount = zoneEquips.filter(e => e.actif).length;

          return (
            <Collapsible key={zone.id} open={isOpen} onOpenChange={() => toggleZone(zone.id)}>
              <Card>
                <div className="flex items-center justify-between px-4 py-3">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-blue-600 flex-1">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{zone.libelle}</span>
                    <Badge variant="outline" className="text-[10px] ml-1">{activeCount} pts</Badge>
                  </CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); openAddDialog(zone.id); }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </div>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3">
                    {zoneSZ.length > 0 ? (
                      // Zone with sous-zones: group by sous-zone
                      <div className="space-y-4">
                        {zoneSZ.map(sz => {
                          const szEquips = zoneEquips.filter(e => e.sous_zone_id === sz.id).sort((a, b) => a.ordre - b.ordre);
                          return (
                            <div key={sz.id}>
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">{sz.libelle}</span>
                                <Badge variant="secondary" className="text-[10px]">{szEquips.filter(e => e.actif).length}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] ml-auto"
                                  onClick={() => openAddDialog(zone.id, sz.id)}
                                >
                                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Ajouter
                                </Button>
                              </div>
                              <div className="space-y-1.5 ml-5">
                                {szEquips.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">Aucun équipement</p>
                                ) : (
                                  szEquips.map(renderEquipementRow)
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Equipements without sous-zone in this zone */}
                        {(() => {
                          const orphans = zoneEquips.filter(e => !e.sous_zone_id);
                          if (orphans.length === 0) return null;
                          return (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Sans sous-zone</span>
                                <Badge variant="secondary" className="text-[10px]">{orphans.filter(e => e.actif).length}</Badge>
                              </div>
                              <div className="space-y-1.5 ml-5">
                                {orphans.map(renderEquipementRow)}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      // Zone without sous-zones: flat list
                      <div className="space-y-1.5">
                        {zoneEquips.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Aucun équipement</p>
                        ) : (
                          zoneEquips.map(renderEquipementRow)
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
