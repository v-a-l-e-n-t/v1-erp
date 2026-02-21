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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, XCircle, Truck } from 'lucide-react';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracRefusalDialogProps {
    demande: VracDemandeChargement | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRefuse: (demandeId: string, motif: string) => Promise<boolean>;
}

const VracRefusalDialog: React.FC<VracRefusalDialogProps> = ({
    demande,
    open,
    onOpenChange,
    onRefuse,
}) => {
    const [motif, setMotif] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demande) return;

        if (motif.trim().length < 5) {
            setError('Le motif doit contenir au moins 5 caractères');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await onRefuse(demande.id, motif.trim());
            if (success) {
                setMotif('');
                onOpenChange(false);
            } else {
                setError('Erreur lors du refus');
            }
        } catch {
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setMotif('');
        setError('');
        onOpenChange(false);
    };

    if (!demande) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <XCircle className="w-5 h-5" />
                        Refuser la demande
                    </DialogTitle>
                    <DialogDescription>
                        Indiquez le motif du refus pour cette demande de chargement
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="motif">
                            Motif du refus <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="motif"
                            value={motif}
                            onChange={(e) => setMotif(e.target.value)}
                            placeholder="Précisez la raison du refus..."
                            className="resize-none"
                            rows={3}
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading || motif.trim().length < 5}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Refus en cours...
                                </>
                            ) : (
                                'Confirmer le refus'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default VracRefusalDialog;
