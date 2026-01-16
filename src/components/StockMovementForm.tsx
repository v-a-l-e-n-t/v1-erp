import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StockMovement,
  StockMovementFormData,
  StockCategory,
  StockSite,
  BottleType,
  MovementType,
  StockClient,
  STOCK_CATEGORY_LABELS,
  STOCK_SITE_LABELS,
  MOVEMENT_TYPE_LABELS,
  BOTTLE_TYPE_LABELS,
  STOCK_CLIENT_LABELS
} from '@/types/stock';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Save, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { calculateTheoreticalStock, calculateStockState } from '@/utils/stockCalculations';
import { loadStockMovements } from '@/utils/stockStorage';

interface StockMovementFormProps {
  onSave: (data: StockMovement) => Promise<void>;
  editMovement?: StockMovement;
  onCancel?: () => void;
}

const StockMovementForm = ({ onSave, editMovement, onCancel }: StockMovementFormProps) => {
  const [formData, setFormData] = useState<StockMovementFormData>({
    date: new Date().toISOString().split('T')[0],
    category: 'bouteilles_neuves',
    site: 'depot_vrac',
    movement_type: 'entree',
    bottle_type: 'B6',
    quantity: '',
    client: undefined,
    motif: '',
    provenance: '',
    destination: '',
    justification_ecart: '',
    stock_theorique: '',
    stock_reel: ''
  });

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [stockTheorique, setStockTheorique] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);

  // Charger les mouvements existants pour calculer le stock théorique
  useEffect(() => {
    const loadMovements = async () => {
      const movements = await loadStockMovements();
      setAllMovements(movements);
    };
    loadMovements();
  }, []);

  // Pré-remplir avec les données d'édition
  useEffect(() => {
    if (editMovement) {
      setFormData({
        date: editMovement.date,
        category: editMovement.category,
        site: editMovement.site,
        movement_type: editMovement.movement_type,
        bottle_type: editMovement.bottle_type,
        quantity: editMovement.quantity.toString(),
        client: editMovement.client || undefined,
        motif: editMovement.motif || '',
        provenance: editMovement.provenance || '',
        destination: editMovement.destination || '',
        justification_ecart: editMovement.justification_ecart || '',
        stock_theorique: editMovement.stock_theorique?.toString() || '',
        stock_reel: editMovement.stock_reel?.toString() || ''
      });
      setDate(new Date(editMovement.date));
    }
  }, [editMovement]);

  // Calculer le stock théorique quand les paramètres changent
  useEffect(() => {
    if (formData.category && formData.site && formData.bottle_type && formData.date) {
      const theoretical = calculateTheoreticalStock(
        allMovements,
        formData.category,
        formData.site,
        formData.bottle_type,
        formData.client,
        formData.date
      );
      setStockTheorique(theoretical);
      setFormData(prev => ({
        ...prev,
        stock_theorique: theoretical.toString()
      }));
    }
  }, [formData.category, formData.site, formData.bottle_type, formData.client, formData.date, allMovements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('La quantité doit être un nombre positif');
        setLoading(false);
        return;
      }

      // Validation selon le type de mouvement
      if (formData.movement_type === 'entree' && !formData.provenance) {
        toast.error('La provenance est requise pour une entrée');
        setLoading(false);
        return;
      }

      if (formData.movement_type === 'sortie') {
        if (!formData.destination) {
          toast.error('La destination est requise pour une sortie');
          setLoading(false);
          return;
        }
        if (!formData.motif) {
          toast.error('Le motif est requis pour une sortie');
          setLoading(false);
          return;
        }
      }

      if (formData.movement_type === 'inventaire') {
        const stockReel = parseFloat(formData.stock_reel || '0');
        if (isNaN(stockReel) || stockReel < 0) {
          toast.error('Le stock réel doit être un nombre positif');
          setLoading(false);
          return;
        }
        const ecart = stockReel - (stockTheorique || 0);
        if (Math.abs(ecart) > 0 && !formData.justification_ecart) {
          toast.error('Une justification est requise en cas d\'écart');
          setLoading(false);
          return;
        }
      }

      if (formData.movement_type === 'transfert') {
        if (!formData.provenance || !formData.destination) {
          toast.error('La provenance et la destination sont requises pour un transfert');
          setLoading(false);
          return;
        }
      }

      // Validation client pour parc_ce
      if (formData.category === 'parc_ce' && !formData.client) {
        toast.error('Le client est requis pour le parc CE');
        setLoading(false);
        return;
      }

      const movementData: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'> = {
        date: formData.date,
        category: formData.category,
        site: formData.site,
        movement_type: formData.movement_type,
        bottle_type: formData.bottle_type,
        quantity: Math.round(quantity),
        client: formData.client,
        motif: formData.motif || undefined,
        provenance: formData.provenance || undefined,
        destination: formData.destination || undefined,
        justification_ecart: formData.justification_ecart || undefined,
        stock_theorique: stockTheorique || undefined,
        stock_reel: formData.movement_type === 'inventaire' ? parseFloat(formData.stock_reel || '0') : undefined,
        ecart: formData.movement_type === 'inventaire' && formData.stock_reel
          ? parseFloat(formData.stock_reel) - (stockTheorique || 0)
          : undefined
      };

      const fullMovement: StockMovement = {
        ...movementData,
        id: editMovement?.id || crypto.randomUUID(),
        created_at: editMovement?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_modified_by: editMovement?.last_modified_by,
        last_modified_at: editMovement?.last_modified_at
      };

      await onSave(fullMovement);
      toast.success(editMovement ? 'Mouvement mis à jour' : 'Mouvement enregistré');
    } catch (error: any) {
      console.error('Error saving movement:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const isInventaire = formData.movement_type === 'inventaire';
  const isEntree = formData.movement_type === 'entree';
  const isSortie = formData.movement_type === 'sortie';
  const isTransfert = formData.movement_type === 'transfert';
  const isParcCE = formData.category === 'parc_ce';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Définissez les paramètres de base du mouvement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date du mouvement *</Label>
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
                  {date ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    if (d) {
                      setFormData(prev => ({ ...prev, date: format(d, 'yyyy-MM-dd') }));
                    }
                  }}
                  locale={fr}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: StockCategory) => {
                setFormData(prev => ({ ...prev, category: value }));
                // Réinitialiser client si ce n'est plus parc_ce
                if (value !== 'parc_ce') {
                  setFormData(prev => ({ ...prev, client: undefined }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STOCK_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Site */}
          <div className="space-y-2">
            <Label htmlFor="site">Site *</Label>
            <Select
              value={formData.site}
              onValueChange={(value: StockSite) => setFormData(prev => ({ ...prev, site: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STOCK_SITE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de mouvement */}
          <div className="space-y-2">
            <Label htmlFor="movement_type">Type de mouvement *</Label>
            <Select
              value={formData.movement_type}
              onValueChange={(value: MovementType) => setFormData(prev => ({ ...prev, movement_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de bouteille */}
          <div className="space-y-2">
            <Label htmlFor="bottle_type">Type de bouteille *</Label>
            <Select
              value={formData.bottle_type}
              onValueChange={(value: BottleType) => setFormData(prev => ({ ...prev, bottle_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BOTTLE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client (si parc_ce) */}
          {isParcCE && (
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client || ''}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, client: value as StockClient }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STOCK_CLIENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantité */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité (nombre de bouteilles) *</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="0"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Champs conditionnels selon le type de mouvement */}
      {(isEntree || isTransfert) && (
        <Card>
          <CardHeader>
            <CardTitle>Provenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="provenance">Provenance *</Label>
              <Input
                id="provenance"
                value={formData.provenance}
                onChange={(e) => setFormData(prev => ({ ...prev, provenance: e.target.value }))}
                placeholder="Ex: Production, Retour client, etc."
                required
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isSortie && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de sortie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Ex: Client, Production, etc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motif">Motif *</Label>
              <Input
                id="motif"
                value={formData.motif}
                onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                placeholder="Ex: Vente, Utilisation, etc."
                required
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isTransfert && (
        <Card>
          <CardHeader>
            <CardTitle>Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Ex: Autre site, Autre catégorie, etc."
                required
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isInventaire && (
        <Card>
          <CardHeader>
            <CardTitle>Inventaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock_theorique">Stock théorique</Label>
              <Input
                id="stock_theorique"
                type="number"
                value={stockTheorique?.toString() || formData.stock_theorique}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Calculé automatiquement à partir des mouvements précédents
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_reel">Stock réel (compté) *</Label>
              <Input
                id="stock_reel"
                type="number"
                min="0"
                step="1"
                value={formData.stock_reel}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, stock_reel: e.target.value }));
                }}
                placeholder="0"
                required
              />
            </div>
            {stockTheorique !== null && formData.stock_reel && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Écart :</span>
                  <span className={cn(
                    "text-lg font-bold",
                    parseFloat(formData.stock_reel) - stockTheorique > 0 ? "text-green-600" : 
                    parseFloat(formData.stock_reel) - stockTheorique < 0 ? "text-red-600" : 
                    "text-gray-600"
                  )}>
                    {parseFloat(formData.stock_reel) - stockTheorique > 0 ? '+' : ''}
                    {parseFloat(formData.stock_reel) - stockTheorique}
                  </span>
                </div>
                {Math.abs(parseFloat(formData.stock_reel) - stockTheorique) > 0 && (
                  <div className="mt-2 space-y-2">
                    <Label htmlFor="justification_ecart">Justification de l'écart *</Label>
                    <Textarea
                      id="justification_ecart"
                      value={formData.justification_ecart}
                      onChange={(e) => setFormData(prev => ({ ...prev, justification_ecart: e.target.value }))}
                      placeholder="Expliquez la raison de l'écart..."
                      required
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Enregistrement...' : editMovement ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
};

export default StockMovementForm;
