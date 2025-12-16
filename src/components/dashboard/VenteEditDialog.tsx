import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

interface Mandataire {
    id: string;
    nom: string;
}

interface VenteMandataire {
    id: string;
    date: string;
    mandataire_id: string;
    camion: string | null;
    client: string | null;
    numero_bon_sortie: string;
    destination: string | null;
    r_b6: number | null;
    r_b12: number | null;
    r_b28: number | null;
    r_b38: number | null;
    r_b11_carbu: number | null;
    c_b6: number | null;
    c_b12: number | null;
    c_b28: number | null;
    c_b38: number | null;
    c_b11_carbu: number | null;
    mandataires?: { nom: string };
}

interface VenteEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: VenteMandataire | null;
    mandataires: Mandataire[];
    clients: string[];
    destinations: string[];
    onSuccess: () => void;
}

const VenteEditDialog = ({ open, onOpenChange, data, mandataires, clients, destinations, onSuccess }: VenteEditDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<VenteMandataire>>({});

    useEffect(() => {
        if (data) {
            setFormData({ ...data });
        }
    }, [data]);

    const handleChange = (field: keyof VenteMandataire, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id) return;

        setLoading(true);
        try {
            // Prepare data for update (remove joined fields like 'mandataires')
            const { mandataires: _, ...updateData } = formData;

            const { error } = await supabase
                .from("ventes_mandataires")
                .update(updateData)
                .eq("id", formData.id);

            if (error) throw error;

            toast.success("Vente mise à jour avec succès");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating vente:", error);
            toast.error("Erreur lors de la mise à jour");
        } finally {
            setLoading(false);
        }
    };

    // Helper to render number input
    const renderNumberInput = (field: keyof VenteMandataire, label: string) => (
        <div className="space-y-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
                id={field}
                type="number"
                value={formData[field] as number || 0}
                onChange={(e) => handleChange(field, parseFloat(e.target.value) || 0)}
                className="text-right"
            />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[800px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Modifier la vente - {formData.numero_bon_sortie}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        <div className="grid gap-6">
                            {/* Informations Générales */}
                            <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                                    Informations Générales
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={formData.date ? formData.date.split('T')[0] : ''}
                                            onChange={(e) => handleChange("date", e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bs">N° Bon de Sortie</Label>
                                        <Input
                                            id="bs"
                                            value={formData.numero_bon_sortie || ''}
                                            onChange={(e) => handleChange("numero_bon_sortie", e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mandataire</Label>
                                        <SearchableSelect
                                            options={mandataires.map(m => ({ value: m.id, label: m.nom }))}
                                            value={formData.mandataire_id || ''}
                                            onValueChange={(v) => handleChange("mandataire_id", v)}
                                            placeholder="Sélectionner"
                                            allLabel="Tous"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="camion">Camion</Label>
                                        <Input
                                            id="camion"
                                            value={formData.camion || ''}
                                            onChange={(e) => handleChange("camion", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client</Label>
                                        <SearchableSelect
                                            options={clients.map(c => ({ value: c, label: c }))}
                                            value={formData.client || ''}
                                            onValueChange={(v) => handleChange("client", v)}
                                            placeholder="Sélectionner"
                                            allLabel="Tous"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Destination</Label>
                                        <SearchableSelect
                                            options={destinations.map(d => ({ value: d, label: d }))}
                                            value={formData.destination || ''}
                                            onValueChange={(v) => handleChange("destination", v)}
                                            placeholder="Sélectionner"
                                            allLabel="Tous"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Détails Quantités */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Recharges */}
                                <div className="space-y-4 border p-4 rounded-lg bg-orange-50/50 border-orange-100">
                                    <h3 className="font-semibold text-orange-700">Recharges</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderNumberInput("r_b6", "B6")}
                                        {renderNumberInput("r_b12", "B12.5")}
                                        {renderNumberInput("r_b28", "B28")}
                                        {renderNumberInput("r_b38", "B38")}
                                        {renderNumberInput("r_b11_carbu", "B12.5 Carbu")}
                                    </div>
                                </div>

                                {/* Consignes */}
                                <div className="space-y-4 border p-4 rounded-lg bg-blue-50/50 border-blue-100">
                                    <h3 className="font-semibold text-blue-700">Consignes</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderNumberInput("c_b6", "B6")}
                                        {renderNumberInput("c_b12", "B12.5")}
                                        {renderNumberInput("c_b28", "B28")}
                                        {renderNumberInput("c_b38", "B38")}
                                        {renderNumberInput("c_b11_carbu", "B12.5 Carbu")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t bg-background">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[120px]">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default VenteEditDialog;
