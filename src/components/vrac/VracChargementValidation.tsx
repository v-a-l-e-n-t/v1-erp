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
            <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Weight className="w-5 h-5 text-orange-500" />
                        Valider le chargement
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Confirmez le tonnage chargé pour ce camion
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Truck Info */}
                    <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">Informations camion</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-slate-400">Tracteur:</span>
                                <span className="ml-2 text-white font-mono">{demande.immatriculation_tracteur}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Citerne:</span>
                                <span className="ml-2 text-white font-mono">{demande.immatriculation_citerne}</span>
                            </div>
                            {demande.numero_bon && (
                                <div className="col-span-2">
                                    <span className="text-slate-400">N° Bon:</span>
                                    <span className="ml-2 text-white">{demande.numero_bon}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tonnage Input */}
                    <div className="space-y-2">
                        <Label htmlFor="tonnage" className="text-slate-300">
                            Tonnage chargé (tonnes) <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="tonnage"
                            type="number"
                            step="0.01"
                            min="0"
                            value={tonnage}
                            onChange={(e) => setTonnage(e.target.value)}
                            placeholder="Ex: 15.50"
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-lg"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-slate-300">
                            Notes <span className="text-slate-500">(optionnel)</span>
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Remarques éventuelles..."
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 resize-none"
                            rows={2}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            disabled={loading}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !tonnage}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
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
