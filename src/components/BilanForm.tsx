import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

const BilanForm = ({ onSave, previousEntry, editEntry }: BilanFormProps) => {
  const [formData, setFormData] = useState<BilanFormData>({
    date: new Date().toISOString().split('T')[0],
    spheres_initial: '',
    bouteilles_initial: '',
    reservoirs_initial: '',
    receptions: [],
    sorties_vrac: '',
    sorties_conditionnees: '',
    fuyardes: '',
    spheres_final: '',
    bouteilles_final: '',
    reservoirs_final: '',
    notes: '',
  });

  // Pré-remplir avec les données d'hier ou l'entrée à éditer
  useEffect(() => {
    if (editEntry) {
      // Mode édition : pré-remplir avec toutes les données (déjà en kg)
      setFormData({
        date: editEntry.date,
        spheres_initial: editEntry.spheres_initial.toString(),
        bouteilles_initial: editEntry.bouteilles_initial.toString(),
        reservoirs_initial: editEntry.reservoirs_initial.toString(),
        receptions: editEntry.receptions.map(r => ({
          quantity: r.quantity.toString(),
          provenance: r.provenance
        })),
        sorties_vrac: editEntry.sorties_vrac.toString(),
        sorties_conditionnees: editEntry.sorties_conditionnees.toString(),
        fuyardes: editEntry.fuyardes.toString(),
        spheres_final: editEntry.spheres_final.toString(),
        bouteilles_final: editEntry.bouteilles_final.toString(),
        reservoirs_final: editEntry.reservoirs_final.toString(),
        notes: editEntry.notes || '',
      });
    } else if (previousEntry && !editEntry) {
      // Mode nouveau : pré-remplir uniquement le stock initial avec le stock final d'hier (déjà en kg)
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

  const [calculated, setCalculated] = useState<ReturnType<typeof calculateBilan> | null>(null);

  const handleChange = (field: keyof BilanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setCalculated(null);
  };

  const addReception = () => {
    setFormData(prev => ({
      ...prev,
      receptions: [...prev.receptions, { quantity: '', provenance: '' }]
    }));
    setCalculated(null);
  };

  const removeReception = (index: number) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.filter((_, i) => i !== index)
    }));
    setCalculated(null);
  };

  const updateReception = (index: number, field: 'quantity' | 'provenance', value: string) => {
    setFormData(prev => ({
      ...prev,
      receptions: prev.receptions.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
    setCalculated(null);
  };

  const handleCalculate = () => {
    // Validate form data
    const validation = bilanFormSchema.safeParse(formData);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      if (import.meta.env.DEV) {
        console.error('Validation errors:', validation.error.errors);
      }
      toast.error('Validation échouée', {
        description: `${firstError.path.join('.')} : ${firstError.message}`
      });
      return;
    }

    const result = calculateBilan(formData);
    setCalculated(result);
  };

  const handleSave = () => {
    if (calculated) {
      onSave(calculated, editEntry?.id);
      // Reset form only if not editing
      if (!editEntry) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          spheres_initial: '',
          bouteilles_initial: '',
          reservoirs_initial: '',
          receptions: [],
          sorties_vrac: '',
          sorties_conditionnees: '',
          fuyardes: '',
          spheres_final: '',
          bouteilles_final: '',
          reservoirs_final: '',
          notes: '',
        });
      }
      setCalculated(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editEntry ? 'Modifier le bilan' : 'Saisie du bilan journalier'}</CardTitle>
          <CardDescription>Remplissez tous les champs en kilogrammes (kg)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date du bilan</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(new Date(formData.date), "PPP", { locale: fr })
                  ) : (
                    <span>Sélectionner une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date ? new Date(formData.date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      handleChange('date', date.toISOString().split('T')[0]);
                    }
                  }}
                  initialFocus
                  locale={fr}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Stock Initial */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stock initial (d'hier matin)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spheres_initial">Sphères (kg)</Label>
                <Input
                  id="spheres_initial"
                  type="number"
                  step="0.01"
                  value={formData.spheres_initial}
                  onChange={(e) => handleChange('spheres_initial', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bouteilles_initial">Bouteilles pleines (kg)</Label>
                <Input
                  id="bouteilles_initial"
                  type="number"
                  step="0.01"
                  value={formData.bouteilles_initial}
                  onChange={(e) => handleChange('bouteilles_initial', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservoirs_initial">Réservoirs centre (kg)</Label>
                <Input
                  id="reservoirs_initial"
                  type="number"
                  step="0.01"
                  value={formData.reservoirs_initial}
                  onChange={(e) => handleChange('reservoirs_initial', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Réceptions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Réceptions</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReception}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une réception
              </Button>
            </div>
            {formData.receptions.map((reception, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor={`reception_${index}`}>Réception GPL (kg)</Label>
                  <Input
                    id={`reception_${index}`}
                    type="number"
                    step="0.01"
                    value={reception.quantity}
                    onChange={(e) => updateReception(index, 'quantity', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`provenance_${index}`}>Provenance</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`provenance_${index}`}
                      type="text"
                      value={reception.provenance}
                      onChange={(e) => updateReception(index, 'provenance', e.target.value)}
                      placeholder="Fournisseur ou source"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeReception(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sorties */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sorties</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sorties_vrac">Sorties vrac (kg)</Label>
                <Input
                  id="sorties_vrac"
                  type="number"
                  step="0.01"
                  value={formData.sorties_vrac}
                  onChange={(e) => handleChange('sorties_vrac', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorties_conditionnees">Sorties conditionnées (kg)</Label>
                <Input
                  id="sorties_conditionnees"
                  type="number"
                  step="0.01"
                  value={formData.sorties_conditionnees}
                  onChange={(e) => handleChange('sorties_conditionnees', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuyardes">Fuyardes / Pertes (kg)</Label>
                <Input
                  id="fuyardes"
                  type="number"
                  step="0.01"
                  value={formData.fuyardes}
                  onChange={(e) => handleChange('fuyardes', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Stock Final */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stock final (mesuré ce matin)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spheres_final">Sphères (kg)</Label>
                <Input
                  id="spheres_final"
                  type="number"
                  step="0.01"
                  value={formData.spheres_final}
                  onChange={(e) => handleChange('spheres_final', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bouteilles_final">Bouteilles pleines (kg)</Label>
                <Input
                  id="bouteilles_final"
                  type="number"
                  step="0.01"
                  value={formData.bouteilles_final}
                  onChange={(e) => handleChange('bouteilles_final', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservoirs_final">Réservoirs (kg)</Label>
                <Input
                  id="reservoirs_final"
                  type="number"
                  step="0.01"
                  value={formData.reservoirs_final}
                  onChange={(e) => handleChange('reservoirs_final', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Justification d'écart (facultatif)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Commentaires, explications..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCalculate} className="flex-1">
              <Calculator className="mr-2 h-4 w-4" />
              Calculer le bilan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {calculated && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Résultats du calcul</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stock initial</p>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_initial)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stock théorique</p>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_theorique)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stock final</p>
                <p className="text-2xl font-bold">{formatNumber(calculated.stock_final)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bilan</p>
                  <p className={`text-3xl font-bold ${getNatureColor(calculated.nature)}`}>
                    {formatNumber(calculated.bilan)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Nature</p>
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-lg ${
                    calculated.nature === 'Positif' ? 'bg-success/10 text-success' :
                    calculated.nature === 'Négatif' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {calculated.nature.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              {editEntry ? 'Mettre à jour' : 'Valider et enregistrer'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BilanForm;
