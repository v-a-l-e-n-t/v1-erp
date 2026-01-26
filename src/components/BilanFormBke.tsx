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
import { BilanBkeFormData, BilanBkeEntry, BKE_RECEPTION_CLIENTS } from '@/types/balance-bke';
import { calculateBilanBke, formatNumber, getNatureColor } from '@/utils/calculations-bke';
import { bilanBkeFormSchema } from '@/utils/validation-bke';
import { loadBkeEntryByDate } from '@/utils/storage-bke';
import { Calculator, Save, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BilanFormBkeProps {
  onSave: (data: ReturnType<typeof calculateBilanBke>, entryId?: string) => void;
  previousEntry?: BilanBkeEntry;
  editEntry?: BilanBkeEntry;
}

const BilanFormBke = ({ onSave, previousEntry, editEntry }: BilanFormBkeProps) => {
  const [formData, setFormData] = useState<BilanBkeFormData>({
    date: new Date().toISOString().split('T')[0],
    bac_stockage_initial: '',
    bouteilles_initial: '',
    receptions: [],
    sorties_conditionnees_petro_ivoire: '',
    sorties_conditionnees_vivo_energies: '',
    sorties_conditionnees_total_energies: '',
    fuyardes_petro_ivoire: '',
    fuyardes_vivo_energies: '',
    fuyardes_total_energies: '',
    bac_stockage_final: '',
    bouteilles_final: '',
    notes: '',
  });

  const [calculated, setCalculated] = useState<ReturnType<typeof calculateBilanBke> | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Pré-remplir avec les données d'hier ou l'entrée à éditer
  useEffect(() => {
    if (editEntry) {
      // Mode édition : pré-remplir avec toutes les données
      setFormData({
        date: editEntry.date,
        bac_stockage_initial: editEntry.bac_stockage_initial.toString(),
        bouteilles_initial: editEntry.bouteilles_initial.toString(),
        receptions: (editEntry.receptions && Array.isArray(editEntry.receptions))
          ? editEntry.receptions.map(r => ({
            quantity: r.quantity.toString(),
            client: r.client || '',
            reception_no: r.reception_no || ''
          }))
          : [],
        sorties_conditionnees_petro_ivoire: editEntry.sorties_conditionnees_petro_ivoire.toString(),
        sorties_conditionnees_vivo_energies: editEntry.sorties_conditionnees_vivo_energies.toString(),
        sorties_conditionnees_total_energies: editEntry.sorties_conditionnees_total_energies.toString(),
        fuyardes_petro_ivoire: editEntry.fuyardes_petro_ivoire.toString(),
        fuyardes_vivo_energies: editEntry.fuyardes_vivo_energies.toString(),
        fuyardes_total_energies: editEntry.fuyardes_total_energies.toString(),
        bac_stockage_final: editEntry.bac_stockage_final.toString(),
        bouteilles_final: editEntry.bouteilles_final.toString(),
        notes: editEntry.notes || '',
      });
      setDate(new Date(editEntry.date));
    } else if (previousEntry && !editEntry) {
      // Mode nouveau : pré-remplir uniquement le stock initial
      setFormData(prev => ({
        ...prev,
        bac_stockage_initial: previousEntry.bac_stockage_final.toString(),
        bouteilles_initial: previousEntry.bouteilles_final.toString(),
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

        const previousDayEntry = await loadBkeEntryByDate(previousDayStr);

        if (previousDayEntry) {
          setFormData(prev => ({
            ...prev,
            bac_stockage_initial: previousDayEntry.bac_stockage_final.toString(),
            bouteilles_initial: previousDayEntry.bouteilles_final.toString(),
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            bac_stockage_initial: '',
            bouteilles_initial: '',
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
      receptions: [...prev.receptions, { quantity: '', client: '', reception_no: '' }]
    }));
  };

  const removeReception = (index: number) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.filter((_, i) => i !== index)
    }));
  };

  const updateReception = (index: number, field: 'quantity' | 'client' | 'reception_no', value: string) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  const handleCalculate = () => {
    try {
      const result = bilanBkeFormSchema.safeParse(formData);

      if (!result.success) {
        const errors = result.error.errors.map(err =>
          `${err.path.join(' → ')}: ${err.message}`
        ).join('\n');

        toast.error('Erreur de validation', {
          description: errors,
        });
        return;
      }

      const calculatedData = calculateBilanBke(formData);
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

      {/* Stock Initial Card - Bac stockage au lieu de Sphères, pas de Réservoirs */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Initial</CardTitle>
          <CardDescription>Quantités en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bac_stockage_initial">Bac stockage (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="bac_stockage_initial"
              name="bac_stockage_initial"
              value={formData.bac_stockage_initial}
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
        </CardContent>
      </Card>

      {/* Réceptions Card - Client dropdown au lieu de Navire */}
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
                  <Label>Client</Label>
                  <Select
                    value={reception.client}
                    onValueChange={(value) => updateReception(index, 'client', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BKE_RECEPTION_CLIENTS.map((client) => (
                        <SelectItem key={client} value={client}>
                          {client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* Sorties Card - PAS de Sorties Vrac */}
      <Card>
        <CardHeader>
          <CardTitle>Sorties</CardTitle>
          <CardDescription>Quantités détaillées par client en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

      {/* Stock Final Card - Bac stockage au lieu de Sphères, pas de Réservoirs */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Final</CardTitle>
          <CardDescription>Quantités en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bac_stockage_final">Bac stockage (kg)</Label>
            <Input
              type="number"
              step="0.001"
              id="bac_stockage_final"
              name="bac_stockage_final"
              value={formData.bac_stockage_final}
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

      {/* Résultats - PAS de Total sorties vrac */}
      {calculated && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Résultats du Calcul</CardTitle>
            <CardDescription>Bilan matière GPL - Site de Bouaké</CardDescription>
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

export default BilanFormBke;
