import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BON_CLIENT_LABELS, BON_CLIENTS, type BonClient } from '@/types/bons';
import { generateRange, toIsoDate } from '@/utils/bonsTransfert';
import { DatePickerField } from './DatePickerField';

interface PlageSaisieCardProps {
  onSaved?: () => void;
}

export function PlageSaisieCard({ onSaved }: PlageSaisieCardProps) {
  const [client, setClient] = useState<BonClient>('SIMAM');
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [dateReception, setDateReception] = useState(toIsoDate(new Date()));
  const [dateEdition, setDateEdition] = useState(toIsoDate(new Date()));
  // si l'utilisateur n'a jamais modifié dateEdition manuellement, on la garde
  // synchronisée avec dateReception.
  const [editionTouched, setEditionTouched] = useState(false);
  const [quantite, setQuantite] = useState('30000');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!debut.trim() || !fin.trim()) {
      toast.error('Renseigne les numéros de début et de fin.');
      return;
    }
    let range: string[];
    try {
      range = generateRange(debut, fin);
    } catch (e: any) {
      toast.error(e?.message ?? 'Plage invalide.');
      return;
    }
    if (range.length > 1000) {
      toast.error(`Plage trop large (${range.length} bons). Maximum 1000.`);
      return;
    }
    if (!dateReception) {
      toast.error('Date de réception requise.');
      return;
    }

    setSaving(true);
    try {
      // Un même batch_id pour traquer le lot
      const batch_id = crypto.randomUUID();
      const qty = quantite.trim() ? Number(quantite) : null;
      const rows = range.map((numero_bon) => ({
        client,
        numero_bon,
        statut: 'disponible' as const,
        date_reception: dateReception,
        date_edition: dateEdition || dateReception,
        quantite_bon: qty,
        batch_id,
      }));

      // INSERT avec gestion des doublons : on ignore les bons déjà présents
      const { error, data } = await (supabase as any)
        .from('bons_transfert')
        .upsert(rows, { onConflict: 'client,numero_bon', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error(error);
        toast.error("Échec de l'enregistrement de la plage.");
        return;
      }

      const inserted = data?.length ?? 0;
      const skipped = range.length - inserted;
      toast.success(
        `${inserted} bons ${client} enregistrés (${range[0]} → ${range[range.length - 1]})` +
          (skipped > 0 ? ` — ${skipped} déjà existants ignorés.` : '.'),
      );
      setDebut('');
      setFin('');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          Saisir une plage de bons reçus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
          <div className="space-y-1">
            <Label>Client</Label>
            <Select value={client} onValueChange={(v) => setClient(v as BonClient)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BON_CLIENTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {BON_CLIENT_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>N° début</Label>
            <Input
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
              placeholder="0007493"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label>N° fin</Label>
            <Input
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              placeholder="0007550"
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label>Date de réception</Label>
            <DatePickerField
              value={dateReception}
              onChange={(v) => {
                setDateReception(v);
                if (!editionTouched) setDateEdition(v);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Date sur bon</Label>
            <DatePickerField
              value={dateEdition}
              onChange={(v) => {
                setDateEdition(v);
                setEditionTouched(true);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label>Quantité sur bon (kg)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="30000"
              className="font-mono"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
