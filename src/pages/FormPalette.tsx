import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { PaletteClientKey, PALETTE_CLIENT_FULL_LABELS } from '@/types/palette';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Save, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mandataire {
  id: string;
  nom: string;
}

const CLIENTS: PaletteClientKey[] = ['PETRO_IVOIRE', 'TOTAL_ENERGIES', 'VIVO_ENERGY'];

const FormPalette = () => {
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [client, setClient] = useState<PaletteClientKey | ''>('');
  const [mandataireId, setMandataireId] = useState('');
  const [mandataires, setMandataires] = useState<Mandataire[]>([]);
  const [mandataireOpen, setMandataireOpen] = useState(false);
  const [mandataireSearch, setMandataireSearch] = useState('');
  const [capacite, setCapacite] = useState<number>(0);
  const [numCamion, setNumCamion] = useState('');

  // Bouteilles
  const [b6, setB6] = useState<number>(0);
  const [b12, setB12] = useState<number>(0);
  const [b28, setB28] = useState<number>(0);
  const [b38, setB38] = useState<number>(0);

  // Palettes
  const [paletteB6Normale, setPaletteB6Normale] = useState<number>(0);
  const [paletteB6Courte, setPaletteB6Courte] = useState<number>(0);
  const [paletteB12Ordinaire, setPaletteB12Ordinaire] = useState<number>(0);
  const [paletteB12Superpo, setPaletteB12Superpo] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadMandataires = async () => {
      try {
        const { data, error } = await supabase
          .from('mandataires')
          .select('*')
          .order('nom');
        if (error) throw error;
        setMandataires(data || []);
      } catch (error) {
        console.error('Error loading mandataires:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les mandataires',
          variant: 'destructive',
        });
      }
    };
    loadMandataires();
  }, [toast]);

  const filteredMandataires = useMemo(() => {
    if (!mandataireSearch) return mandataires;
    const q = mandataireSearch.toLowerCase();
    return mandataires.filter(m => m.nom.toLowerCase().includes(q));
  }, [mandataires, mandataireSearch]);

  const selectedMandataireName = mandataires.find(m => m.id === mandataireId)?.nom ?? '';

  const parseQty = (value: string) => {
    const parsed = parseInt(value.replace(/\D/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const resetForm = () => {
    setDate(undefined);
    setClient('');
    setMandataireId('');
    setCapacite(0);
    setNumCamion('');
    setB6(0);
    setB12(0);
    setB28(0);
    setB38(0);
    setPaletteB6Normale(0);
    setPaletteB6Courte(0);
    setPaletteB12Ordinaire(0);
    setPaletteB12Superpo(0);
  };

  const handleSubmit = async () => {
    if (!date) {
      toast({ title: 'Date manquante', description: 'Veuillez sélectionner une date.', variant: 'destructive' });
      return;
    }
    if (!client) {
      toast({ title: 'Client manquant', description: 'Veuillez sélectionner un client.', variant: 'destructive' });
      return;
    }
    if (!mandataireId) {
      toast({ title: 'Mandataire manquant', description: 'Veuillez sélectionner un mandataire.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase.from('palette_entries' as any).insert({
        date: format(date, 'yyyy-MM-dd'),
        client,
        mandataire_id: mandataireId,
        capacite,
        num_camion: numCamion.trim(),
        b6,
        b12,
        b28,
        b38,
        palette_b6_normale: paletteB6Normale,
        palette_b6_courte: paletteB6Courte,
        palette_b12_ordinaire: paletteB12Ordinaire,
        palette_b12_superpo: paletteB12Superpo,
      }) as any);

      if (error) throw error;

      sonnerToast.success('Enregistrement réussi', { description: 'Les données PALETTE ont été enregistrées avec succès.' });
      resetForm();
    } catch (error: any) {
      console.error('Error saving palette entry:', error);
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'enregistrer les données PALETTE",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Saisie PALETTE</h1>
          <p className="text-sm text-muted-foreground">
            Déclarer les bouteilles et palettes par chargement.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={client} onValueChange={v => setClient(v as PaletteClientKey)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTS.map(c => (
                    <SelectItem key={c} value={c}>
                      {PALETTE_CLIENT_FULL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mandataire/Transporteur */}
            <div className="space-y-2">
              <Label>Mandataire / Transporteur</Label>
              <Popover open={mandataireOpen} onOpenChange={setMandataireOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={mandataireOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedMandataireName || 'Sélectionner un mandataire'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Rechercher..."
                      value={mandataireSearch}
                      onValueChange={setMandataireSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun mandataire trouvé.</CommandEmpty>
                      <CommandGroup>
                        {filteredMandataires.map(m => (
                          <CommandItem
                            key={m.id}
                            value={m.id}
                            onSelect={() => {
                              setMandataireId(m.id);
                              setMandataireSearch('');
                              setMandataireOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', mandataireId === m.id ? 'opacity-100' : 'opacity-0')} />
                            {m.nom}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Capacité */}
            <div className="space-y-2">
              <Label>Capacité (Kg)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={capacite || ''}
                  onChange={e => setCapacite(parseQty(e.target.value))}
                  className="text-right"
                  placeholder="0"
                />
                <span className="text-sm font-semibold text-muted-foreground shrink-0">Kg</span>
              </div>
            </div>

            {/* N° Camion */}
            <div className="space-y-2">
              <Label>N° Camion</Label>
              <Input
                value={numCamion}
                onChange={e => setNumCamion(e.target.value)}
                placeholder="Ex: AB-1234-CI"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bouteilles */}
        <Card>
          <CardHeader>
            <CardTitle>Bouteilles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'B6', value: b6, setter: setB6 },
                { label: 'B12', value: b12, setter: setB12 },
                { label: 'B28', value: b28, setter: setB28 },
                { label: 'B38', value: b38, setter: setB38 },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={value || ''}
                    onChange={e => setter(parseQty(e.target.value))}
                    className="text-right"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Palettes */}
        <Card>
          <CardHeader>
            <CardTitle>Palettes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'B6 Normale', value: paletteB6Normale, setter: setPaletteB6Normale },
                { label: 'B6 Courte', value: paletteB6Courte, setter: setPaletteB6Courte },
                { label: 'B12 Ordinaire', value: paletteB12Ordinaire, setter: setPaletteB12Ordinaire },
                { label: 'B12 Superpo', value: paletteB12Superpo, setter: setPaletteB12Superpo },
              ].map(({ label, value, setter }) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={value || ''}
                    onChange={e => setter(parseQty(e.target.value))}
                    className="text-right"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default FormPalette;
