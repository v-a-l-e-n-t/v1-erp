import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShiftType, Agent } from '@/types/production';
import {
  AtelierCategory,
  AtelierClientKey,
  AtelierData,
  AtelierFormat,
  ATELIER_CATEGORY_LABELS,
  ATELIER_CLIENT_LABELS,
} from '@/types/atelier';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Save } from 'lucide-react';

const CLIENTS: AtelierClientKey[] = ['SIMAM', 'PETRO_IVOIRE', 'VIVO_ENERGY', 'TOTAL_ENERGIES'];
const CATEGORIES: AtelierCategory[] = [
  'bouteilles_vidangees',
  'bouteilles_reeprouvees',
  'bouteilles_hs',
  'clapet_monte',
];
const FORMATS: AtelierFormat[] = ['B6', 'B12', 'B28', 'B38'];

const createEmptyAtelierData = (): AtelierData => {
  const baseQuantities = (): Record<AtelierFormat, number> => ({
    B6: 0,
    B12: 0,
    B28: 0,
    B38: 0,
  });

  const baseClientData = () =>
    CATEGORIES.reduce((acc, category) => {
      acc[category] = baseQuantities();
      return acc;
    }, {} as any);

  return {
    SIMAM: baseClientData(),
    PETRO_IVOIRE: baseClientData(),
    VIVO_ENERGY: baseClientData(),
    TOTAL_ENERGIES: baseClientData(),
  };
};

const SHIFT_OPTIONS: ShiftType[] = ['10h-19h', '20h-5h'];

const FormAtelier = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [shiftType, setShiftType] = useState<ShiftType>('10h-19h');
  const [chefQuartId, setChefQuartId] = useState<string>('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [data, setData] = useState<AtelierData>(() => createEmptyAtelierData());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Charger depuis la table agents (chefs de quart et chefs de ligne)
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .in('role', ['chef_quart', 'chef_ligne'])
          .eq('actif', true)
          .order('nom');

        if (error) throw error;

        const agentsList = (data || []).map(agent => ({
          id: agent.id,
          nom: agent.nom,
          prenom: agent.prenom,
          role: agent.role as 'chef_quart' | 'chef_ligne',
        }));

        setAgents(agentsList);
      } catch (error) {
        console.error('Error loading agents:', error);
        toast({
          title: 'Erreur',
          description: "Impossible de charger les chefs de quart et chefs de ligne",
          variant: 'destructive',
        });
      }
    };

    loadAgents();
  }, [toast]);

  const handleQuantityChange = (
    client: AtelierClientKey,
    category: AtelierCategory,
    formatKey: AtelierFormat,
    value: string
  ) => {
    const parsed = value === '' ? 0 : parseInt(value.replace(/\D/g, ''), 10) || 0;

    setData(prev => ({
      ...prev,
      [client]: {
        ...prev[client],
        [category]: {
          ...prev[client][category],
          [formatKey]: parsed,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    if (!date) {
      toast({
        title: 'Date manquante',
        description: 'Veuillez sélectionner une date.',
        variant: 'destructive',
      });
      return;
    }
    if (!chefQuartId) {
      toast({
        title: 'Chef de quart manquant',
        description: 'Veuillez sélectionner un chef de quart.',
        variant: 'destructive',
      });
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      setSubmitting(true);

      // Vérifier l'unicité (date + shift)
      const { data: existing, error: checkError } = await (supabase
        .from('atelier_entries' as any)
        .select('id')
        .eq('date', dateStr)
        .eq('shift_type', shiftType)
        .maybeSingle() as any);

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        toast({
          title: 'Doublon détecté',
          description: 'Un enregistrement existe déjà pour cette date et ce shift.',
          variant: 'destructive',
        });
        return;
      }

      const userId = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : undefined;

      const { error: insertError } = await (supabase.from('atelier_entries' as any).insert({
        date: dateStr,
        shift_type: shiftType,
        chef_quart_id: chefQuartId,
        data,
        user_id: userId,
      }) as any);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Enregistrement réussi',
        description: 'Les données ATELIER ont été enregistrées avec succès.',
      });

      // Reset complet après validation (date, shift, chef, quantités)
      setDate(undefined);
      setShiftType('10h-19h');
      setChefQuartId('');
      setData(createEmptyAtelierData());
    } catch (error: any) {
      console.error('Error saving atelier entry:', error);
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'enregistrer les données ATELIER",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Saisie ATELIER</h1>
            <p className="text-sm text-muted-foreground">
              Déclarer les bouteilles traitées par client, catégorie et format.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shiftType} onValueChange={v => setShiftType(v as ShiftType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un shift" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chef de quart</Label>
              <Select value={chefQuartId} onValueChange={setChefQuartId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un chef de quart" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.nom} {agent.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 pt-6">
            {CLIENTS.map(client => (
              <div key={client} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h2 className="text-lg font-semibold">{ATELIER_CLIENT_LABELS[client]}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1 text-left">Catégorie</th>
                        {FORMATS.map(formatKey => (
                          <th key={formatKey} className="border px-2 py-1 text-center">
                            {formatKey}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map(category => (
                        <tr key={category}>
                          <td className="border px-2 py-1 font-medium">
                            {ATELIER_CATEGORY_LABELS[category]}
                          </td>
                          {FORMATS.map(formatKey => (
                            <td key={formatKey} className="border px-1 py-1">
                              <Input
                                type="number"
                                min={0}
                                value={data[client][category][formatKey] || ''}
                                onChange={e =>
                                  handleQuantityChange(client, category, formatKey, e.target.value)
                                }
                                className="h-8 text-xs text-right"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Enregistrement...' : 'Valider et enregistrer'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default FormAtelier;


