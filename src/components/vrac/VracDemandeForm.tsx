import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Truck, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { VracDemandeFormData, VracDemandeChargement } from '@/types/vrac';

interface VracDemandeFormProps {
    onSubmit: (data: VracDemandeFormData) => Promise<boolean>;
    loading?: boolean;
    initialData?: VracDemandeChargement | null;
    onCancel?: () => void;
    isDialog?: boolean;
}

const VracDemandeForm: React.FC<VracDemandeFormProps> = ({ onSubmit, loading = false, initialData, onCancel, isDialog = false }) => {
    const [formData, setFormData] = useState<VracDemandeFormData>({
        immatriculation_tracteur: '',
        immatriculation_citerne: '',
        numero_bon: '',
        date_chargement: format(new Date(), 'yyyy-MM-dd'),
    });
    const [date, setDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize/Reset form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            setFormData({
                immatriculation_tracteur: initialData.immatriculation_tracteur,
                immatriculation_citerne: initialData.immatriculation_citerne,
                numero_bon: initialData.numero_bon || '',
                date_chargement: initialData.date_chargement,
            });
            setDate(new Date(initialData.date_chargement));
        } else {
            // Reset to default only if we are not editing anymore (explicit null passed)
            // But we also want to keep user input if they just started typing. 
            // Better strategy: Only set if initialData is provided.
            setFormData({
                immatriculation_tracteur: '',
                immatriculation_citerne: '',
                numero_bon: '',
                date_chargement: format(new Date(), 'yyyy-MM-dd'),
            });
            setDate(new Date());
        }
    }, [initialData]);

    const handleChange = (field: keyof VracDemandeFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
    };

    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            setFormData(prev => ({ ...prev, date_chargement: format(newDate, 'yyyy-MM-dd') }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.immatriculation_tracteur || !formData.immatriculation_citerne) return;

        setIsSubmitting(true);
        const success = await onSubmit(formData);
        if (success && !initialData) {
            // Only reset if creating new. If editing, parent handles closing/resetting.
            setFormData({
                immatriculation_tracteur: '',
                immatriculation_citerne: '',
                numero_bon: '',
                date_chargement: format(new Date(), 'yyyy-MM-dd'),
            });
            setDate(new Date());
        }
        setIsSubmitting(false);
    };

    const isLoading = loading || isSubmitting;

    if (isDialog) {
        return (
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date de chargement */}
                    <div className="space-y-2">
                        <Label>Date de chargement</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    disabled={isLoading}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={handleDateChange}
                                    locale={fr}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Numéro de bon */}
                    <div className="space-y-2">
                        <Label htmlFor="numero_bon">
                            N° Bon <span className="text-muted-foreground">(optionnel)</span>
                        </Label>
                        <Input
                            id="numero_bon"
                            value={formData.numero_bon}
                            onChange={(e) => handleChange('numero_bon', e.target.value)}
                            placeholder="BON-2024-001"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Immatriculation Tracteur */}
                    <div className="space-y-2">
                        <Label htmlFor="tracteur">
                            Immatriculation Tracteur <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="tracteur"
                            value={formData.immatriculation_tracteur}
                            onChange={(e) => handleChange('immatriculation_tracteur', e.target.value)}
                            placeholder="AB-123-CD"
                            className="uppercase"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Immatriculation Citerne */}
                    <div className="space-y-2">
                        <Label htmlFor="citerne">
                            Immatriculation Citerne <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="citerne"
                            value={formData.immatriculation_citerne}
                            onChange={(e) => handleChange('immatriculation_citerne', e.target.value)}
                            placeholder="EF-456-GH"
                            className="uppercase"
                            disabled={isLoading}
                            required
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Annuler
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={isLoading || !formData.immatriculation_tracteur || !formData.immatriculation_citerne}
                        className="font-semibold transition-all duration-200"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {initialData ? 'Modification...' : 'Ajout...'}
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                {initialData ? 'Enregistrer' : 'Ajouter'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <Card className="border-border shadow-sm">
            {/* Same as before... but redundant code. 
               Better strategy: Extract FormContent or use conditional wrapper. 
               Refactoring is safer.
            */}
            {/* ... */}

            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    {initialData ? 'Modifier le camion' : 'Ajouter un camion citerne'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date de chargement */}
                        <div className="space-y-2">
                            <Label>Date de chargement</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                        disabled={isLoading}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={handleDateChange}
                                        locale={fr}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Numéro de bon */}
                        <div className="space-y-2">
                            <Label htmlFor="numero_bon">
                                N° Bon <span className="text-muted-foreground">(optionnel)</span>
                            </Label>
                            <Input
                                id="numero_bon"
                                value={formData.numero_bon}
                                onChange={(e) => handleChange('numero_bon', e.target.value)}
                                placeholder="BON-2024-001"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Immatriculation Tracteur */}
                        <div className="space-y-2">
                            <Label htmlFor="tracteur">
                                Immatriculation Tracteur <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="tracteur"
                                value={formData.immatriculation_tracteur}
                                onChange={(e) => handleChange('immatriculation_tracteur', e.target.value)}
                                placeholder="AB-123-CD"
                                className="uppercase"
                                disabled={isLoading}
                                required
                            />
                        </div>

                        {/* Immatriculation Citerne */}
                        <div className="space-y-2">
                            <Label htmlFor="citerne">
                                Immatriculation Citerne <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="citerne"
                                value={formData.immatriculation_citerne}
                                onChange={(e) => handleChange('immatriculation_citerne', e.target.value)}
                                placeholder="EF-456-GH"
                                className="uppercase"
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isLoading}
                                className="w-full"
                            >
                                Annuler
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.immatriculation_tracteur || !formData.immatriculation_citerne}
                            className="w-full font-semibold transition-all duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {initialData ? 'Modification...' : 'Ajout en cours...'}
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {initialData ? 'Modifier' : 'Ajouter le camion'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default VracDemandeForm;
