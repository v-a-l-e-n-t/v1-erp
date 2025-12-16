import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Truck, Weight } from 'lucide-react';
import { VracDemandeChargement } from '@/types/vrac';

interface VracChargementValidationProps {
    demande: VracDemandeChargement | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onValidate: (demandeId: string, tonnage: number, notes?: string) => Promise<boolean>;
}

const VracChargementValidation: React.FC<VracChargementValidationProps> = ({
    demande,
    open,
    onOpenChange,
    onValidate,
}) => {
    const [tonnage, setTonnage] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demande) return;

        const tonnageNum = parseFloat(tonnage);
        if (isNaN(tonnageNum) || tonnageNum <= 0) {
            setError('Veuillez entrer un tonnage valide');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await onValidate(demande.id, tonnageNum, notes.trim() || undefined);
            if (success) {
                setTonnage('');
                setNotes('');
                onOpenChange(false);
            } else {
                setError('Erreur lors de la validation');
            }
        } catch (e) {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTonnage('');
        setNotes('');
        setError('');
        onOpenChange(false);
    };

    if (!demande) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Weight className="w-5 h-5 text-primary" />
                        Valider le chargement
                    </DialogTitle>
                    <DialogDescription>
                        Confirmez le tonnage chargé pour ce camion
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Truck Info */}
                    <div className="p-3 rounded-lg bg-muted border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground font-medium">Informations camion</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Tracteur:</span>
                                <span className="ml-2 font-mono font-medium">{demande.immatriculation_tracteur}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Citerne:</span>
                                <span className="ml-2 font-mono font-medium">{demande.immatriculation_citerne}</span>
                            </div>
                            {demande.numero_bon && (
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">N° Bon:</span>
                                    <span className="ml-2">{demande.numero_bon}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tonnage Input */}
                    <div className="space-y-2">
                        <Label htmlFor="tonnage">
                            Tonnage chargé (tonnes) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="tonnage"
                            type="number"
                            step="0.01"
                            min="0"
                            value={tonnage}
                            onChange={(e) => setTonnage(e.target.value)}
                            placeholder="Ex: 15.50"
                            className="text-lg"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">
                            Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Remarques éventuelles..."
                            className="resize-none"
                            rows={2}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !tonnage}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Validation...
                                </>
                            ) : (
                                'Valider le chargement'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default VracChargementValidation;
