import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, Loader2, Truck, Minus, User, ChevronsUpDown } from 'lucide-react';
import { getClientFleet, mergeFleetWithHistory, normalizeImmat, type ClientFleet } from '@/data/fleetData';
import { supabase } from '@/integrations/supabase/client';

import ReactDOM from 'react-dom';

// --- Autocomplete inline ---
interface FleetAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
    mono?: boolean;
    icon?: React.ReactNode;
}

const FleetAutocomplete: React.FC<FleetAutocompleteProps> = ({
    value, onChange, options, placeholder, disabled, mono = true, icon,
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const listRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const interacted = useRef(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const filtered = useMemo(() => {
        if (!options || options.length === 0) return [];
        if (!inputValue) return options.slice(0, 15);
        const q = inputValue.toUpperCase();
        return options.filter(o => o.toUpperCase().includes(q)).slice(0, 15);
    }, [inputValue, options]);

    // Recalculer la position du dropdown
    const updateDropdownPosition = useCallback(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
            });
        }
    }, []);

    useEffect(() => {
        if (open) updateDropdownPosition();
    }, [open, filtered, updateDropdownPosition]);

    const handleSelect = useCallback((val: string) => {
        onChange(val);
        setInputValue(val);
        setOpen(false);
        setHighlightIndex(-1);
    }, [onChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.toUpperCase();
        const v = mono ? raw.replace(/-/g, '') : raw;
        setInputValue(v);
        onChange(v);
        interacted.current = true;
        setOpen(true);
        setHighlightIndex(-1);
    };

    const handleFocus = () => {
        if (interacted.current) {
            setOpen(true);
        }
    };

    const handleClick = () => {
        interacted.current = true;
        setOpen(true);
    };

    const handleBlur = () => {
        setTimeout(() => setOpen(false), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            interacted.current = true;
            if (!open) {
                setOpen(true);
                return;
            }
        }
        if (!open || filtered.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault();
            handleSelect(filtered[highlightIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-option]');
            items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    const dropdownElement = open && filtered.length > 0 ? (
        <div
            ref={listRef}
            style={dropdownStyle}
            className="max-h-[180px] overflow-y-auto rounded-md border bg-popover shadow-lg z-[99999] pointer-events-auto"
        >
            {filtered.map((option, i) => (
                <div
                    key={option}
                    data-option
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option);
                    }}
                    className={`px-3 py-1.5 ${mono ? 'text-sm font-mono' : 'text-xs'} cursor-pointer transition-colors ${i === highlightIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                        } ${option === value ? 'font-semibold' : ''}`}
                >
                    {option}
                </div>
            ))}
        </div>
    ) : null;

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                {icon && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        {icon}
                    </div>
                )}
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onClick={handleClick}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`${mono ? 'font-mono' : 'text-xs'} ${icon ? 'pl-7' : ''} pr-7`}
                    autoComplete="off"
                />
                <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            {ReactDOM.createPortal(dropdownElement, document.body)}
        </div>
    );
};

// --- Main form ---
interface TruckRow {
    tracteur: string;
    citerne: string;
    chauffeur: string;
}

interface VracBatchSubmitFormProps {
    onSubmit: (trucks: Array<{ tracteur: string; citerne: string; chauffeur: string }>) => Promise<boolean>;
    loading?: boolean;
    clientNom: string;
    clientId: string;
}

const VracBatchSubmitForm: React.FC<VracBatchSubmitFormProps> = ({ onSubmit, loading, clientNom, clientId }) => {
    const baseFleet = useMemo(() => getClientFleet(clientNom), [clientNom]);
    const [history, setHistory] = useState<Array<{ citerne: string; tracteur: string; chauffeur: string }>>([]);

    useEffect(() => {
        if (!clientId) return;
        supabase
            .from('vrac_demandes_chargement')
            .select('immatriculation_citerne, immatriculation_tracteur, nom_chauffeur')
            .eq('client_id', clientId)
            .not('immatriculation_citerne', 'is', null)
            .then(({ data }) => {
                if (data) {
                    setHistory(data.map(d => ({
                        citerne: d.immatriculation_citerne || '',
                        tracteur: d.immatriculation_tracteur || '',
                        chauffeur: d.nom_chauffeur || '',
                    })));
                }
            });
    }, [clientId]);

    const fleet = useMemo(() => mergeFleetWithHistory(baseFleet, history), [baseFleet, history]);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'count' | 'fill'>('count');
    const [count, setCount] = useState(1);
    const [rows, setRows] = useState<TruckRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleOpen = (isOpen: boolean) => {
        if (isOpen) {
            setStep('count');
            setCount(1);
            setRows([]);
        }
        setOpen(isOpen);
    };

    const handleCountConfirm = () => {
        setRows(Array.from({ length: count }, () => ({ tracteur: '', citerne: '', chauffeur: '' })));
        setStep('fill');
    };

    const updateRow = (index: number, field: keyof TruckRow, value: string) => {
        setRows(prev => {
            const updated = [...prev];
            const row = { ...updated[index], [field]: value };

            // Auto-fill intelligent
            if (field === 'citerne') {
                const normalized = normalizeImmat(value);
                const tracteur = fleet.citerneToTracteur.get(normalized);
                if (tracteur && !row.tracteur) {
                    row.tracteur = tracteur;
                }
                const chauffeurs = fleet.citerneTochauffeurs.get(normalized);
                if (chauffeurs && chauffeurs.length === 1 && !row.chauffeur) {
                    row.chauffeur = chauffeurs[0];
                }
            } else if (field === 'tracteur') {
                const normalized = normalizeImmat(value);
                const citerne = fleet.tracteurToCiterne.get(normalized);
                if (citerne && !row.citerne) {
                    row.citerne = citerne;
                }
            }

            updated[index] = row;
            return updated;
        });
    };

    const isValid = rows.length > 0 && rows.every(r =>
        r.tracteur.trim().length >= 2 &&
        r.citerne.trim().length >= 2 &&
        r.chauffeur.trim().length >= 2
    );

    const handleSubmit = async () => {
        if (!isValid || submitting) return;

        setSubmitting(true);
        try {
            const trucks = rows.map(r => ({
                tracteur: r.tracteur.trim(),
                citerne: r.citerne.trim(),
                chauffeur: r.chauffeur.trim(),
            }));
            const success = await onSubmit(trucks);
            if (success) {
                setOpen(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isLoading = submitting || loading;

    const getChauffeurOptions = (row: TruckRow): string[] => {
        const normalized = normalizeImmat(row.citerne);
        const associated = fleet.citerneTochauffeurs.get(normalized);
        if (associated && associated.length > 0) {
            const rest = fleet.chauffeurs.filter(c => !associated.includes(c));
            return [...associated, ...rest];
        }
        return fleet.chauffeurs;
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <Button className="w-full gap-2 h-12 text-base shadow-md">
                    <Plus className="w-5 h-5" />
                    Soumettre les camions du jour
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                {step === 'count' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" />
                                Combien de camions aujourd'hui ?
                            </DialogTitle>
                            <DialogDescription>
                                Indiquez le nombre de camions à déclarer pour le chargement du jour.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex items-center justify-center gap-4 py-6 flex-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-full"
                                onClick={() => setCount(prev => Math.max(1, prev - 1))}
                                disabled={count <= 1}
                            >
                                <Minus className="w-5 h-5" />
                            </Button>
                            <div className="text-center">
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={count}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        if (!isNaN(v) && v >= 1 && v <= 20) setCount(v);
                                        else if (e.target.value === '') setCount(1);
                                    }}
                                    className="w-20 h-16 text-center text-4xl font-bold text-primary border-2 border-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    camion{count > 1 ? 's' : ''}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-full"
                                onClick={() => setCount(prev => Math.min(20, prev + 1))}
                                disabled={count >= 20}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleCountConfirm} className="w-full">
                                Continuer
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" />
                                Remplir les informations
                            </DialogTitle>
                            <DialogDescription>
                                {rows.length} camion{rows.length > 1 ? 's' : ''} à déclarer — tapez pour rechercher
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 -mt-4 mb-4">
                            <div className="space-y-4 py-1">
                                {rows.map((row, index) => (
                                    <div key={index}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm font-medium text-foreground">
                                                Camion N°{index + 1}
                                            </span>
                                        </div>
                                        <div className="space-y-2 pl-9 pr-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Citerne</Label>
                                                    <FleetAutocomplete
                                                        value={row.citerne}
                                                        onChange={(v) => updateRow(index, 'citerne', v)}
                                                        options={fleet.citernes}
                                                        placeholder="Ex: 5842HK01"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Tracteur</Label>
                                                    <FleetAutocomplete
                                                        value={row.tracteur}
                                                        onChange={(v) => updateRow(index, 'tracteur', v)}
                                                        options={fleet.tracteurs}
                                                        placeholder="Ex: 663LG01"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Chauffeur du jour</Label>
                                                <FleetAutocomplete
                                                    value={row.chauffeur}
                                                    onChange={(v) => updateRow(index, 'chauffeur', v)}
                                                    options={getChauffeurOptions(row)}
                                                    placeholder="Nom du chauffeur..."
                                                    disabled={isLoading}
                                                    mono={false}
                                                    icon={<User className="w-3.5 h-3.5 text-muted-foreground" />}
                                                />
                                            </div>
                                        </div>
                                        {index < rows.length - 1 && <Separator className="mt-4" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="mt-auto flex-col sm:flex-row gap-2 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setStep('count')}
                                disabled={isLoading}
                                className="sm:mr-auto"
                            >
                                Retour
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!isValid || isLoading}
                                className="gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Envoyer {rows.length} camion{rows.length > 1 ? 's' : ''}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default VracBatchSubmitForm;
