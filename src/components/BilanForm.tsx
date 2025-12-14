import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BilanFormData, BilanEntry } from '@/types/balance';
import { calculateBilan, formatNumber, getNatureColor } from '@/utils/calculations';
import { bilanFormSchema } from '@/utils/validation';
import { loadEntryByDate } from '@/utils/storage';
import { Calculator, Save, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BilanFormProps {
  onSave: (data: ReturnType<typeof calculateBilan>, entryId?: string) => void;
  previousEntry?: BilanEntry;
  editEntry?: BilanEntry;
}

const AGENTS_LIST = [
  "SANLE VALENT",
  "BABA JACQUES",
  "DOUATI BI",
  "BOUKIAN LUC",
  "OUPO ARMAND",
  "KOBI JAURES"
];

const BilanForm = ({ onSave, previousEntry, editEntry }: BilanFormProps) => {
  const [formData, setFormData] = useState<BilanFormData>({
    date: new Date().toISOString().split('T')[0],
    spheres_initial: '',
    bouteilles_initial: '',
    reservoirs_initial: '',
    receptions: [],
    sorties_vrac_simam: '',
    sorties_vrac_petro_ivoire: '',
    sorties_vrac_vivo_energies: '',
    sorties_vrac_total_energies: '',
    agent_exploitation_matin: '',
    agent_exploitation_soir: '',
    agent_mouvement_matin: '',
    agent_mouvement_soir: '',
    sorties_conditionnees_petro_ivoire: '',
    sorties_conditionnees_vivo_energies: '',
    sorties_conditionnees_total_energies: '',
    fuyardes_petro_ivoire: '',
    fuyardes_vivo_energies: '',
    fuyardes_total_energies: '',
    spheres_final: '',
    bouteilles_final: '',
    reservoirs_final: '',
    notes: '',
  });

  const [calculated, setCalculated] = useState<ReturnType<typeof calculateBilan> | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Pré-remplir avec les données d'hier ou l'entrée à éditer
  useEffect(() => {
    if (editEntry) {
      // Mode édition : pré-remplir avec toutes les données
      setFormData({
        date: editEntry.date,
        spheres_initial: editEntry.spheres_initial.toString(),
        bouteilles_initial: editEntry.bouteilles_initial.toString(),
        reservoirs_initial: editEntry.reservoirs_initial.toString(),
        receptions: (editEntry.receptions && Array.isArray(editEntry.receptions))
          ? editEntry.receptions.map(r => ({
            quantity: r.quantity.toString(),
            navire: r.navire || '',
            reception_no: r.reception_no || ''
          }))
          : [],
        sorties_vrac_simam: editEntry.sorties_vrac_simam.toString(),
        sorties_vrac_petro_ivoire: editEntry.sorties_vrac_petro_ivoire.toString(),
        sorties_vrac_vivo_energies: editEntry.sorties_vrac_vivo_energies.toString(),
        sorties_vrac_total_energies: editEntry.sorties_vrac_total_energies.toString(),
        agent_exploitation_matin: editEntry.agent_exploitation_matin || '',
        agent_exploitation_soir: editEntry.agent_exploitation_soir || '',
        agent_mouvement_matin: editEntry.agent_mouvement_matin || '',
        agent_mouvement_soir: editEntry.agent_mouvement_soir || '',
        sorties_conditionnees_petro_ivoire: editEntry.sorties_conditionnees_petro_ivoire.toString(),
        sorties_conditionnees_vivo_energies: editEntry.sorties_conditionnees_vivo_energies.toString(),
        sorties_conditionnees_total_energies: editEntry.sorties_conditionnees_total_energies.toString(),
        fuyardes_petro_ivoire: editEntry.fuyardes_petro_ivoire.toString(),
        fuyardes_vivo_energies: editEntry.fuyardes_vivo_energies.toString(),
        fuyardes_total_energies: editEntry.fuyardes_total_energies.toString(),
        spheres_final: editEntry.spheres_final.toString(),
        bouteilles_final: editEntry.bouteilles_final.toString(),
        reservoirs_final: editEntry.reservoirs_final.toString(),
        notes: editEntry.notes || '',
      });
      setDate(new Date(editEntry.date));
    } else if (previousEntry && !editEntry) {
      // Mode nouveau : pré-remplir uniquement le stock initial
      setFormData(prev => ({
        ...prev,
        spheres_initial: previousEntry.spheres_final.toString(),
        bouteilles_initial: previousEntry.bouteilles_final.toString(),
        reservoirs_initial: previousEntry.reservoirs_final.toString(),
      }));
    }
  }, [previousEntry, editEntry]);

  // Charger les données du jour précédent quand la date change
  useEffect(() => {
    if (!editEntry && formData.date) {
      const loadPreviousDayData = async () => {
        const selectedDate = new Date(formData.date);
        const previousDay = new Date(selectedDate);
        previousDay.setDate(previousDay.getDate() - 1);
        const previousDayStr = previousDay.toISOString().split('T')[0];

        const previousDayEntry = await loadEntryByDate(previousDayStr);

        if (previousDayEntry) {
          setFormData(prev => ({
            ...prev,
            spheres_initial: previousDayEntry.spheres_final.toString(),
            bouteilles_initial: previousDayEntry.bouteilles_final.toString(),
            reservoirs_initial: previousDayEntry.reservoirs_final.toString(),
          }));
        } else {
          // Si aucun bilan du jour précédent n'existe, vider les champs
          setFormData(prev => ({
            ...prev,
            spheres_initial: '',
            bouteilles_initial: '',
            reservoirs_initial: '',
          }));
        }
      };

      loadPreviousDayData();
    }
  }, [formData.date, editEntry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: dateStr }));
    }
  };

  const addReception = () => {
    setFormData(prev => ({
      ...prev,
      receptions: [...prev.receptions, { quantity: '', navire: '', reception_no: '' }]
    }));
  };

  const removeReception = (index: number) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.filter((_, i) => i !== index)
    }));
  };

  const updateReception = (index: number, field: 'quantity' | 'navire' | 'reception_no', value: string) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  const handleCalculate = () => {
    try {
      const result = bilanFormSchema.safeParse(formData);

      if (!result.success) {
        const errors = result.error.errors.map(err =>
          `${err.path.join(' → ')}: ${err.message}`
        ).join('\n');

        toast.error('Erreur de validation', {
          description: errors,
        });
        return;
      }

      const calculatedData = calculateBilan(formData);
      setCalculated(calculatedData);

      toast.success('Calcul effectué avec succès');
    } catch (error) {
      toast.error('Erreur lors du calcul', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    }
  };

  const handleSave = () => {
    if (!calculated) {
      toast.error('Veuillez d\'abord calculer le bilan');
      return;
    }

    if (editEntry) {
      onSave(calculated, editEntry.id);
    } else {
      onSave(calculated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Card */}
      <Card>
        <CardHeader>
          <CardTitle>Date</CardTitle>
          <CardDescription>Sélectionnez la date du bilan</CardDescription>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP', { locale: fr }) : <span>Sélectionner une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Stock Initial Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Initial</CardTitle>
          <CardDescription>Quantités en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="spheres_initial">Sphères (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="spheres_initial"
              name="spheres_initial"
              value={formData.spheres_initial}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bouteilles_initial">Bouteilles (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="bouteilles_initial"
              name="bouteilles_initial"
              value={formData.bouteilles_initial}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservoirs_initial">Réservoirs (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="reservoirs_initial"
              name="reservoirs_initial"
              value={formData.reservoirs_initial}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Réceptions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Réceptions GPL</CardTitle>
              <CardDescription>Quantités en kilogrammes (kg)</CardDescription>
            </div>
            <Button onClick={addReception} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.receptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune réception ajoutée
            </p>
          ) : (
            formData.receptions.map((reception, index) => (
              <div key={index} className="flex gap-4 items-end flex-wrap">
                <div className="w-32 space-y-2">
                  <Label>Quantité (kg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={reception.quantity}
                    onChange={(e) => updateReception(index, 'quantity', e.target.value)}
                    placeholder="0.000"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>N° Réception</Label>
                  <Input
                    type="text"
                    value={reception.reception_no}
                    onChange={(e) => updateReception(index, 'reception_no', e.target.value)}
                    placeholder="Ex: RECEPTION 54"
                  />
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label>Navire</Label>
                  <Input
                    type="text"
                    value={reception.navire}
                    onChange={(e) => updateReception(index, 'navire', e.target.value)}
                    placeholder="Ex: Pompage N°02_PETROCI"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeReception(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sorties Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sorties</CardTitle>
          <CardDescription>Quantités détaillées par client en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sorties Vrac */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Sorties Vrac</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="sorties_vrac_simam">SIMAM (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_vrac_simam"
                  name="sorties_vrac_simam"
                  value={formData.sorties_vrac_simam}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_vrac_petro_ivoire">PETRO IVOIRE (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_vrac_petro_ivoire"
                  name="sorties_vrac_petro_ivoire"
                  value={formData.sorties_vrac_petro_ivoire}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_vrac_vivo_energies">VIVO ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_vrac_vivo_energies"
                  name="sorties_vrac_vivo_energies"
                  value={formData.sorties_vrac_vivo_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_vrac_total_energies">TOTAL ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_vrac_total_energies"
                  name="sorties_vrac_total_energies"
                  value={formData.sorties_vrac_total_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4 items-start">
              {/* EXPLOITATION */}
              <div className="space-y-3 bg-muted/20 p-3 rounded-md border">
                <h4 className="text-sm font-semibold text-blue-700 bg-blue-100/50 w-fit px-3 py-1.5 rounded-lg flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Agent Exploitation
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Matin (7h - 16h)</Label>
                    <Select
                      value={formData.agent_exploitation_matin}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, agent_exploitation_matin: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENTS_LIST.map((agent) => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Soir (16h - Aube)</Label>
                    <Select
                      value={formData.agent_exploitation_soir}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, agent_exploitation_soir: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENTS_LIST.map((agent) => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* MOUVEMENT */}
              <div className="space-y-3 bg-muted/20 p-3 rounded-md border">
                <h4 className="text-sm font-semibold text-orange-700 bg-orange-100/50 w-fit px-3 py-1.5 rounded-lg flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  Agent Mouvement
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quart (11h - 21h)</Label>
                    <Select
                      value={formData.agent_mouvement_matin}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, agent_mouvement_matin: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENTS_LIST.map((agent) => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quart (21h - Aube)</Label>
                    <Select
                      value={formData.agent_mouvement_soir}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, agent_mouvement_soir: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENTS_LIST.map((agent) => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sorties Conditionnées */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Sorties Conditionnées</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sorties_conditionnees_petro_ivoire">PETRO IVOIRE (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_conditionnees_petro_ivoire"
                  name="sorties_conditionnees_petro_ivoire"
                  value={formData.sorties_conditionnees_petro_ivoire}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_conditionnees_vivo_energies">VIVO ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_conditionnees_vivo_energies"
                  name="sorties_conditionnees_vivo_energies"
                  value={formData.sorties_conditionnees_vivo_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_conditionnees_total_energies">TOTAL ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="sorties_conditionnees_total_energies"
                  name="sorties_conditionnees_total_energies"
                  value={formData.sorties_conditionnees_total_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Retour marché */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Retour marché</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fuyardes_petro_ivoire">PETRO IVOIRE (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="fuyardes_petro_ivoire"
                  name="fuyardes_petro_ivoire"
                  value={formData.fuyardes_petro_ivoire}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuyardes_vivo_energies">VIVO ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="fuyardes_vivo_energies"
                  name="fuyardes_vivo_energies"
                  value={formData.fuyardes_vivo_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuyardes_total_energies">TOTAL ENERGIES (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  id="fuyardes_total_energies"
                  name="fuyardes_total_energies"
                  value={formData.fuyardes_total_energies}
                  onChange={handleChange}
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Final Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Final</CardTitle>
          <CardDescription>Quantités en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="spheres_final">Sphères (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="spheres_final"
              name="spheres_final"
              value={formData.spheres_final}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bouteilles_final">Bouteilles (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="bouteilles_final"
              name="bouteilles_final"
              value={formData.bouteilles_final}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservoirs_final">Réservoirs (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="reservoirs_final"
              name="reservoirs_final"
              value={formData.reservoirs_final}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Informations complémentaires</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ajouter des notes..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Résultats */}
      {calculated && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Résultats du Calcul</CardTitle>
            <CardDescription>Bilan matière GPL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Stock Initial</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_initial)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Total Réception GPL</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.reception_gpl)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Total Sorties Vrac</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.sorties_vrac)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Total Sorties Conditionnées</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.sorties_conditionnees)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Total Retour marché</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.fuyardes)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cumul Sorties</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.cumul_sorties)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Stock Théorique</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_theorique)} Kg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Stock Final</Label>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_final)} Kg</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground">Bilan</Label>
              <div className="flex items-center gap-4">
                <p className={cn("text-3xl font-bold", getNatureColor(calculated.nature))}>
                  {formatNumber(calculated.bilan)} Kg
                </p>
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium",
                  calculated.nature === 'Positif' ? 'bg-success/10 text-success' :
                    calculated.nature === 'Négatif' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                )}>
                  {calculated.nature}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={handleCalculate} className="flex-1" size="lg">
          <Calculator className="mr-2 h-5 w-5" />
          Calculer le Bilan
        </Button>
        {calculated && (
          <Button onClick={handleSave} variant="default" className="flex-1" size="lg">
            <Save className="mr-2 h-5 w-5" />
            Enregistrer
          </Button>
        )}
      </div>
    </div>
  );
};

export default BilanForm;