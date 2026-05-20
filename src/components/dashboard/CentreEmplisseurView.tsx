import { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Loader2, Factory, Users, ArrowUp, ArrowDown, Calendar as CalendarIcon, Package, Download, FileDown, ChevronDown, ChevronUp, Camera, FileText, Eye, EyeOff } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Helper function to calculate real worked hours from shift times
const calculateShiftHours = (heureDebut: string, heureFin: string): number => {
    try {
        const [startHours, startMinutes] = heureDebut.split(':').map(Number);
        const [endHours, endMinutes] = heureFin.split(':').map(Number);

        let totalHours = endHours - startHours;
        let totalMinutes = endMinutes - startMinutes;

        // Handle overnight shifts (e.g., 20h-5h)
        if (totalHours < 0) {
            totalHours += 24;
        }

        return totalHours + (totalMinutes / 60);
    } catch (error) {
        console.error('Error calculating shift hours:', error);
        return 9; // Fallback to 9 hours if parsing fails
    }
};

/**
 * Durée réelle d'ouverture d'un shift : la plus longue session parmi les
 * lignes actives (parallèle). On n'additionne pas les lignes, et on n'étire
 * pas la fenêtre du premier démarrage au dernier arrêt (qui gonfle artificiellement).
 */
const calculateShiftOpeningHours = (shiftLines: any[]): number => {
    let maxHours = 0;
    shiftLines.forEach(l => {
        if (l.actif === false || !l.heure_debut_reelle || !l.heure_fin_reelle) return;
        const h = calculateShiftHours(l.heure_debut_reelle, l.heure_fin_reelle);
        if (h > maxHours) maxHours = h;
    });
    return maxHours;
};

/**
 * Heures réelles d'une ligne sur son shift.
 * - Si la ligne est marquée Inactive → 0.
 * - Si la ligne porte ses propres heures (`heure_debut_reelle` / `heure_fin_reelle`),
 *   on les utilise — elles peuvent être plus courtes que la fenêtre du shift.
 * - Sinon (ancienne saisie sans heures propres), on retombe sur les heures du
 *   shift global pour rester rétro-compatible.
 */
const calculateLigneHours = (ligne: any): number => {
    if (ligne?.actif === false) return 0;
    if (ligne?.heure_debut_reelle && ligne?.heure_fin_reelle) {
        return calculateShiftHours(ligne.heure_debut_reelle, ligne.heure_fin_reelle);
    }
    const shift = ligne?.production_shifts;
    if (shift?.heure_debut_reelle && shift?.heure_fin_reelle) {
        return calculateShiftHours(shift.heure_debut_reelle, shift.heure_fin_reelle);
    }
    return 9;
};

const categorizeArret = (type: string): 'Sécurité' | 'Ressources' | 'Pannes' | 'Autre' => {
    switch (type) {
        case 'causerie_securite':
        case 'exercice_securite':
            return 'Sécurité';
        case 'manque_personnel':
        case 'manque_bouteilles':
        case 'perte_vitesse':
        case 'lenteur_cariste':
            return 'Ressources';
        case 'panne_palettiseur':
        case 'autre_panne':
        case 'maintenance_corrective':
        case 'panne_ligne':
            return 'Pannes';
        default:
            return 'Autre';
    }
};

const ARRET_LABELS: Record<string, string> = {
    causerie_securite: 'Causerie sécurité',
    exercice_securite: 'Exercice sécurité',
    manque_personnel: 'Manque de personnel',
    manque_bouteilles: 'Manque de bouteilles',
    perte_vitesse: 'Perte de vitesse',
    lenteur_cariste: 'Lenteur cariste',
    panne_palettiseur: 'Panne palettiseur',
    autre_panne: 'Autre panne',
    maintenance_corrective: 'Maintenance corrective',
    probleme_approvisionnement: 'Problème approvisionnement',
    panne_ligne: 'Pannes sur la ligne',
    autre: 'Autre',
};

type ShiftInventoryClientKey = 'pi' | 'vivo' | 'total';

const SHIFT_INVENTORY_LOGOS: Record<ShiftInventoryClientKey, string> = {
    pi: '/images/logo-petro.png',
    vivo: '/images/logo-vivo.png',
    total: '/images/logo-total.png',
};

const SHIFT_INVENTORY_CLIENT_KEYS: ShiftInventoryClientKey[] = ['pi', 'vivo', 'total'];

type ShiftInventoryFormatRow = {
    formatLabel: string;
    vides: number;
    pleines: number;
    cumul: number;
    tauxVides: number;
    tauxPleines: number;
};

type ShiftInventoryClientBlock = {
    clientKey: ShiftInventoryClientKey;
    logoSrc: string;
    rows: [ShiftInventoryFormatRow, ShiftInventoryFormatRow];
};

const aggregateShiftInventoryFormat = (
    shifts: any[],
    fieldPrefix: 'stock_outil' | 'consignes_shift',
    clientKey: ShiftInventoryClientKey,
    fmt: 'b6' | 'b12',
): ShiftInventoryFormatRow => {
    const vides = shifts.reduce(
        (sum, s) => sum + (Number(s[`${fieldPrefix}_${clientKey}_${fmt}_vides`]) || 0),
        0,
    );
    const pleines = shifts.reduce(
        (sum, s) => sum + (Number(s[`${fieldPrefix}_${clientKey}_${fmt}_pleines`]) || 0),
        0,
    );
    const cumul = vides + pleines;
    const tauxVides = cumul > 0 ? (vides / cumul) * 100 : 0;
    const tauxPleines = cumul > 0 ? (pleines / cumul) * 100 : 0;
    return {
        formatLabel: fmt === 'b6' ? 'B6' : 'B12',
        vides,
        pleines,
        cumul,
        tauxVides,
        tauxPleines,
    };
};

const buildShiftInventoryByClient = (
    shifts: any[],
    fieldPrefix: 'stock_outil' | 'consignes_shift',
): ShiftInventoryClientBlock[] =>
    SHIFT_INVENTORY_CLIENT_KEYS.map((clientKey) => ({
        clientKey,
        logoSrc: SHIFT_INVENTORY_LOGOS[clientKey],
        rows: [
            aggregateShiftInventoryFormat(shifts, fieldPrefix, clientKey, 'b6'),
            aggregateShiftInventoryFormat(shifts, fieldPrefix, clientKey, 'b12'),
        ],
    }));

const ShiftInventoryQtyTauxCell = ({ qty, taux }: { qty: number; taux: number }) => (
    <td className="p-2 text-right align-middle tabular-nums">
        <div className="text-sm sm:text-base font-bold">{qty.toLocaleString('fr-FR')}</div>
        <div className="text-xs sm:text-sm font-semibold text-muted-foreground">{taux.toFixed(1)} %</div>
    </td>
);

const ShiftInventoryTable = ({ title, clients }: { title: string; clients: ShiftInventoryClientBlock[] }) => {
    return (
    <div className="space-y-2 min-w-0">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
        <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-xs border-collapse">
                <thead>
                    <tr className="bg-muted/50 border-b">
                        <th className="p-2 text-center font-semibold w-[76px] border-r">Client</th>
                        <th className="p-2 text-center font-semibold w-14">Format</th>
                        <th className="p-2 text-right font-semibold">Vides</th>
                        <th className="p-2 text-right font-semibold">Pleines</th>
                        <th className="p-2 text-right font-semibold">Cumul</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/80">
                    {clients.map((block) => (
                        <Fragment key={block.clientKey}>
                            <tr>
                                <td
                                    rowSpan={2}
                                    className="p-2 align-middle text-center border-r bg-muted/15"
                                >
                                    <img
                                        src={block.logoSrc}
                                        alt=""
                                        className="h-9 w-auto max-w-[64px] mx-auto object-contain"
                                        loading="lazy"
                                    />
                                </td>
                                <td className="p-2 text-center font-medium">{block.rows[0].formatLabel}</td>
                                <ShiftInventoryQtyTauxCell qty={block.rows[0].vides} taux={block.rows[0].tauxVides} />
                                <ShiftInventoryQtyTauxCell qty={block.rows[0].pleines} taux={block.rows[0].tauxPleines} />
                                <td className="p-2 text-right align-middle tabular-nums text-sm sm:text-base font-bold">
                                    {block.rows[0].cumul.toLocaleString('fr-FR')}
                                </td>
                            </tr>
                            <tr>
                                <td className="p-2 text-center font-medium">{block.rows[1].formatLabel}</td>
                                <ShiftInventoryQtyTauxCell qty={block.rows[1].vides} taux={block.rows[1].tauxVides} />
                                <ShiftInventoryQtyTauxCell qty={block.rows[1].pleines} taux={block.rows[1].tauxPleines} />
                                <td className="p-2 text-right align-middle tabular-nums text-sm sm:text-base font-bold">
                                    {block.rows[1].cumul.toLocaleString('fr-FR')}
                                </td>
                            </tr>
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
};

/**
 * Production théorique d'une ligne (en tonnes), basée sur ses heures propres
 * et son temps d'arrêt. Centralise la formule utilisée par "Détail par Ligne"
 * et "Productivité par agent".
 * - Ligne inactive → 0 (ni théorique ni productivité comptées).
 * - Temps d'arrêt plafonné à la durée réelle de la ligne.
 * - Rate : lignes 1-4 (B6) = 1600 × 6 kg/h, ligne 5 (B12) = 900 × 12.5 kg/h.
 */
/** Arrondit une durée en heures à 2 décimales (~36 secondes près). */
const round2 = (h: number) => Math.round(h * 100) / 100;

const lineTheoreticalTonnes = (l: any): number => {
    if (l?.actif === false) return 0;
    const ligneHours = calculateLigneHours(l);
    if (ligneHours <= 0) return 0;
    const downtime = Math.min(Number(l.temps_arret_ligne_minutes) || 0, ligneHours * 60);
    const productiveHours = round2(ligneHours - downtime / 60);
    const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? 1600 * 6 : 900 * 12.5;
    return (rate * productiveHours) / 1000;
};

/**
 * Bouteilles attendues d'une ligne sur sa durée propre.
 * Cadence : lignes 1-4 (B6) = 1600 b/h, ligne 5 (B12) = 900 b/h.
 */
const lineExpectedBottles = (l: any): number => {
    if (l?.actif === false) return 0;
    const ligneHours = calculateLigneHours(l);
    if (ligneHours <= 0) return 0;
    const downtime = Math.min(Number(l.temps_arret_ligne_minutes) || 0, ligneHours * 60);
    const productiveHours = round2(ligneHours - downtime / 60);
    const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? 1600 : 900;
    return rate * productiveHours;
};

interface CentreEmplisseurViewProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    filterType: 'all' | 'year' | 'month' | 'period' | 'day';
    setFilterType: (type: 'all' | 'year' | 'month' | 'period' | 'day') => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
}

const CentreEmplisseurView = ({
    dateRange, setDateRange,
    filterType, setFilterType,
    selectedDate, setSelectedDate,
    selectedMonth, setSelectedMonth
}: CentreEmplisseurViewProps) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    // Refs for exportable sections
    const section1Ref = useRef<HTMLDivElement>(null);
    const section2Ref = useRef<HTMLDivElement>(null);
    const section3Ref = useRef<HTMLDivElement>(null);
    const sectionArretsRef = useRef<HTMLDivElement>(null);
    const agentModalRef = useRef<HTMLDivElement>(null);

    // Collapsible sections state
    const [isLinesExpanded, setIsLinesExpanded] = useState(false);
    const [isAgentsExpanded, setIsAgentsExpanded] = useState(false);
    const [isArretsExpanded, setIsArretsExpanded] = useState(false);
    const [arretFilter, setArretFilter] = useState<'Tous' | 'Sécurité' | 'Ressources' | 'Pannes' | 'Autre'>('Tous');
    const [rawShifts, setRawShifts] = useState<any[]>([]);
    const [showShiftStockConsignes, setShowShiftStockConsignes] = useState(false);

    const shiftInventoryStats = useMemo(() => ({
        stockOutil: buildShiftInventoryByClient(rawShifts, 'stock_outil'),
        consignes: buildShiftInventoryByClient(rawShifts, 'consignes_shift'),
    }), [rawShifts]);

    // Export utility functions
    const exportSectionAsImage = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current) return;

        try {
            const canvas = await html2canvas(ref.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                onclone: (document) => {
                    // Fix for text alignment issues
                    const elements = document.querySelectorAll('*');
                    elements.forEach((el: any) => {
                        if (el.style) {
                            el.style.fontVariant = 'normal';
                        }
                    });
                }
            } as any);

            // Generate timestamp
            const now = new Date();
            const timestamp = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');

            const link = document.createElement('a');
            link.download = `${filename}_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error exporting image:', error);
        }
    };

    const exportSectionAsPDF = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current) return;

        try {
            const canvas = await html2canvas(ref.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                onclone: (document) => {
                    // Fix for text alignment issues
                    const elements = document.querySelectorAll('*');
                    elements.forEach((el: any) => {
                        if (el.style) {
                            el.style.fontVariant = 'normal';
                        }
                    });
                }
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 297; // A4 landscape width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Generate timestamp
            const now = new Date();
            const timestamp = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');

            pdf.save(`${filename}_${timestamp}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    };





    const formatHours = (v: number) => {
        const h = Math.floor(v);
        const m = Math.round((v - h) * 60);
        return m === 60 ? `${h + 1}h00` : `${h}h${m.toString().padStart(2, '0')}`;
    };

    const formatMinutesToHours = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return `${h}h${m.toString().padStart(2, '0')}`;
    };

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        // Global
        totalTonnage: 0,
        totalOpeningHours: 0,
        totalTheoreticalOpeningHours: 0,
        averageOpeningHoursPerDay: 0,
        periodTarget: 0,
        performancePct: 0,
        shift1: { tonnage: 0, recharges: 0, consignes: 0 },
        shift2: { tonnage: 0, recharges: 0, consignes: 0 },

        // Lines
        lines: [] as {
            id: number;
            tonnage: number;
            percentage: number;
            recharges: number;
            consignes: number;
            rechargesKg: number;
            consignesKg: number;
            tempsArret: number;      // en minutes
            productivite: number;    // en pourcentage
        }[],
        maxLine: { id: 0, tonnage: 0 },
        minLine: { id: 0, tonnage: 0 },

        // Bottles (Recharges & Consignes)
        recharges: {
            b6: { qty: 0, kg: 0 },
            b12: { qty: 0, kg: 0 },
            b28: { qty: 0, kg: 0 },
            b38: { qty: 0, kg: 0 },
            total: 0
        },
        consignes: {
            b6: { qty: 0, kg: 0 },
            b12: { qty: 0, kg: 0 },
            b28: { qty: 0, kg: 0 },
            b38: { qty: 0, kg: 0 },
            total: 0
        },

        // Clients
        clients: {
            petro: { qty: 0, pct: 0, tonnage: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
            vivo: { qty: 0, pct: 0, tonnage: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
            total: { qty: 0, pct: 0, tonnage: 0, b6: 0, b12: 0, b28: 0, b38: 0 },
            global: 0
        },
        dailyHistory: {} as Record<string, any>
    });

    // Agent productivity states
    const [allAgents, setAllAgents] = useState<any[]>([]);
    const [allAgentsComparison, setAllAgentsComparison] = useState<any[]>([]);
    const [selectedAgentForModal, setSelectedAgentForModal] = useState<string | null>(null);
    const [agentModalData, setAgentModalData] = useState<any>(null);
    const [selectedLineForModal, setSelectedLineForModal] = useState<number | null>(null);
    const [lineModalData, setLineModalData] = useState<any>(null);
    const [lineModalTab, setLineModalTab] = useState<'shift1' | 'shift2' | 'cumul'>('cumul');


    // Agent Filter States (default to current month)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Années disponibles
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    // Mois disponibles pour l'année sélectionnée (pour le filtre mois)
    const availableMonths = useMemo(() => {
        if (filterType !== 'month') return [];
        return Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            return `${selectedYear}-${String(month).padStart(2, '0')}`;
        }).reverse();
    }, [selectedYear, filterType]);

    // Analyse des arrêts par ligne et par motif
    const arretStatsByLine = useMemo(() => {
        return [1, 2, 3, 4, 5].map(lineId => {
            let totalDuration = 0;
            let incidentCount = 0;
            const motifBreakdown: Record<string, { duration: number; count: number }> = {};

            rawShifts.forEach(shift => {
                const arrets = shift.arrets_production || [];
                const lineArrets = arrets.filter((a: any) => Number(a.numero_ligne) === lineId);

                // Get the total downtime of this line on this shift
                const lineData = (shift.lignes_production || []).find((l: any) => Number(l.numero_ligne) === lineId);
                const tempsArretTotal = lineData ? (Number(lineData.temps_arret_ligne_minutes) || 0) : 0;

                lineArrets.forEach((arret: any) => {
                    const cat = categorizeArret(arret.type_arret);
                    
                    if (arretFilter !== 'Tous' && cat !== arretFilter) {
                        return;
                    }

                    // Fallback to equal distribution if duree_minutes is missing in database
                    let duration = Number(arret.duree_minutes) || 0;
                    if (duration === 0 && tempsArretTotal > 0 && lineArrets.length > 0) {
                        duration = Math.round(tempsArretTotal / lineArrets.length);
                    }

                    totalDuration += duration;
                    incidentCount += 1;

                    const type = arret.type_arret || 'autre';
                    if (!motifBreakdown[type]) {
                        motifBreakdown[type] = { duration: 0, count: 0 };
                    }
                    motifBreakdown[type].duration += duration;
                    motifBreakdown[type].count += 1;
                });
            });

            return {
                id: lineId,
                totalDuration,
                incidentCount,
                motifs: Object.entries(motifBreakdown).map(([type, data]) => ({
                    type,
                    label: ARRET_LABELS[type] || type,
                    ...data
                })).sort((a, b) => b.duration - a.duration)
            };
        });
    }, [rawShifts, arretFilter]);




    // Fetch agent details when modal opens
    useEffect(() => {
        const loadAgentDetails = async () => {
            if (selectedAgentForModal) {
                const data = await fetchAgentDetailedStats(selectedAgentForModal);
                setAgentModalData(data);
            } else {
                setAgentModalData(null);
            }
        };
        loadAgentDetails();
    }, [selectedAgentForModal, filterType, selectedMonth, selectedDate, dateRange]);

    // Fetch line details when modal opens
    useEffect(() => {
        const loadLineDetails = async () => {
            if (selectedLineForModal) {
                const data = await fetchLineDetailedStats(selectedLineForModal);
                setLineModalData(data);
            } else {
                setLineModalData(null);
            }
        };
        loadLineDetails();
    }, [selectedLineForModal, filterType, selectedMonth, selectedDate, dateRange, selectedYear]);

    // Synchroniser selectedMonth avec selectedYear quand on change l'année dans le filtre mois
    useEffect(() => {
        if (filterType === 'month' && selectedMonth) {
            const [currentYear] = selectedMonth.split('-').map(Number);
            if (currentYear !== selectedYear) {
                // Mettre à jour le mois pour correspondre à l'année sélectionnée
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const newMonth = `${selectedYear}-${String(currentMonth).padStart(2, '0')}`;
                setSelectedMonth(newMonth);
            }
        }
    }, [selectedYear, filterType]);

    // Load stats and agents when filters change
    useEffect(() => {
        fetchStats();
        fetchAgents();
    }, [dateRange, filterType, selectedDate, selectedMonth]);

    // Load agents comparison when filters change
    useEffect(() => {
        fetchAllAgentsComparison();
    }, [filterType, selectedMonth, selectedDate, dateRange]);


    const fetchStats = async () => {
        setLoading(true);
        try {
            let shiftsQuery = supabase.from('production_shifts').select('*, arrets_production(*), lignes_production(*)');
            let linesQuery = supabase.from('lignes_production').select('*, production_shifts!inner(date, shift_type, heure_debut_reelle, heure_fin_reelle)');

            // Apply filters
            if (filterType === 'year') {
                const startDate = `${selectedYear}-01-01`;
                const endDate = `${selectedYear}-12-31`;
                shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                linesQuery = linesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
            } else if (filterType === 'month') {
                const startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                linesQuery = linesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
            } else if (filterType === 'day' && selectedDate) {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                shiftsQuery = shiftsQuery.eq('date', dateStr);
                linesQuery = linesQuery.eq('production_shifts.date', dateStr);
            } else if (filterType === 'period' && dateRange?.from) {
                const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                linesQuery = linesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
            }
            // 'all' = pas de filtre, utilise toutes les données

            const [shiftsResult, linesResult] = await Promise.all([shiftsQuery, linesQuery]);

            if (shiftsResult.error) throw shiftsResult.error;
            if (linesResult.error) throw linesResult.error;

            const shifts = shiftsResult.data || [];
            const lines = linesResult.data || [];

            // 1. Global Production & Shifts
            const totalTonnage = shifts.reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0);

            // Calculate Shift details from lines to get recharges/consignes counts per shift
            const shift1Lines = lines.filter(l => l.production_shifts.shift_type === '10h-19h');
            const shift2Lines = lines.filter(l => l.production_shifts.shift_type === '20h-5h');

            // Helper to sum bottle quantities
            const sumBottles = (linesList: any[], type: 'recharges' | 'consignes') => {
                return linesList.reduce((sum, l) => {
                    return sum +
                        (l[`${type}_petro_b6`] || 0) + (l[`${type}_petro_b12`] || 0) + (l[`${type}_petro_b28`] || 0) + (l[`${type}_petro_b38`] || 0) +
                        (l[`${type}_vivo_b6`] || 0) + (l[`${type}_vivo_b12`] || 0) + (l[`${type}_vivo_b28`] || 0) + (l[`${type}_vivo_b38`] || 0) +
                        (l[`${type}_total_b6`] || 0) + (l[`${type}_total_b12`] || 0) + (l[`${type}_total_b28`] || 0) + (l[`${type}_total_b38`] || 0);
                }, 0);
            };

            const shift1Recharges = sumBottles(shift1Lines, 'recharges');
            const shift1Consignes = sumBottles(shift1Lines, 'consignes');
            const shift2Recharges = sumBottles(shift2Lines, 'recharges');
            const shift2Consignes = sumBottles(shift2Lines, 'consignes');

            // 2. Lines Breakdown
            const linesStats = [1, 2, 3, 4, 5].map(id => {
                const lineLines = lines.filter(l => l.numero_ligne === id);
                const tonnage = lineLines.reduce((sum, l) => sum + (Number(l.tonnage_ligne) || 0), 0);
                const recharges = sumBottles(lineLines, 'recharges');
                const consignes = sumBottles(lineLines, 'consignes');

                // Calculate weights for recharges and consignes
                const calculateKg = (qty: number, weight: number) => qty * weight;

                const rechargesKg = lineLines.reduce((sum, l) => {
                    return sum +
                        ((l.recharges_petro_b6 || 0) + (l.recharges_vivo_b6 || 0) + (l.recharges_total_b6 || 0)) * 6 +
                        ((l.recharges_petro_b12 || 0) + (l.recharges_vivo_b12 || 0) + (l.recharges_total_b12 || 0)) * 12.5 +
                        ((l.recharges_petro_b28 || 0) + (l.recharges_vivo_b28 || 0) + (l.recharges_total_b28 || 0)) * 28 +
                        ((l.recharges_petro_b38 || 0) + (l.recharges_vivo_b38 || 0) + (l.recharges_total_b38 || 0)) * 38;
                }, 0);

                const consignesKg = lineLines.reduce((sum, l) => {
                    return sum +
                        ((l.consignes_petro_b6 || 0) + (l.consignes_vivo_b6 || 0) + (l.consignes_total_b6 || 0)) * 6 +
                        ((l.consignes_petro_b12 || 0) + (l.consignes_vivo_b12 || 0) + (l.consignes_total_b12 || 0)) * 12.5 +
                        ((l.consignes_petro_b28 || 0) + (l.consignes_vivo_b28 || 0) + (l.consignes_total_b28 || 0)) * 28 +
                        ((l.consignes_petro_b38 || 0) + (l.consignes_vivo_b38 || 0) + (l.consignes_total_b38 || 0)) * 38;
                }, 0);

                // Calculate temps d'arrêt for this line - now stored directly in lignes_production
                const tempsArret = lineLines.reduce((sum, l) => sum + (Number(l.temps_arret_ligne_minutes) || 0), 0);

                // Production théorique = somme des théoriques de chaque session de
                // ligne (helper unique partagé avec "Productivité par agent").
                const productionTheorique = lineLines.reduce(
                    (sum, l) => sum + lineTheoreticalTonnes(l),
                    0,
                );

                // Calculate productivity
                const productivite = productionTheorique > 0 ? (tonnage / productionTheorique) * 100 : 0;

                return {
                    id,
                    tonnage,
                    percentage: totalTonnage > 0 ? (tonnage / totalTonnage) * 100 : 0,
                    recharges,
                    consignes,
                    rechargesKg,
                    consignesKg,
                    tempsArret,
                    productivite
                };
            });

            const maxLine = linesStats.reduce((max, l) => l.tonnage > max.tonnage ? l : max, { id: 0, tonnage: 0 });
            const minLine = linesStats.reduce((min, l) => (l.tonnage < min.tonnage && l.tonnage > 0) ? l : min, { id: 0, tonnage: Infinity });

            // 3. Bottles Breakdown
            const calculateBottleStats = (type: 'recharges' | 'consignes') => {
                const b6 = lines.reduce((sum, l) => sum + (l[`${type}_petro_b6`] || 0) + (l[`${type}_vivo_b6`] || 0) + (l[`${type}_total_b6`] || 0), 0);
                const b12 = lines.reduce((sum, l) => sum + (l[`${type}_petro_b12`] || 0) + (l[`${type}_vivo_b12`] || 0) + (l[`${type}_total_b12`] || 0), 0);
                const b28 = lines.reduce((sum, l) => sum + (l[`${type}_petro_b28`] || 0) + (l[`${type}_vivo_b28`] || 0) + (l[`${type}_total_b28`] || 0), 0);
                const b38 = lines.reduce((sum, l) => sum + (l[`${type}_petro_b38`] || 0) + (l[`${type}_vivo_b38`] || 0) + (l[`${type}_total_b38`] || 0), 0);
                return { b6, b12, b28, b38 };
            };

            const rStats = calculateBottleStats('recharges');
            const cStats = calculateBottleStats('consignes');

            const calculateKg = (qty: number, weight: number) => qty * weight;

            const r_b6 = rStats.b6; const r_b12 = rStats.b12; const r_b28 = rStats.b28; const r_b38 = rStats.b38;
            const c_b6 = cStats.b6; const c_b12 = cStats.b12; const c_b28 = cStats.b28; const c_b38 = cStats.b38;

            const totalRecharges = r_b6 + r_b12 + r_b28 + r_b38;
            const totalConsignes = c_b6 + c_b12 + c_b28 + c_b38;

            // 4. Clients Breakdown
            const calculateClientStats = (client: 'petro' | 'vivo' | 'total') => {
                const b6 = lines.reduce((sum, l) => sum + (l[`recharges_${client}_b6`] || 0) + (l[`consignes_${client}_b6`] || 0), 0);
                const b12 = lines.reduce((sum, l) => sum + (l[`recharges_${client}_b12`] || 0) + (l[`consignes_${client}_b12`] || 0), 0);
                const b28 = lines.reduce((sum, l) => sum + (l[`recharges_${client}_b28`] || 0) + (l[`consignes_${client}_b28`] || 0), 0);
                const b38 = lines.reduce((sum, l) => sum + (l[`recharges_${client}_b38`] || 0) + (l[`consignes_${client}_b38`] || 0), 0);
                const total = b6 + b12 + b28 + b38;
                return { b6, b12, b28, b38, total };
            };

            const cl_petro = calculateClientStats('petro');
            const cl_vivo = calculateClientStats('vivo');
            const cl_total = calculateClientStats('total');
            const globalClients = cl_petro.total + cl_vivo.total + cl_total.total;

            const calculateClientTonnage = (lines: any[], clientPrefix: string) => {
                return lines.reduce((sum: number, l: any) => {
                    const tonnage =
                        (l[`recharges_${clientPrefix}_b6`] || 0) * 6 +
                        (l[`recharges_${clientPrefix}_b12`] || 0) * 12.5 +
                        (l[`recharges_${clientPrefix}_b28`] || 0) * 28 +
                        (l[`recharges_${clientPrefix}_b38`] || 0) * 38 +
                        (l[`consignes_${clientPrefix}_b6`] || 0) * 6 +
                        (l[`consignes_${clientPrefix}_b12`] || 0) * 12.5 +
                        (l[`consignes_${clientPrefix}_b28`] || 0) * 28 +
                        (l[`consignes_${clientPrefix}_b38`] || 0) * 38;
                    return sum + tonnage;
                }, 0);
            };

            const petroTonnage = calculateClientTonnage(lines, 'petro');
            const vivoTonnage = calculateClientTonnage(lines, 'vivo');
            const totalClientTonnage = calculateClientTonnage(lines, 'total');

            // Performance du Centre : par jour, somme des durées réelles de chaque shift
            // (= durée max parmi les lignes actives du shift), via heure_debut_reelle /
            // heure_fin_reelle — pas la somme ligne par ligne ni la durée shift globale.
            const linesByDateShift: Record<string, any[]> = {};
            lines.forEach(l => {
                const date = l.production_shifts?.date;
                const shiftType = l.production_shifts?.shift_type;
                if (!date || !shiftType) return;
                const key = `${date}|${shiftType}`;
                if (!linesByDateShift[key]) {
                    linesByDateShift[key] = [];
                }
                linesByDateShift[key].push(l);
            });

            const dailyOpeningHours: Record<string, number> = {};
            Object.entries(linesByDateShift).forEach(([key, shiftLines]) => {
                const date = key.split('|')[0];
                const shiftHours = calculateShiftOpeningHours(shiftLines);
                dailyOpeningHours[date] = (dailyOpeningHours[date] || 0) + shiftHours;
            });

            const uniqueDates = Object.keys(dailyOpeningHours);
            const numDays = uniqueDates.length;

            let totalDailyRealOpeningHours = 0;
            uniqueDates.forEach(d => {
                totalDailyRealOpeningHours += dailyOpeningHours[d];
            });

            const totalOpeningHours = totalDailyRealOpeningHours;
            const shiftsByDateType: Record<string, any> = {};
            shifts.forEach((s: any) => {
                if (!s?.date || !s?.shift_type) return;
                const key = `${s.date}|${s.shift_type}`;
                shiftsByDateType[key] = s;
            });
            const totalTheoreticalOpeningHours = Object.values(shiftsByDateType).reduce((sum: number, s: any) => {
                const start = s.heure_debut_theorique || (s.shift_type === '20h-5h' ? '21:30' : '11:30');
                const end = s.heure_fin_theorique || (s.shift_type === '20h-5h' ? '05:30' : '20:30');
                return sum + calculateShiftHours(start, end);
            }, 0);
            const averageOpeningHoursPerDay = numDays > 0 ? totalDailyRealOpeningHours / numDays : 0;
            const periodTarget = totalOpeningHours > 0 ? (totalOpeningHours * 720) / 16 : 0;
            const performancePct = periodTarget > 0 ? (totalTonnage / periodTarget) * 100 : 0;

            setStats({
                totalTonnage,
                totalOpeningHours,
                totalTheoreticalOpeningHours,
                averageOpeningHoursPerDay,
                periodTarget,
                performancePct,
                shift1: {
                    tonnage: shifts.filter(s => s.shift_type === '10h-19h').reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0),
                    recharges: shift1Recharges,
                    consignes: shift1Consignes
                },
                shift2: {
                    tonnage: shifts.filter(s => s.shift_type === '20h-5h').reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0),
                    recharges: shift2Recharges,
                    consignes: shift2Consignes
                },
                lines: linesStats,
                maxLine,
                minLine,
                recharges: {
                    b6: { qty: r_b6, kg: calculateKg(r_b6, 6) },
                    b12: { qty: r_b12, kg: calculateKg(r_b12, 12.5) },
                    b28: { qty: r_b28, kg: calculateKg(r_b28, 28) },
                    b38: { qty: r_b38, kg: calculateKg(r_b38, 38) },
                    total: totalRecharges
                },
                consignes: {
                    b6: { qty: c_b6, kg: calculateKg(c_b6, 6) },
                    b12: { qty: c_b12, kg: calculateKg(c_b12, 12.5) },
                    b28: { qty: c_b28, kg: calculateKg(c_b28, 28) },
                    b38: { qty: c_b38, kg: calculateKg(c_b38, 38) },
                    total: totalConsignes
                },
                clients: {
                    petro: {
                        qty: cl_petro.total,
                        pct: globalClients > 0 ? (cl_petro.total / globalClients) * 100 : 0,
                        tonnage: petroTonnage,
                        b6: cl_petro.b6, b12: cl_petro.b12, b28: cl_petro.b28, b38: cl_petro.b38
                    },
                    vivo: {
                        qty: cl_vivo.total,
                        pct: globalClients > 0 ? (cl_vivo.total / globalClients) * 100 : 0,
                        tonnage: vivoTonnage,
                        b6: cl_vivo.b6, b12: cl_vivo.b12, b28: cl_vivo.b28, b38: cl_vivo.b38
                    },
                    total: {
                        qty: cl_total.total,
                        pct: globalClients > 0 ? (cl_total.total / globalClients) * 100 : 0,
                        tonnage: totalClientTonnage,
                        b6: cl_total.b6, b12: cl_total.b12, b28: cl_total.b28, b38: cl_total.b38
                    },
                    global: globalClients
                },
                dailyHistory: {}
            });
            setRawShifts(shifts);

        } catch (error) {
            console.error('Error fetching production stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            // Source unifiée : la table `agents` filtrée par rôle.
            const [quartsResult, lignesResult] = await Promise.all([
                supabase.from('agents').select('*').eq('role', 'chef_quart').order('nom'),
                supabase.from('agents').select('*').eq('role', 'chef_ligne').order('nom')
            ]);

            if (quartsResult.error) throw quartsResult.error;
            if (lignesResult.error) throw lignesResult.error;

            const quartsWithRole = (quartsResult.data || []).map(agent => ({ ...agent, role: 'chef_quart' }));
            const lignesWithRole = (lignesResult.data || []).map(agent => ({ ...agent, role: 'chef_ligne' }));

            const allAgentsList = [...quartsWithRole, ...lignesWithRole];
            setAllAgents(allAgentsList);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const fetchAllAgentsComparison = async () => {
        try {
            // Get all agents from unified `agents` table (filtered by role)
            const [quartsResult, lignesResult] = await Promise.all([
                supabase.from('agents').select('id, nom, prenom').eq('role', 'chef_quart'),
                supabase.from('agents').select('id, nom, prenom').eq('role', 'chef_ligne')
            ]);

            if (quartsResult.error) throw quartsResult.error;
            if (lignesResult.error) throw lignesResult.error;

            // Merge agents by ID
            const agentsMap = new Map();
            (quartsResult.data || []).forEach(a => agentsMap.set(a.id, a));
            (lignesResult.data || []).forEach(a => {
                if (!agentsMap.has(a.id)) agentsMap.set(a.id, a);
            });
            const uniqueAgents = Array.from(agentsMap.values());

            // For each agent, calculate stats
            const agentsWithStats = await Promise.all(
                uniqueAgents.map(async (agent) => {
                    // Query shifts as chef de quart
                    let shiftsQuery = supabase
                        .from('production_shifts')
                        .select('tonnage_total, temps_arret_total_minutes, heure_debut_reelle, heure_fin_reelle, arrets_production(*), lignes_production(*)')
                        .eq('chef_quart_id', agent.id);

                    // Query lignes as chef de ligne (including arrets for productivity calc)
                    let lignesQuery = supabase
                        .from('lignes_production')
                        .select('tonnage_ligne, numero_ligne, temps_arret_ligne_minutes, actif, heure_debut_reelle, heure_fin_reelle, production_shifts!inner(*)')
                        .eq('chef_ligne_id', agent.id);

                    // Apply filters
                    if (filterType === 'year') {
                        const startDate = `${selectedYear}-01-01`;
                        const endDate = `${selectedYear}-12-31`;
                        shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                        lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
                    } else if (filterType === 'month') {
                        const startDate = `${selectedMonth}-01`;
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                        shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                        lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
                    } else if (filterType === 'day' && selectedDate) {
                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                        shiftsQuery = shiftsQuery.eq('date', dateStr);
                        lignesQuery = lignesQuery.eq('production_shifts.date', dateStr);
                    } else if (filterType === 'period' && dateRange?.from) {
                        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                        shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                        lignesQuery = lignesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
                    }
                    // 'all' = pas de filtre

                    const [shiftsResult, lignesResult] = await Promise.all([shiftsQuery, lignesQuery]);
                    const shiftsData = shiftsResult.data || [];
                    const lignesData = lignesResult.data || [];

                    // 1. Tonnage
                    const shiftsTonnage = shiftsData.reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0);
                    const lignesTonnage = lignesData.reduce((sum, l) => sum + (Number(l.tonnage_ligne) || 0), 0);
                    const totalTonnage = shiftsTonnage + lignesTonnage;

                    // 2. Role
                    const countQuart = shiftsData.length;
                    const countLigne = lignesData.length;
                    let displayRole = null;
                    if (countQuart > 0 && countLigne === 0) displayRole = 'chef_quart';
                    else if (countQuart === 0 && countLigne > 0) displayRole = 'chef_ligne';
                    else if (countQuart > 0 && countLigne > 0) {
                        // Mixed roles - Always show for all period types
                        displayRole = 'both';
                    }

                    // 3. Productivity - Calculate per line, then average for Chef de Quart
                    // Use global ratio for ALL cases: Sum of real tonnages / Sum of theoretical tonnages
                    let productionTheoriqueTotal = 0;
                    let tonnageReelTotal = 0;

                    // For dual-role agents, calculate separate productivities
                    let productionTheoriqueQuart = 0;
                    let tonnageReelQuart = 0;
                    let productionTheoriqueLigne = 0;
                    let tonnageReelLigne = 0;

                    // A. Process shifts (Chef de Quart) - chaque ligne utilise SES
                    // propres heures (heure_debut_reelle / heure_fin_reelle) et est
                    // exclue si actif === false (via lineTheoreticalTonnes).
                    (shiftsData as any[]).forEach((s: any) => {
                        const shiftLines = s.lignes_production || [];

                        shiftLines.forEach((l: any) => {
                            const theorique = lineTheoreticalTonnes(l);
                            productionTheoriqueTotal += theorique;
                            productionTheoriqueQuart += theorique;
                        });

                        // Tonnage réel : on garde le tonnage_total du shift tel qu'il
                        // est saisi (les lignes inactives y contribuent à 0 par
                        // construction du formulaire).
                        const shiftTonnage = Number(s.tonnage_total) || 0;
                        tonnageReelTotal += shiftTonnage;
                        tonnageReelQuart += shiftTonnage;
                    });

                    // B. Process lignes (Chef de Ligne) - même logique : chaque ligne
                    // sur sa durée propre, lignes inactives exclues du tonnage.
                    (lignesData as any[]).forEach((l: any) => {
                        const theorique = lineTheoreticalTonnes(l);
                        productionTheoriqueTotal += theorique;
                        productionTheoriqueLigne += theorique;

                        const tonnage = l.actif === false ? 0 : Number(l.tonnage_ligne) || 0;
                        tonnageReelTotal += tonnage;
                        tonnageReelLigne += tonnage;
                    });

                    // Calculate final productivity using GLOBAL RATIO for all cases
                    let productivite = 0;
                    if (productionTheoriqueTotal > 0) {
                        // Unified formula: (Sum of real tonnages / Sum of theoretical tonnages) × 100
                        productivite = (tonnageReelTotal / productionTheoriqueTotal) * 100;
                    }

                    // Calculate separate productivities for dual-role agents
                    let productiviteQuart = 0;
                    let productiviteLigne = 0;
                    if (displayRole === 'both') {
                        productiviteQuart = productionTheoriqueQuart > 0
                            ? (tonnageReelQuart / productionTheoriqueQuart) * 100
                            : 0;
                        productiviteLigne = productionTheoriqueLigne > 0
                            ? (tonnageReelLigne / productionTheoriqueLigne) * 100
                            : 0;
                    }

                    // 4. Collect Lines (for Chef de Ligne)
                    const linesSet = new Set<string>();
                    (lignesData as any[]).forEach((l: any) => {
                        if (l.numero_ligne && l.production_shifts?.shift_type) {
                            const shiftLabel = l.production_shifts.shift_type === '10h-19h' ? 'Shift 1' :
                                l.production_shifts.shift_type === '20h-5h' ? 'Shift 2' : l.production_shifts.shift_type;
                            linesSet.add(`${shiftLabel} - L${l.numero_ligne}`);
                        } else if (l.numero_ligne) {
                            linesSet.add(`L${l.numero_ligne}`);
                        }
                    });
                    const lines = Array.from(linesSet).sort();

                    return {
                        id: agent.id,
                        nom: agent.nom,
                        prenom: agent.prenom,
                        tonnage: totalTonnage,
                        displayRole,
                        productivite,
                        lines,
                        // Dual-role specific properties
                        productiviteQuart: displayRole === 'both' ? productiviteQuart : undefined,
                        productiviteLigne: displayRole === 'both' ? productiviteLigne : undefined,
                        tonnageQuart: displayRole === 'both' ? tonnageReelQuart : undefined,
                        tonnageLigne: displayRole === 'both' ? tonnageReelLigne : undefined,
                        nombreShifts: shiftsData.length,
                        nombreLignes: lignesData.length
                    };
                })
            );

            const sorted = agentsWithStats.sort((a, b) => {
                // 0. Primary: Active agents (tonnage > 0) first, inactive at bottom
                const aActive = a.tonnage > 0 ? 0 : 1;
                const bActive = b.tonnage > 0 ? 0 : 1;
                if (aActive !== bActive) return aActive - bActive;

                // 1. Secondary Sort: Role Group (Chef de Quart > Rôles Doubles > Chef de Ligne > Others)
                const getRoleWeight = (role: string | null) => {
                    if (role === 'chef_quart') return 1;
                    if (role === 'both') return 2;
                    if (role === 'chef_ligne') return 3;
                    return 4;
                };

                const weightA = getRoleWeight(a.displayRole);
                const weightB = getRoleWeight(b.displayRole);

                if (weightA !== weightB) {
                    return weightA - weightB;
                }

                // 2. Tertiary Sort: Productivity % Descending (for active agents)
                if (a.tonnage > 0 && b.tonnage > 0) {
                    return b.productivite - a.productivite;
                }

                // 3. Fallback: Alphabetical by name for inactive agents
                return (a.nom || '').localeCompare(b.nom || '');
            });
            setAllAgentsComparison(sorted);

        } catch (error) {
            console.error('Error fetching agents comparison:', error);
        }
    };

    const fetchLineDetailedStats = async (lineNumber: number) => {
        try {
            // Determine period dates based on filter type
            let startDate, endDate;
            if (filterType === 'year') {
                startDate = `${selectedYear}-01-01`;
                endDate = `${selectedYear}-12-31`;
            } else if (filterType === 'month') {
                startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                endDate = new Date(y, m, 0).toISOString().split('T')[0];
            } else if (filterType === 'day' && selectedDate) {
                startDate = format(selectedDate, 'yyyy-MM-dd');
                endDate = startDate;
            } else if (filterType === 'period' && dateRange?.from) {
                startDate = format(dateRange.from, 'yyyy-MM-dd');
                endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate;
            } else {
                return null;
            }

            // Fetch all lignes_production for this line and period
            const { data: lignesData, error: lignesError } = await supabase
                .from('lignes_production')
                .select('*, production_shifts!inner(*, arrets_production(*))')
                .eq('numero_ligne', lineNumber)
                .gte('production_shifts.date', startDate)
                .lte('production_shifts.date', endDate);

            if (lignesError) {
                console.error('Error fetching lignes:', lignesError);
                throw lignesError;
            }

            const lignes = lignesData || [];

            // Helper function to calculate stats for a group of lignes
            const calculateShiftStats = (lignesList: any[]) => {
                if (lignesList.length === 0) return null;

                let totalTonnage = 0;
                let totalTempsArret = 0;
                let totalRecharges = 0;
                let totalConsignes = 0;
                let totalHeuresShift = 0;
                let totalTempsTheorique = 0;
                let arretsSecurite = 0;
                let arretsRessources = 0;
                let arretsPannes = 0;
                let arretsAutre = 0;
                const formatBreakdown: any = {};

                lignesList.forEach((ligne: any) => {
                    // Tonnage
                    totalTonnage += Number(ligne.tonnage_ligne) || 0;

                    // Temps d'arrêt
                    totalTempsArret += Number(ligne.temps_arret_ligne_minutes) || 0;

                    // Recharges and Consignes by format
                    if (lineNumber >= 1 && lineNumber <= 4) {
                        // B6 line
                        if (!formatBreakdown['B6']) {
                            formatBreakdown['B6'] = {
                                petro: { recharges: 0, consignes: 0 },
                                total: { recharges: 0, consignes: 0 },
                                vivo: { recharges: 0, consignes: 0 }
                            };
                        }
                        formatBreakdown['B6'].petro.recharges += (ligne.recharges_petro_b6 || 0);
                        formatBreakdown['B6'].petro.consignes += (ligne.consignes_petro_b6 || 0);
                        formatBreakdown['B6'].total.recharges += (ligne.recharges_total_b6 || 0);
                        formatBreakdown['B6'].total.consignes += (ligne.consignes_total_b6 || 0);
                        formatBreakdown['B6'].vivo.recharges += (ligne.recharges_vivo_b6 || 0);
                        formatBreakdown['B6'].vivo.consignes += (ligne.consignes_vivo_b6 || 0);

                        totalRecharges += (ligne.cumul_recharges_b6 || 0);
                        totalConsignes += (ligne.cumul_consignes_b6 || 0);
                    } else if (lineNumber === 5) {
                        // B12, B28, B38 line
                        ['B12', 'B28', 'B38'].forEach(fmt => {
                            if (!formatBreakdown[fmt]) {
                                formatBreakdown[fmt] = {
                                    petro: { recharges: 0, consignes: 0 },
                                    total: { recharges: 0, consignes: 0 },
                                    vivo: { recharges: 0, consignes: 0 }
                                };
                            }
                        });

                        // B12
                        formatBreakdown['B12'].petro.recharges += (ligne.recharges_petro_b12 || 0);
                        formatBreakdown['B12'].petro.consignes += (ligne.consignes_petro_b12 || 0);
                        formatBreakdown['B12'].total.recharges += (ligne.recharges_total_b12 || 0);
                        formatBreakdown['B12'].total.consignes += (ligne.consignes_total_b12 || 0);
                        formatBreakdown['B12'].vivo.recharges += (ligne.recharges_vivo_b12 || 0);
                        formatBreakdown['B12'].vivo.consignes += (ligne.consignes_vivo_b12 || 0);

                        // B28
                        formatBreakdown['B28'].petro.recharges += (ligne.recharges_petro_b28 || 0);
                        formatBreakdown['B28'].petro.consignes += (ligne.consignes_petro_b28 || 0);
                        formatBreakdown['B28'].total.recharges += (ligne.recharges_total_b28 || 0);
                        formatBreakdown['B28'].total.consignes += (ligne.consignes_total_b28 || 0);
                        formatBreakdown['B28'].vivo.recharges += (ligne.recharges_vivo_b28 || 0);
                        formatBreakdown['B28'].vivo.consignes += (ligne.consignes_vivo_b28 || 0);

                        // B38
                        formatBreakdown['B38'].petro.recharges += (ligne.recharges_petro_b38 || 0);
                        formatBreakdown['B38'].petro.consignes += (ligne.consignes_petro_b38 || 0);
                        formatBreakdown['B38'].total.recharges += (ligne.recharges_total_b38 || 0);
                        formatBreakdown['B38'].total.consignes += (ligne.consignes_total_b38 || 0);
                        formatBreakdown['B38'].vivo.recharges += (ligne.recharges_vivo_b38 || 0);
                        formatBreakdown['B38'].vivo.consignes += (ligne.consignes_vivo_b38 || 0);

                        totalRecharges += (ligne.cumul_recharges_b12 || 0) + (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_recharges_b38 || 0);
                        totalConsignes += (ligne.cumul_consignes_b12 || 0) + (ligne.cumul_consignes_b28 || 0) + (ligne.cumul_consignes_b38 || 0);
                    }

                    // Heures réelles de la ligne sur cette session
                    totalHeuresShift += calculateLigneHours(ligne);

                    // Temps Théorique
                    const shift = ligne.production_shifts;
                    if (ligne.actif !== false) {
                        const start = shift?.heure_debut_theorique || '11:30';
                        const end = shift?.heure_fin_theorique || (shift?.shift_type === '20h-5h' ? '05:30' : '20:30');
                        totalTempsTheorique += calculateShiftHours(start, end);
                    }

                    // Categorize downtime categories
                    const arrets = shift?.arrets_production || [];
                    const lineArrets = arrets.filter((a: any) => Number(a.numero_ligne) === lineNumber);
                    const tempsArretTotal = Number(ligne.temps_arret_ligne_minutes) || 0;
                    lineArrets.forEach((arret: any) => {
                        let duration = Number(arret.duree_minutes) || 0;
                        if (duration === 0 && tempsArretTotal > 0 && lineArrets.length > 0) {
                            duration = Math.round(tempsArretTotal / lineArrets.length);
                        }
                        const cat = categorizeArret(arret.type_arret);
                        if (cat === 'Sécurité') arretsSecurite += duration;
                        else if (cat === 'Ressources') arretsRessources += duration;
                        else if (cat === 'Pannes') arretsPannes += duration;
                        else arretsAutre += duration;
                    });
                });

                // Calculate theoretical production and productivity
                const maxDowntimeMinutes = totalHeuresShift * 60;
                const effectiveDowntime = Math.min(totalTempsArret, maxDowntimeMinutes);
                const heuresProductives = round2(Math.max(0, totalHeuresShift - (effectiveDowntime / 60)));

                let productionTheorique = 0;
                let bouteillesAttendu = 0;
                if (lineNumber >= 1 && lineNumber <= 4) {
                    productionTheorique = (1600 * 6 * heuresProductives) / 1000;
                    bouteillesAttendu = 1600 * heuresProductives;
                } else if (lineNumber === 5) {
                    productionTheorique = (900 * 12.5 * heuresProductives) / 1000;
                    bouteillesAttendu = 900 * heuresProductives;
                }

                const productivite = productionTheorique > 0 ? (totalTonnage / productionTheorique) * 100 : 0;

                return {
                    totalTonnage,
                    productionTheorique,
                    productivite,
                    totalHeuresShift,
                    heuresProductives,
                    totalTempsArret,
                    totalTempsTheorique,
                    arretsSecurite,
                    arretsRessources,
                    arretsPannes,
                    arretsAutre,
                    totalBouteilles: totalRecharges + totalConsignes,
                    bouteillesAttendu,
                    totalRecharges,
                    totalConsignes,
                    formatBreakdown
                };
            };

            // Split lignes by shift type
            const shift1Lignes = lignes.filter((l: any) => l.production_shifts?.shift_type === '10h-19h');
            const shift2Lignes = lignes.filter((l: any) => l.production_shifts?.shift_type === '20h-5h');

            // Calculate stats for each group
            const shift1Stats = calculateShiftStats(shift1Lignes);
            const shift2Stats = calculateShiftStats(shift2Lignes);
            const cumulStats = calculateShiftStats(lignes);

            // Format period display
            let periodeDisplay = '';
            if (filterType === 'year') {
                periodeDisplay = `Année ${selectedYear}`;
            } else if (filterType === 'month') {
                periodeDisplay = format(new Date(selectedMonth), 'MMMM yyyy', { locale: fr });
            } else if (filterType === 'day' && selectedDate) {
                periodeDisplay = format(selectedDate, 'dd MMMM yyyy', { locale: fr });
            } else if (filterType === 'period' && dateRange?.from) {
                const from = format(dateRange.from, 'dd MMM', { locale: fr });
                const to = dateRange.to ? format(dateRange.to, 'dd MMM yyyy', { locale: fr }) : from;
                periodeDisplay = `${from} - ${to}`;
            }

            return {
                lineNumber,
                periodeDisplay,
                shift1: shift1Stats,
                shift2: shift2Stats,
                cumul: cumulStats
            };
        } catch (error) {
            console.error('=== ERROR FETCHING LINE DETAILS ===', error);
            return null;
        }
    };

    const fetchAgentDetailedStats = async (agentId: string) => {
        try {
            // Helper to build queries
            const buildQueries = (start: string, end: string) => {
                let shiftsQuery = supabase
                    .from('production_shifts')
                    .select('*, lignes_production(*), arrets_production(*)')
                    .eq('chef_quart_id', agentId)
                    .gte('date', start)
                    .lte('date', end);

                let lignesQuery = supabase
                    .from('lignes_production')
                    .select('*, production_shifts!inner(*)')
                    .eq('chef_ligne_id', agentId)
                    .gte('production_shifts.date', start)
                    .lte('production_shifts.date', end);

                return [shiftsQuery, lignesQuery];
            };

            // Determine current period dates
            let startDate, endDate;
            if (filterType === 'year') {
                startDate = `${selectedYear}-01-01`;
                endDate = `${selectedYear}-12-31`;
            } else if (filterType === 'month') {
                startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                endDate = new Date(y, m, 0).toISOString().split('T')[0];
            } else if (filterType === 'day' && selectedDate) {
                startDate = format(selectedDate, 'yyyy-MM-dd');
                endDate = startDate;
            } else if (filterType === 'period' && dateRange?.from) {
                startDate = format(dateRange.from, 'yyyy-MM-dd');
                endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate;
            } else {
                return null; // 'all' ou autres cas non supportés
            }

            // Determine previous period dates for trend calculation
            let prevStartDate, prevEndDate;
            const startD = new Date(startDate);
            const endD = new Date(endDate);

            if (filterType === 'year') {
                const prevYear = selectedYear - 1;
                prevStartDate = `${prevYear}-01-01`;
                prevEndDate = `${prevYear}-12-31`;
            } else if (filterType === 'month') {
                const prevMonthDate = new Date(startD);
                prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                const prevY = prevMonthDate.getFullYear();
                const prevM = prevMonthDate.getMonth() + 1;
                prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
                prevEndDate = new Date(prevY, prevM, 0).toISOString().split('T')[0];
            } else if (filterType === 'day' && selectedDate) {
                // Previous day
                const prevDate = new Date(selectedDate);
                prevDate.setDate(prevDate.getDate() - 1);
                prevStartDate = format(prevDate, 'yyyy-MM-dd');
                prevEndDate = prevStartDate;
            } else if (filterType === 'period' && dateRange?.from) {
                // For period, shift back by duration
                const durationMs = endD.getTime() - startD.getTime();
                const diffDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1;

                const pStart = new Date(startD);
                pStart.setDate(pStart.getDate() - diffDays);
                const pEnd = new Date(endD);
                pEnd.setDate(pEnd.getDate() - diffDays);

                prevStartDate = pStart.toISOString().split('T')[0];
                prevEndDate = pEnd.toISOString().split('T')[0];
            }

            // Fetch Current Period
            const [shiftsQuery, lignesQuery] = buildQueries(startDate, endDate);
            const [shiftsResult, lignesResult] = await Promise.all([shiftsQuery, lignesQuery]);

            if (shiftsResult.error) throw shiftsResult.error;
            if (lignesResult.error) throw lignesResult.error;

            // Fetch Previous Period (for trend)
            const [prevShiftsQuery, prevLignesQuery] = buildQueries(prevStartDate, prevEndDate);
            const [prevShiftsResult, prevLignesResult] = await Promise.all([prevShiftsQuery, prevLignesQuery]);

            const shifts = shiftsResult.data || [];
            const lignes = lignesResult.data || [];

            // Combine stats from both roles
            let totalTonnage = 0;
            let totalBouteilles = 0;
            let totalRecharges = 0;
            let totalConsignes = 0;
            let totalEffectif = 0;
            let totalTempsArret = 0;
            let tempsArretLigneRole = 0; // Arrêts uniquement pour le rôle Chef de Ligne (à déduire du temps travaillé)

            // Daily history for heatmap
            const dailyHistory: Record<string, { tonnage: number; tauxPerformance: number }> = {};

            // Stats from chef de quart role
            shifts.forEach(shift => {
                const date = shift.date;
                const shiftTonnage = Number(shift.tonnage_total) || 0;

                totalTonnage += shiftTonnage;
                totalBouteilles += Number(shift.bouteilles_produites) || 0;

                // Add to daily history
                if (!dailyHistory[date]) {
                    dailyHistory[date] = { tonnage: 0, tauxPerformance: 0 };
                }
                dailyHistory[date].tonnage += shiftTonnage;

                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    totalRecharges += (l.cumul_recharges_b6 || 0) + (l.cumul_recharges_b12 || 0) +
                        (l.cumul_recharges_b28 || 0) + (l.cumul_recharges_b38 || 0);
                    totalConsignes += (l.cumul_consignes_b6 || 0) + (l.cumul_consignes_b12 || 0) +
                        (l.cumul_consignes_b28 || 0) + (l.cumul_consignes_b38 || 0);
                });

                totalEffectif += (shift.chariste || 0) + (shift.chariot || 0) +
                    (shift.agent_quai || 0) + (shift.agent_saisie || 0) + (shift.agent_atelier || 0);

                // Use temps_arret_total_minutes from shift if available (more reliable)
                if (shift.temps_arret_total_minutes && shift.temps_arret_total_minutes > 0) {
                    totalTempsArret += shift.temps_arret_total_minutes;
                } else {
                    // Fallback: calculate from individual arrets
                    const arrets = shift.arrets_production || [];
                    arrets.forEach((a: any) => {
                        if (a.duree_minutes && a.duree_minutes > 0) {
                            totalTempsArret += a.duree_minutes;
                        } else if (a.heure_debut && a.heure_fin) {
                            const [hD, mD] = a.heure_debut.split(':').map(Number);
                            const [hF, mF] = a.heure_fin.split(':').map(Number);
                            let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                            if (diffMins < 0) diffMins += 24 * 60;
                            totalTempsArret += diffMins;
                        }
                    });
                }
            });

            // Stats from chef de ligne role
            lignes.forEach(l => {
                const date = l.production_shifts?.date;
                const ligneTonnage = Number(l.tonnage_ligne) || 0;

                totalTonnage += ligneTonnage;

                // Add to daily history
                if (date) {
                    if (!dailyHistory[date]) {
                        dailyHistory[date] = { tonnage: 0, tauxPerformance: 0 };
                    }
                    dailyHistory[date].tonnage += ligneTonnage;
                }

                totalRecharges += (l.cumul_recharges_b6 || 0) + (l.cumul_recharges_b12 || 0) +
                    (l.cumul_recharges_b28 || 0) + (l.cumul_recharges_b38 || 0);
                totalConsignes += (l.cumul_consignes_b6 || 0) + (l.cumul_consignes_b12 || 0) +
                    (l.cumul_consignes_b28 || 0) + (l.cumul_consignes_b38 || 0);
                totalEffectif += l.nombre_agents || 0;

                // Temps d'arrêt is now stored directly in lignes_production
                const ligneTempsArret = Number(l.temps_arret_ligne_minutes) || 0;
                totalTempsArret += ligneTempsArret;
                tempsArretLigneRole += ligneTempsArret; // Chef de Ligne: arrêt de SA ligne (à déduire)
            });

            console.log('=== TOTAL TEMPS ARRET (shifts + lignes) ===', totalTempsArret);
            console.log('=== TEMPS ARRET LIGNE ROLE (à déduire) ===', tempsArretLigneRole);

            totalBouteilles = totalRecharges + totalConsignes;

            const nombreShifts = shifts.length;
            const nombreLignes = lignes.length;
            const totalSessions = nombreShifts + nombreLignes;

            // Get unique lines occupied as chef de ligne
            const lignesOccupees = Array.from(new Set(lignes.map(l => l.numero_ligne))).sort();

            // NEW: Calculate productivity using GLOBAL RATIO (same as main list)
            // Sum of real tonnages / Sum of theoretical tonnages
            let productionTheoriqueTotal = 0;
            let tonnageReelTotal = 0;

            // For dual-role agents: separate calculations
            let productionTheoriqueQuart = 0;
            let tonnageReelQuart = 0;
            let productionTheoriqueLigne = 0;
            let tonnageReelLigne = 0;

            // Calculate productivity for each Chef de Quart shift — utilise
            // lineTheoreticalTonnes pour rester aligné avec la liste agents :
            // chaque ligne sur SES propres heures, lignes inactives exclues.
            shifts.forEach(shift => {
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    const theorique = lineTheoreticalTonnes(l);
                    productionTheoriqueTotal += theorique;
                    productionTheoriqueQuart += theorique;
                });
                const shiftTonnage = Number(shift.tonnage_total) || 0;
                tonnageReelTotal += shiftTonnage;
                tonnageReelQuart += shiftTonnage;
            });

            // Calculate productivity for each Chef de Ligne session
            lignes.forEach(ligne => {
                const theorique = lineTheoreticalTonnes(ligne);
                productionTheoriqueTotal += theorique;
                productionTheoriqueLigne += theorique;

                const tonnage = ligne.actif === false ? 0 : Number(ligne.tonnage_ligne) || 0;
                tonnageReelTotal += tonnage;
                tonnageReelLigne += tonnage;
            });

            // Calculate GLOBAL RATIO productivity (same formula as main list)
            const tauxPerformance = productionTheoriqueTotal > 0
                ? (tonnageReelTotal / productionTheoriqueTotal) * 100
                : 0;

            // Calculate separated productivities for dual-role agents
            const productiviteQuart = productionTheoriqueQuart > 0
                ? (tonnageReelQuart / productionTheoriqueQuart) * 100
                : 0;
            const productiviteLigne = productionTheoriqueLigne > 0
                ? (tonnageReelLigne / productionTheoriqueLigne) * 100
                : 0;

            // Determine if agent has dual role
            const isDualRole = nombreShifts > 0 && nombreLignes > 0;

            // Calculate ACTUAL performance for each day in daily history using GLOBAL RATIO
            Object.keys(dailyHistory).forEach(date => {
                let dayTheoriqueTotal = 0;
                let dayReelTotal = 0;

                // Get data from shifts on this date
                shifts.forEach(shift => {
                    if (shift.date === date) {
                        const shiftTonnage = Number(shift.tonnage_total) || 0;

                        // Use real shift hours
                        const shiftHours = calculateShiftHours(
                            shift.heure_debut_reelle || '10:00',
                            shift.heure_fin_reelle || '19:00'
                        );

                        const shiftLignes = shift.lignes_production || [];
                        shiftLignes.forEach((l: any) => {
                            const ligneTempsArret = Number(l.temps_arret_ligne_minutes) || 0;
                            const maxDowntimeMinutes = shiftHours * 60;
                            const effectiveDowntime = Math.min(ligneTempsArret, maxDowntimeMinutes);
                            const heuresProductives = shiftHours - (effectiveDowntime / 60);

                            const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                            dayTheoriqueTotal += (rate * heuresProductives) / 1000;
                        });

                        dayReelTotal += shiftTonnage;
                    }
                });

                // Get data from lignes on this date
                lignes.forEach(ligne => {
                    if (ligne.production_shifts?.date === date) {
                        const ligneTonnage = Number(ligne.tonnage_ligne) || 0;
                        const shift = ligne.production_shifts;

                        // Use real shift hours from associated shift
                        const shiftHours = shift ? calculateShiftHours(
                            shift.heure_debut_reelle || '10:00',
                            shift.heure_fin_reelle || '19:00'
                        ) : 9;

                        // Temps d'arrêt is now stored directly in lignes_production
                        const ligneTempsArret = Number(ligne.temps_arret_ligne_minutes) || 0;
                        const maxDowntimeMinutes = shiftHours * 60;
                        const effectiveDowntime = Math.min(ligneTempsArret, maxDowntimeMinutes);
                        const heuresProductives = shiftHours - (effectiveDowntime / 60);

                        const rate = (ligne.numero_ligne >= 1 && ligne.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                        dayTheoriqueTotal += (rate * heuresProductives) / 1000;
                        dayReelTotal += ligneTonnage;
                    }
                });

                // Calculate GLOBAL RATIO productivity for this day
                const dayPerf = dayTheoriqueTotal > 0
                    ? (dayReelTotal / dayTheoriqueTotal) * 100
                    : 0;

                dailyHistory[date].tauxPerformance = dayPerf;
            });

            // NEW: Client Breakdown (Recharges + Consignes per client)
            const clientBreakdown = {
                petro: { recharges: 0, consignes: 0, total: 0, tonnage: 0 },
                vivo: { recharges: 0, consignes: 0, total: 0, tonnage: 0 },
                total: { recharges: 0, consignes: 0, total: 0, tonnage: 0 }
            };

            // From lignes (Chef de Ligne)
            lignes.forEach(l => {
                clientBreakdown.petro.recharges += (l.recharges_petro_b6 || 0) + (l.recharges_petro_b12 || 0) +
                    (l.recharges_petro_b28 || 0) + (l.recharges_petro_b38 || 0);
                clientBreakdown.petro.consignes += (l.consignes_petro_b6 || 0) + (l.consignes_petro_b12 || 0) +
                    (l.consignes_petro_b28 || 0) + (l.consignes_petro_b38 || 0);

                clientBreakdown.vivo.recharges += (l.recharges_vivo_b6 || 0) + (l.recharges_vivo_b12 || 0) +
                    (l.recharges_vivo_b28 || 0) + (l.recharges_vivo_b38 || 0);
                clientBreakdown.vivo.consignes += (l.consignes_vivo_b6 || 0) + (l.consignes_vivo_b12 || 0) +
                    (l.consignes_vivo_b28 || 0) + (l.consignes_vivo_b38 || 0);

                clientBreakdown.total.recharges += (l.recharges_total_b6 || 0) + (l.recharges_total_b12 || 0) +
                    (l.recharges_total_b28 || 0) + (l.recharges_total_b38 || 0);
                clientBreakdown.total.consignes += (l.consignes_total_b6 || 0) + (l.consignes_total_b12 || 0) +
                    (l.consignes_total_b28 || 0) + (l.consignes_total_b38 || 0);

                // Tonnages
                clientBreakdown.petro.tonnage +=
                    ((l.recharges_petro_b6 || 0) + (l.consignes_petro_b6 || 0)) * 6 +
                    ((l.recharges_petro_b12 || 0) + (l.consignes_petro_b12 || 0)) * 12.5 +
                    ((l.recharges_petro_b28 || 0) + (l.consignes_petro_b28 || 0)) * 28 +
                    ((l.recharges_petro_b38 || 0) + (l.consignes_petro_b38 || 0)) * 38;

                clientBreakdown.vivo.tonnage +=
                    ((l.recharges_vivo_b6 || 0) + (l.consignes_vivo_b6 || 0)) * 6 +
                    ((l.recharges_vivo_b12 || 0) + (l.consignes_vivo_b12 || 0)) * 12.5 +
                    ((l.recharges_vivo_b28 || 0) + (l.consignes_vivo_b28 || 0)) * 28 +
                    ((l.recharges_vivo_b38 || 0) + (l.consignes_vivo_b38 || 0)) * 38;

                clientBreakdown.total.tonnage +=
                    ((l.recharges_total_b6 || 0) + (l.consignes_total_b6 || 0)) * 6 +
                    ((l.recharges_total_b12 || 0) + (l.consignes_total_b12 || 0)) * 12.5 +
                    ((l.recharges_total_b28 || 0) + (l.consignes_total_b28 || 0)) * 28 +
                    ((l.recharges_total_b38 || 0) + (l.consignes_total_b38 || 0)) * 38;
            });

            // From shifts (Chef de Quart - aggregate from lignes_production)
            shifts.forEach(shift => {
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    clientBreakdown.petro.recharges += (l.recharges_petro_b6 || 0) + (l.recharges_petro_b12 || 0) +
                        (l.recharges_petro_b28 || 0) + (l.recharges_petro_b38 || 0);
                    clientBreakdown.petro.consignes += (l.consignes_petro_b6 || 0) + (l.consignes_petro_b12 || 0) +
                        (l.consignes_petro_b28 || 0) + (l.consignes_petro_b38 || 0);

                    clientBreakdown.vivo.recharges += (l.recharges_vivo_b6 || 0) + (l.recharges_vivo_b12 || 0) +
                        (l.recharges_vivo_b28 || 0) + (l.recharges_vivo_b38 || 0);
                    clientBreakdown.vivo.consignes += (l.consignes_vivo_b6 || 0) + (l.consignes_vivo_b12 || 0) +
                        (l.consignes_vivo_b28 || 0) + (l.consignes_vivo_b38 || 0);

                    clientBreakdown.total.recharges += (l.recharges_total_b6 || 0) + (l.recharges_total_b12 || 0) +
                        (l.recharges_total_b28 || 0) + (l.recharges_total_b38 || 0);
                    clientBreakdown.total.consignes += (l.consignes_total_b6 || 0) + (l.consignes_total_b12 || 0) +
                        (l.consignes_total_b28 || 0) + (l.consignes_total_b38 || 0);

                    // Tonnages
                    clientBreakdown.petro.tonnage +=
                        ((l.recharges_petro_b6 || 0) + (l.consignes_petro_b6 || 0)) * 6 +
                        ((l.recharges_petro_b12 || 0) + (l.consignes_petro_b12 || 0)) * 12.5 +
                        ((l.recharges_petro_b28 || 0) + (l.consignes_petro_b28 || 0)) * 28 +
                        ((l.recharges_petro_b38 || 0) + (l.consignes_petro_b38 || 0)) * 38;

                    clientBreakdown.vivo.tonnage +=
                        ((l.recharges_vivo_b6 || 0) + (l.consignes_vivo_b6 || 0)) * 6 +
                        ((l.recharges_vivo_b12 || 0) + (l.consignes_vivo_b12 || 0)) * 12.5 +
                        ((l.recharges_vivo_b28 || 0) + (l.consignes_vivo_b28 || 0)) * 28 +
                        ((l.recharges_vivo_b38 || 0) + (l.consignes_vivo_b38 || 0)) * 38;

                    clientBreakdown.total.tonnage +=
                        ((l.recharges_total_b6 || 0) + (l.consignes_total_b6 || 0)) * 6 +
                        ((l.recharges_total_b12 || 0) + (l.consignes_total_b12 || 0)) * 12.5 +
                        ((l.recharges_total_b28 || 0) + (l.consignes_total_b28 || 0)) * 28 +
                        ((l.recharges_total_b38 || 0) + (l.consignes_total_b38 || 0)) * 38;
                });
            });

            // Calculate totals
            clientBreakdown.petro.total = clientBreakdown.petro.recharges + clientBreakdown.petro.consignes;
            clientBreakdown.vivo.total = clientBreakdown.vivo.recharges + clientBreakdown.vivo.consignes;
            clientBreakdown.total.total = clientBreakdown.total.recharges + clientBreakdown.total.consignes;

            // NEW: Downtime per Line
            const downtimeByLine: Record<number, number> = {}; // Line number -> minutes

            // Helper function to calculate arret duration
            const getArretDuration = (arret: any): number => {
                if (arret.duree_minutes && arret.duree_minutes > 0) {
                    return arret.duree_minutes;
                } else if (arret.heure_debut && arret.heure_fin) {
                    const [hD, mD] = arret.heure_debut.split(':').map(Number);
                    const [hF, mF] = arret.heure_fin.split(':').map(Number);
                    let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                    if (diffMins < 0) diffMins += 24 * 60; // Handle overnight
                    return diffMins;
                }
                return 0;
            };

            // From shifts (Chef de Quart - temps d'arrêt stocké dans lignes_production)
            shifts.forEach(shift => {
                const shiftLines = shift.lignes_production || [];
                shiftLines.forEach((ligne: any) => {
                    const duration = Number(ligne.temps_arret_ligne_minutes) || 0;
                    if (duration > 0) {
                        downtimeByLine[ligne.numero_ligne] = (downtimeByLine[ligne.numero_ligne] || 0) + duration;
                    }
                });
            });

            // From lignes (Chef de Ligne - temps d'arrêt is stored directly)
            lignes.forEach(ligne => {
                const duration = Number(ligne.temps_arret_ligne_minutes) || 0;
                if (duration > 0) {
                    downtimeByLine[ligne.numero_ligne] = (downtimeByLine[ligne.numero_ligne] || 0) + duration;
                }
            });

            // NEW: Daily Productivity Array (sorted by date)
            const dailyProductivity = Object.entries(dailyHistory)
                .map(([date, data]) => ({
                    date,
                    productivite: data.tauxPerformance
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Taux de Présence — modèle hybride par rôle :
            // - Chef de Quart : présent tout le shift (peu importe l'état des lignes)
            //   → expectedHours += durée totale du shift.
            // - Chef de Ligne : présent quand SA ligne tourne (= heures propres de
            //   la ligne, 0 si la ligne est marquée Inactive)
            //   → expectedHours += calculateLigneHours(l).
            let expectedHours = 0;

            shifts.forEach(shift => {
                expectedHours += calculateShiftHours(
                    shift.heure_debut_reelle || '10:00',
                    shift.heure_fin_reelle || '19:00'
                );
            });

            lignes.forEach(ligne => {
                expectedHours += calculateLigneHours(ligne);
            });

            const downtimeHours = totalTempsArret / 60; // Convert minutes to hours (pour affichage)
            const downtimeHoursLigneRole = tempsArretLigneRole / 60; // Arrêts à déduire (Chef de Ligne seulement)

            // Temps travaillé:
            // - Chef de Quart: pas de déduction (il travaille sur autres lignes pendant les arrêts)
            // - Chef de Ligne: déduire l'arrêt de SA ligne (il arrête quand sa ligne arrête)
            const actualHours = expectedHours - downtimeHoursLigneRole;
            const tauxPresence = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;

            // Calculate Trend
            const prevShifts = prevShiftsResult.data || [];
            const prevLignes = prevLignesResult.data || [];
            const prevTonnage = prevShifts.reduce((sum: number, s: any) => sum + (Number(s.tonnage_total) || 0), 0) +
                prevLignes.reduce((sum: number, l: any) => sum + (Number(l.tonnage_ligne) || 0), 0);

            const tonnageTrend = prevTonnage > 0 ? ((totalTonnage - prevTonnage) / prevTonnage) * 100 : 0;

            // ===== NEW CALCULATIONS FOR MODAL IMPROVEMENTS =====

            // 1. Weekly Data (current calendar week: Mon-Sun)
            const now = new Date();
            const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Get to Monday
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + mondayOffset);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Sunday
            weekEnd.setHours(23, 59, 59, 999);

            const weeklyData = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + index);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = dailyHistory[dateStr];
                return {
                    day,
                    date: dateStr,
                    tonnage: dayData ? dayData.tonnage * 1000 : 0, // Convert to Kg
                    productivite: dayData ? dayData.tauxPerformance : 0
                };
            });

            // 2. Last 3 Months Data
            const getMonthData = async (monthOffset: number) => {
                const targetDate = new Date(now);
                targetDate.setMonth(now.getMonth() - monthOffset);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth() + 1;
                const monthStr = `${year}-${String(month).padStart(2, '0')}`;
                const monthStart = `${monthStr}-01`;
                const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];

                const [mShiftsQuery, mLignesQuery] = buildQueries(monthStart, monthEnd);
                const [mShiftsResult, mLignesResult] = await Promise.all([mShiftsQuery, mLignesQuery]);

                const mShifts = mShiftsResult.data || [];
                const mLignes = mLignesResult.data || [];
                const monthTonnage = mShifts.reduce((sum: number, s: any) => sum + (Number(s.tonnage_total) || 0), 0) +
                    mLignes.reduce((sum: number, l: any) => sum + (Number(l.tonnage_ligne) || 0), 0);

                return {
                    month: targetDate.toLocaleDateString('fr-FR', { month: 'short' }),
                    tonnage: monthTonnage
                };
            };

            const last3Months = await Promise.all([
                getMonthData(2),
                getMonthData(1),
                getMonthData(0)
            ]);

            // 3. Best/Worst Day of the Month
            const daysWithData = Object.entries(dailyHistory)
                .filter(([date]) => {
                    const d = new Date(date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .map(([date, data]) => ({
                    date,
                    tonnage: data.tonnage * 1000, // Convert to Kg
                    productivite: data.tauxPerformance
                }));

            const bestDay = daysWithData.length > 0
                ? daysWithData.reduce((best, current) => current.tonnage > best.tonnage ? current : best)
                : null;

            const worstDay = daysWithData.length > 0
                ? daysWithData.reduce((worst, current) => current.tonnage < worst.tonnage ? current : worst)
                : null;

            // 4. Breakdown by Shift
            const shiftBreakdown = [
                {
                    shift: 'Shift 1',
                    sessions: shifts.filter((s: any) => s.shift_type === 1).length,
                    tonnage: shifts.filter((s: any) => s.shift_type === 1).reduce((sum: number, s: any) => sum + (Number(s.tonnage_total) || 0), 0)
                },
                {
                    shift: 'Shift 2',
                    sessions: shifts.filter((s: any) => s.shift_type === 2).length,
                    tonnage: shifts.filter((s: any) => s.shift_type === 2).reduce((sum: number, s: any) => sum + (Number(s.tonnage_total) || 0), 0)
                }
            ].filter(s => s.sessions > 0); // Only include shifts with data

            // 5. Breakdown by Line
            const lineBreakdown: Record<number, { sessions: number; tonnage: number }> = {};

            // From shifts (chef de quart manages all lines)
            shifts.forEach((shift: any) => {
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    const lineNum = l.numero_ligne;
                    if (!lineBreakdown[lineNum]) {
                        lineBreakdown[lineNum] = { sessions: 0, tonnage: 0 };
                    }
                    lineBreakdown[lineNum].sessions += 1;
                    lineBreakdown[lineNum].tonnage += Number(l.tonnage_ligne) || 0;
                });
            });

            // From lignes (chef de ligne manages specific lines)
            lignes.forEach((l: any) => {
                const lineNum = l.numero_ligne;
                if (!lineBreakdown[lineNum]) {
                    lineBreakdown[lineNum] = { sessions: 0, tonnage: 0 };
                }
                lineBreakdown[lineNum].sessions += 1;
                lineBreakdown[lineNum].tonnage += Number(l.tonnage_ligne) || 0;
            });

            const lineBreakdownArray = Object.entries(lineBreakdown)
                .map(([line, data]) => ({
                    ligne: `Ligne ${line}`,
                    sessions: data.sessions,
                    tonnage: data.tonnage
                }))
                .sort((a, b) => b.tonnage - a.tonnage); // Sort by tonnage descending

            // Calculer le tonnage et les bouteilles attendus (production théorique)
            // — aligné sur la logique de "Productivité par agent" : chaque ligne
            // utilise SES propres heures, les lignes inactives sont exclues.
            let tonnageAttendu = 0;
            let bouteillesAttendues = 0;

            // Pour les shifts (Chef de Quart)
            shifts.forEach(shift => {
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    tonnageAttendu += lineTheoreticalTonnes(l);
                    bouteillesAttendues += lineExpectedBottles(l);
                });
            });

            // Pour les lignes (Chef de Ligne)
            lignes.forEach(ligne => {
                tonnageAttendu += lineTheoreticalTonnes(ligne);
                bouteillesAttendues += lineExpectedBottles(ligne);
            });

            // Liste des shifts travaillés avec les lignes
            const shiftsWithLines: Record<string, Set<number>> = {};

            shifts.forEach(s => {
                const shiftLabel = s.shift_type === '10h-19h' ? 'Shift 1' : s.shift_type === '20h-5h' ? 'Shift 2' : s.shift_type;
                if (!shiftsWithLines[shiftLabel]) {
                    shiftsWithLines[shiftLabel] = new Set<number>();
                }
                // Pour chef de quart, on collecte toutes les lignes du shift
                const shiftLignes = s.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    shiftsWithLines[shiftLabel].add(l.numero_ligne);
                });
            });

            lignes.forEach(l => {
                if (l.production_shifts?.shift_type) {
                    const shiftLabel = l.production_shifts.shift_type === '10h-19h' ? 'Shift 1' : l.production_shifts.shift_type === '20h-5h' ? 'Shift 2' : l.production_shifts.shift_type;
                    if (!shiftsWithLines[shiftLabel]) {
                        shiftsWithLines[shiftLabel] = new Set<number>();
                    }
                    shiftsWithLines[shiftLabel].add(l.numero_ligne);
                }
            });

            const shiftsList = Object.entries(shiftsWithLines)
                .map(([shift, lignesSet]) => ({
                    shift,
                    lignes: Array.from(lignesSet).sort((a, b) => a - b)
                }))
                .sort((a, b) => a.shift.localeCompare(b.shift));

            // Return data for modal
            return {
                tonnage: totalTonnage,
                bouteilles: totalBouteilles,
                recharges: totalRecharges,
                consignes: totalConsignes,
                nombreShifts,
                nombreLignes,
                effectifTotal: totalEffectif,
                tempsArretMinutes: totalTempsArret,
                tauxPerformance,
                lignesOccupees,
                dailyHistory,
                trend: tonnageTrend,
                prevTonnage,
                // New data for advanced cards
                clientBreakdown,
                downtimeByLine,
                dailyProductivity,
                tauxPresence,
                expectedHours,
                actualHours,
                weeklyData,
                last3Months,
                bestDay,
                worstDay,
                shiftBreakdown,
                lineBreakdown: lineBreakdownArray,
                tonnageAttendu,
                bouteillesAttendues,
                shiftsList,
                // Dual-role specific data
                isDualRole,
                productiviteQuart,
                productiviteLigne,
                tonnageQuart: tonnageReelQuart,
                tonnageLigne: tonnageReelLigne
            };

        } catch (error) {
            console.error('Error fetching agent detailed stats:', error);
            return null;
        }
    };



    const exportDashboardToExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Styling Constants
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                fill: { fgColor: { rgb: "EA580C" } }, // orange-600
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };

            const subHeaderStyle = {
                font: { bold: true, color: { rgb: "000000" } },
                fill: { fgColor: { rgb: "FFEDD5" } }, // orange-100
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };

            const cellStyle = {
                alignment: { horizontal: "center" },
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };

            const titleStyle = {
                font: { bold: true, sz: 16, color: { rgb: "EA580C" } },
                alignment: { horizontal: "center" }
            };

            // Helper to apply style to a range
            const applyStyle = (ws: any, range: { s: { r: number, c: number }, e: { r: number, c: number } }, style: any) => {
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' }; // Ensure cell exists
                        ws[cellAddress].s = style;
                    }
                }
            };

            // --- SHEET 1: VUE GLOBALE ---
            const globalData = [
                ['RAPPORT CENTRE EMPLISSEUR', '', '', '', '', '', ''],
                ['Date générée:', new Date().toLocaleString('fr-FR'), '', '', '', '', ''],
                ['Période:', filterType === 'all' ? 'Toutes périodes' : filterType === 'year' ? selectedYear.toString() : filterType === 'month' ? selectedMonth : filterType === 'day' ? (selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '-') : (dateRange?.from ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}` : '-'), '', '', '', '', ''],
                ['', '', '', '', '', '', ''],
                ['PRODUCTION TOTALE', '', '', '', '', '', ''],
                ['Volume Total (Kg)', stats.totalTonnage * 1000, '', '', '', '', ''],
                ['', '', '', '', '', '', ''],
                ['SHIFTS', 'Tonnage (Kg)', 'Recharges', 'Consignes', '', '', ''],
                ['Shift 1', stats.shift1.tonnage * 1000, stats.shift1.recharges, stats.shift1.consignes, '', '', ''],
                ['Shift 2', stats.shift2.tonnage * 1000, stats.shift2.recharges, stats.shift2.consignes, '', '', ''],
                ['', '', '', '', '', '', ''],
                ['CLIENTS', 'Tonnage (Kg)', 'Part (%)', 'B6', 'B12', 'B28', 'B38'],
                ['Petro Ivoire', stats.clients.petro.tonnage, stats.clients.petro.pct, stats.clients.petro.b6, stats.clients.petro.b12, stats.clients.petro.b28, stats.clients.petro.b38],
                ['Vivo Energies', stats.clients.vivo.tonnage, stats.clients.vivo.pct, stats.clients.vivo.b6, stats.clients.vivo.b12, stats.clients.vivo.b28, stats.clients.vivo.b38],
                ['Total Energies', stats.clients.total.tonnage, stats.clients.total.pct, stats.clients.total.b6, stats.clients.total.b12, stats.clients.total.b28, stats.clients.total.b38],
            ];

            const wsGlobal = XLSX.utils.aoa_to_sheet(globalData);
            wsGlobal['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

            // Apply Styles to Global Sheet
            // Title
            wsGlobal['A1'].s = titleStyle;
            wsGlobal['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]; // Merge title

            // Section Headers
            applyStyle(wsGlobal, { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }, subHeaderStyle); // Production Totale
            applyStyle(wsGlobal, { s: { r: 7, c: 0 }, e: { r: 7, c: 6 } }, headerStyle); // Shifts Header
            applyStyle(wsGlobal, { s: { r: 11, c: 0 }, e: { r: 11, c: 6 } }, headerStyle); // Clients Header

            // Data Borders
            applyStyle(wsGlobal, { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, cellStyle); // Vol Total
            applyStyle(wsGlobal, { s: { r: 8, c: 0 }, e: { r: 9, c: 3 } }, cellStyle); // Shifts Data
            applyStyle(wsGlobal, { s: { r: 12, c: 0 }, e: { r: 14, c: 6 } }, cellStyle); // Clients Data

            XLSX.utils.book_append_sheet(wb, wsGlobal, 'Vue Globale');

            // --- SHEET 2: DÉTAIL LIGNES ---
            const linesHeader = ['Ligne', 'Tonnage (Kg)', 'Part (%)', 'Recharges', 'Consignes'];
            const linesData = stats.lines.map(line => [
                `Ligne ${line.id}`,
                line.tonnage * 1000,
                line.percentage,
                line.recharges,
                line.consignes
            ]);
            const wsLines = XLSX.utils.aoa_to_sheet([linesHeader, ...linesData]);
            wsLines['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

            // Apply Styles to Lines Sheet
            applyStyle(wsLines, { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, headerStyle); // Header
            applyStyle(wsLines, { s: { r: 1, c: 0 }, e: { r: linesData.length, c: 4 } }, cellStyle); // Data

            XLSX.utils.book_append_sheet(wb, wsLines, 'Détail Lignes');

            // --- SHEET 3: PERFORMANCE AGENTS ---
            const agentsHeader = ['Rang', 'Nom', 'Prénom', 'Rôle', 'Tonnage (Kg)', 'Productivité (%)', 'Temps Arrêt (min)', 'Contribution (%)'];
            const agentsData = allAgentsComparison.map((agent, index) => [
                index + 1,
                agent.nom,
                agent.prenom,
                agent.displayRole === 'chef_quart' ? 'Chef de Quart' : 'Chef de Ligne',
                agent.tonnage * 1000,
                agent.productivite,
                agent.tempsArret,
                stats.totalTonnage > 0 ? ((agent.tonnage / stats.totalTonnage) * 100).toFixed(2) : 0
            ]);
            const wsAgents = XLSX.utils.aoa_to_sheet([agentsHeader, ...agentsData]);
            wsAgents['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

            // Apply Styles to Agents Sheet
            applyStyle(wsAgents, { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, headerStyle); // Header
            applyStyle(wsAgents, { s: { r: 1, c: 0 }, e: { r: agentsData.length, c: 7 } }, cellStyle); // Data

            XLSX.utils.book_append_sheet(wb, wsAgents, 'Performance Agents');



            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0');

            XLSX.writeFile(wb, `rapport-centre-emplisseur-${timestamp}.xlsx`);
            toast.success("Rapport Excel complet généré avec succès");
        } catch (error) {
            console.error("Erreur lors de l'export Excel:", error);
            toast.error("Erreur lors de la génération du rapport Excel");
        }
    };









    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord Production</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowShiftStockConsignes((v) => !v)}
                        className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9"
                        title={showShiftStockConsignes ? 'Masquer stock et consignes' : 'Afficher stock et consignes'}
                    >
                        {showShiftStockConsignes ? (
                            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {showShiftStockConsignes ? 'Masquer' : 'Afficher'} stock &amp; consignes
                        </span>
                    </Button>
                    <Select value={filterType} onValueChange={(v: 'all' | 'year' | 'month' | 'period' | 'day') => setFilterType(v)}>
                        <SelectTrigger className="h-8 sm:h-9 w-[140px] sm:w-[160px] text-xs sm:text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes périodes</SelectItem>
                            <SelectItem value="year">Année</SelectItem>
                            <SelectItem value="month">Mois</SelectItem>
                            <SelectItem value="period">Période</SelectItem>
                            <SelectItem value="day">Jour</SelectItem>
                        </SelectContent>
                    </Select>

                    {filterType === 'year' && (
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {filterType === 'month' && (
                        <>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                                <SelectTrigger className="h-8 sm:h-9 w-[100px] sm:w-[120px] text-xs sm:text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="h-8 sm:h-9 w-[160px] sm:w-[180px] text-xs sm:text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMonths.map(month => (
                                        <SelectItem key={month} value={month}>
                                            {new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    {filterType === 'day' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 sm:h-9 w-[160px] sm:w-[180px] justify-start text-left font-normal text-xs sm:text-sm">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    locale={fr}
                                    disabled={{ after: new Date() }}
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {filterType === 'period' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 sm:h-9 w-[250px] sm:w-[300px] justify-start text-left font-normal text-xs sm:text-sm">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            `${format(dateRange.from, 'PPP', { locale: fr })} - ${format(dateRange.to, 'PPP', { locale: fr })}`
                                        ) : (
                                            format(dateRange.from, 'PPP', { locale: fr })
                                        )
                                    ) : (
                                        'Sélectionner une période'
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    locale={fr}
                                    disabled={{ after: new Date() }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {showShiftStockConsignes && (
                <div className="rounded-lg border bg-card/80 p-3 sm:p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <p className="text-xs text-muted-foreground mb-3">
                        Informations du shift — stock outil et consignes (cumul sur la période filtrée)
                    </p>
                    {rawShifts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Aucune donnée de shift pour la période sélectionnée.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            <ShiftInventoryTable title="Stock outil" clients={shiftInventoryStats.stockOutil} />
                            <ShiftInventoryTable title="Consignes" clients={shiftInventoryStats.consignes} />
                        </div>
                    )}
                </div>
            )}

            {/* 1. PRODUCTION GLOBALE - NEW LAYOUT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Factory className="h-5 w-5" />
                            PRODUCTION GLOBALE
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(section1Ref, 'production-globale')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(section1Ref, 'production-globale')}
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Production and Shifts - Section for Export */}
                    <div ref={section1Ref}>
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="text-center mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Production</p>
                                <p className="text-4xl font-extrabold text-primary tracking-tight">
                                    {(stats.totalTonnage * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    <span className="text-xl text-primary/60 ml-2">Kg</span>
                                </p>
                            </div>

                            {/* Performance du Centre */}
                            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-center">
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">PERFORMANCE DU CENTRE</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 items-center">
                                    <div className="p-2 bg-card/60 backdrop-blur-sm rounded-md border shadow-sm">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">Tonnage Cible</p>
                                        <p className="text-sm sm:text-lg font-bold text-slate-800 tabular-nums">
                                            {((stats.periodTarget || 0) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">Kg</span>
                                        </p>
                                    </div>
                                    <div className="p-2 bg-card/60 backdrop-blur-sm rounded-md border shadow-sm border-blue-500/30">
                                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400 uppercase font-bold">Taux (%)</p>
                                        <p className="text-base sm:text-2xl font-black text-blue-600 tabular-nums">
                                            {(stats.performancePct || 0).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="p-2 bg-card/60 backdrop-blur-sm rounded-md border shadow-sm">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">
                                            Ouverture Theorique
                                        </p>
                                        <p className="text-sm sm:text-lg font-bold text-slate-800 tabular-nums">
                                            {formatHours(stats.totalTheoreticalOpeningHours || 0)}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-card/60 backdrop-blur-sm rounded-md border shadow-sm">
                                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">
                                            {filterType === 'day' ? 'Moy. Ouverture' : 'Ouverture Reelle'}
                                        </p>
                                        <p className="text-sm sm:text-lg font-bold text-slate-800 tabular-nums">
                                            {formatHours(
                                                filterType === 'day'
                                                    ? (stats.averageOpeningHoursPerDay || 0)
                                                    : (stats.totalOpeningHours || 0),
                                            )}
                                            {filterType === 'day' && (
                                                <span className="text-[10px] font-normal text-muted-foreground ml-0.5 font-sans">/j</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Recharges et Consignes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-primary/20">
                                <div className="bg-card p-3 rounded-md border shadow-sm">
                                    <div className="text-center mb-2">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Recharges</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B6</span>
                                            <span className="font-bold">{stats.recharges.b6.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B12</span>
                                            <span className="font-bold">{stats.recharges.b12.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B28</span>
                                            <span className="font-bold">{stats.recharges.b28.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B38</span>
                                            <span className="font-bold">{stats.recharges.b38.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-card p-3 rounded-md border shadow-sm">
                                    <div className="text-center mb-2">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Consignes</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B6</span>
                                            <span className="font-bold">{stats.consignes.b6.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B12</span>
                                            <span className="font-bold">{stats.consignes.b12.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B28</span>
                                            <span className="font-bold">{stats.consignes.b28.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="bg-muted/30 p-1 rounded">
                                            <span className="block font-semibold text-muted-foreground">B38</span>
                                            <span className="font-bold">{stats.consignes.b38.qty.toLocaleString('fr-FR')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Production par Client */}
                            <div className="mt-4 pt-3 border-t border-primary/20">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    Production par Client
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['petro', 'vivo', 'total'].map((client) => {
                                        const cStats = stats.clients[client as keyof typeof stats.clients] as any;
                                        const names = { petro: 'Petro Ivoire', vivo: 'Vivo Energies', total: 'Total Energies' };
                                        const logos = { petro: '/images/logo-petro.png', vivo: '/images/logo-vivo.png', total: '/images/logo-total.png' };

                                        return (
                                            <div key={client} className="p-3 bg-white/50 rounded-lg border border-primary/20 hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="h-16 w-16 relative flex-shrink-0">
                                                        <img
                                                            src={logos[client as keyof typeof logos]}
                                                            alt={names[client as keyof typeof names]}
                                                            className="h-full w-full object-contain"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-extrabold text-foreground">{cStats.pct.toFixed(1)}%</p>
                                                        <p className="text-sm font-extrabold text-primary">{cStats.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                                                    <div className="bg-primary/5 p-1 rounded">
                                                        <span className="block text-muted-foreground">B6</span>
                                                        <span className="font-bold">{cStats.b6.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="bg-primary/5 p-1 rounded">
                                                        <span className="block text-muted-foreground">B12</span>
                                                        <span className="font-bold">{cStats.b12.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="bg-primary/5 p-1 rounded">
                                                        <span className="block text-muted-foreground">B28</span>
                                                        <span className="font-bold">{cStats.b28.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="bg-primary/5 p-1 rounded">
                                                        <span className="block text-muted-foreground">B38</span>
                                                        <span className="font-bold">{cStats.b38.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Shifts Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div className="p-4 bg-muted/30 rounded-lg border">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-lg">Shift 1</span>
                                    <span className="font-bold text-xl text-primary">{(stats.shift1.tonnage * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Recharges: <span className="font-medium text-foreground">{stats.shift1.recharges.toLocaleString('fr-FR')}</span></span>
                                    <span>Consignes: <span className="font-medium text-foreground">{stats.shift1.consignes.toLocaleString('fr-FR')}</span></span>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg border">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-lg">Shift 2</span>
                                    <span className="font-bold text-xl text-primary">{(stats.shift2.tonnage * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Recharges: <span className="font-medium text-foreground">{stats.shift2.recharges.toLocaleString('fr-FR')}</span></span>
                                    <span>Consignes: <span className="font-medium text-foreground">{stats.shift2.consignes.toLocaleString('fr-FR')}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t my-4"></div>

                    {/* Lines Breakdown */}
                    <div className="space-y-3" ref={section2Ref}>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div
                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                                onClick={() => setIsLinesExpanded(!isLinesExpanded)}
                            >
                                {isLinesExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                                <h3 className="font-bold text-foreground uppercase text-base tracking-wide">Détail par Ligne</h3>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsImage(section2Ref, 'detail-par-ligne')}
                                    className="hidden sm:flex"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Image
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsPDF(section2Ref, 'detail-par-ligne')}
                                    className="hidden sm:flex"
                                >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsImage(section2Ref, 'detail-par-ligne')}
                                    className="sm:hidden"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsPDF(section2Ref, 'detail-par-ligne')}
                                    className="sm:hidden"
                                >
                                    <FileDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {isLinesExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {stats.lines.map((line) => {
                                    // Determine color based on productivity
                                    const prodColor = line.productivite >= 90 ? 'green' :
                                        line.productivite >= 70 ? 'orange' : 'red';

                                    const borderClass = prodColor === 'green' ? 'border-t-green-500' :
                                        prodColor === 'orange' ? 'border-t-orange-500' : 'border-t-red-500';

                                    const bgClass = prodColor === 'green' ? 'bg-green-50/50' :
                                        prodColor === 'orange' ? 'bg-orange-50/50' : 'bg-red-50/50';

                                    const textClass = prodColor === 'green' ? 'text-green-600' :
                                        prodColor === 'orange' ? 'text-orange-600' : 'text-red-600';

                                    const formatTime = (minutes: number) => {
                                        const h = Math.floor(minutes / 60);
                                        const m = Math.round(minutes % 60);
                                        return `${h}h${m.toString().padStart(2, '0')}`;
                                    };

                                    return (
                                        <div
                                            key={line.id}
                                            className={`p-4 bg-card border rounded-lg shadow-sm border-t-4 ${borderClass} ${bgClass} cursor-pointer hover:shadow-lg transition-shadow`}
                                            onClick={() => setSelectedLineForModal(line.id)}
                                        >
                                            {/* Header */}
                                            <div className="text-center mb-3 pb-2 border-b">
                                                <span className="font-bold text-lg text-foreground">Ligne {line.id}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({line.id <= 4 ? 'B6' : 'B12'})
                                                </span>
                                            </div>

                                            {/* Tonnage */}
                                            <div className="text-center mb-3">
                                                <p className="text-xs text-muted-foreground uppercase font-semibold">Tonnage</p>
                                                <p className="text-2xl font-extrabold text-primary">
                                                    {(line.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                    <span className="text-sm font-normal text-muted-foreground ml-1">Kg</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {line.percentage.toFixed(1)}% du total
                                                </p>
                                            </div>

                                            {/* Productivité */}
                                            <div className="text-center mb-3 p-2 rounded-md bg-white/50">
                                                <p className="text-xs text-muted-foreground uppercase font-semibold">Productivité</p>
                                                <p className={`text-xl font-extrabold ${textClass}`}>
                                                    {line.productivite.toFixed(1)}%
                                                </p>
                                            </div>

                                            {/* Bouteilles */}
                                            <div className="text-center pt-2 border-t">
                                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Bouteilles</p>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-blue-600 font-medium">
                                                        R: {line.recharges.toLocaleString('fr-FR')}
                                                    </span>
                                                    <span className="text-green-600 font-medium">
                                                        C: {line.consignes.toLocaleString('fr-FR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        {isLinesExpanded && (
                            <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    Prod ≥ 90%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    70-89%
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    &lt; 70%
                                </span>
                            </div>
                        )}
                    </div>

                </CardContent >
            </Card >

            {/* 2. PRODUCTIVITÉ PAR AGENT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                            onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
                        >
                            {isAgentsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <span className="hidden sm:inline">PRODUCTIVITÉ PAR AGENT</span>
                                <span className="sm:hidden">PRODUCTIVITÉ</span>
                            </CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(section3Ref, 'productivite-par-agent')}
                                className="hidden sm:flex"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(section3Ref, 'productivite-par-agent')}
                                className="hidden sm:flex"
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(section3Ref, 'productivite-par-agent')}
                                className="sm:hidden"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(section3Ref, 'productivite-par-agent')}
                                className="sm:hidden"
                            >
                                <FileDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6" ref={section3Ref}>
                    {isAgentsExpanded && (
                        <div className="space-y-4">
                            {/* Chefs de Quart */}
                            {allAgentsComparison.filter(a => a.displayRole === 'chef_quart').length > 0 && (
                                <>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-border flex-1" />
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                            Chefs de Quart
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {allAgentsComparison
                                            .filter(a => a.displayRole === 'chef_quart')
                                            .map((agent, index) => {
                                                const rank = index + 1;
                                                const contribution = stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0;

                                                const badge = agent.productivite >= 90 ? { color: 'green', icon: '🟢' } :
                                                    agent.productivite >= 70 ? { color: 'orange', icon: '🟠' } :
                                                        { color: 'red', icon: '🔴' };

                                                const borderClass = badge.color === 'green' ? 'border-l-green-500' :
                                                    badge.color === 'orange' ? 'border-l-orange-500' : 'border-l-red-500';

                                                const bgClass = badge.color === 'green' ? 'bg-green-50/50' :
                                                    badge.color === 'orange' ? 'bg-orange-50/50' : 'bg-red-50/50';

                                                return (
                                                    <Card
                                                        key={agent.id}
                                                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${borderClass} ${bgClass}`}
                                                        onClick={() => setSelectedAgentForModal(agent.id)}
                                                    >
                                                        <CardContent className="p-3 sm:p-4">
                                                            <div className="flex items-center gap-3 sm:gap-4">
                                                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-primary/10 border-2 border-primary">
                                                                    <span className="text-lg sm:text-xl font-extrabold text-primary">#{rank}</span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-bold text-base sm:text-lg truncate">
                                                                            {agent.prenom} {agent.nom}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">Chef de Quart</p>
                                                                </div>

                                                                <div className="text-right flex-shrink-0">
                                                                    <div className={`text-xl sm:text-2xl font-extrabold ${badge.color === 'green' ? 'text-green-600' :
                                                                        badge.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                                                                        }`}>
                                                                        {agent.productivite.toFixed(1)}%
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-bold text-foreground">
                                                                        {(agent.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                    </div>
                                                                    <div className="text-xs text-primary font-semibold">
                                                                        {contribution.toFixed(1)}%
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3">
                                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${badge.color === 'green' ? 'bg-green-500' :
                                                                            badge.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                                                                            }`}
                                                                        style={{ width: `${Math.min(100, contribution)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </div>
                                </>
                            )}

                            {/* Rôles Doubles */}
                            {allAgentsComparison.filter(a => a.displayRole === 'both').length > 0 && (
                                <>
                                    <div className="flex items-center gap-4 my-6">
                                        <div className="h-px bg-border flex-1" />
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                            Rôles Doubles
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {allAgentsComparison
                                            .filter(a => a.displayRole === 'both')
                                            .map((agent) => {
                                                const contribution = stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0;

                                                // Badge for Chef de Quart productivity
                                                const badgeQuart = agent.productiviteQuart! >= 90 ? { color: 'green', icon: '🟢' } :
                                                    agent.productiviteQuart! >= 70 ? { color: 'orange', icon: '🟠' } :
                                                        { color: 'red', icon: '🔴' };

                                                // Badge for Chef de Ligne productivity
                                                const badgeLigne = agent.productiviteLigne! >= 90 ? { color: 'green', icon: '🟢' } :
                                                    agent.productiviteLigne! >= 70 ? { color: 'orange', icon: '🟠' } :
                                                        { color: 'red', icon: '🔴' };

                                                return (
                                                    <Card
                                                        key={agent.id}
                                                        className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-purple-500 bg-purple-50/30"
                                                        onClick={() => setSelectedAgentForModal(agent.id)}
                                                    >
                                                        <CardContent className="p-3 sm:p-4">
                                                            {/* Header with name and total */}
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-purple-100 border-2 border-purple-500">
                                                                        <span className="text-lg">🔄</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-bold text-base sm:text-lg truncate">
                                                                                {agent.prenom} {agent.nom}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Chef de Quart + Chef de Ligne
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-left sm:text-right flex-shrink-0">
                                                                    <div className="text-lg sm:text-xl font-bold text-purple-600">
                                                                        {(agent.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                    </div>
                                                                    <div className="text-xs text-purple-500 font-semibold">
                                                                        {contribution.toFixed(1)}% contrib.
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Separator */}
                                                            <div className="h-px bg-border my-3" />

                                                            {/* Two productivity rows */}
                                                            <div className="space-y-3">
                                                                {/* Chef de Quart row */}
                                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-muted-foreground">📊 Chef de Quart</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                                        <div className={`text-xl font-extrabold ${badgeQuart.color === 'green' ? 'text-green-600' :
                                                                            badgeQuart.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                                                                            }`}>
                                                                            {agent.productiviteQuart!.toFixed(1)}%
                                                                        </div>
                                                                        <div className="text-sm font-bold text-foreground sm:w-24 text-right">
                                                                            {(agent.tonnageQuart! * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground sm:w-16 text-right">
                                                                            {agent.nombreShifts} shift{agent.nombreShifts > 1 ? 's' : ''}
                                                                        </div>
                                                                        <span className="text-sm">{badgeQuart.icon}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Chef de Ligne row */}
                                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-muted-foreground">📊 Chef de Ligne</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                                        <div className={`text-xl font-extrabold ${badgeLigne.color === 'green' ? 'text-green-600' :
                                                                            badgeLigne.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                                                                            }`}>
                                                                            {agent.productiviteLigne!.toFixed(1)}%
                                                                        </div>
                                                                        <div className="text-sm font-bold text-foreground sm:w-24 text-right">
                                                                            {(agent.tonnageLigne! * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground sm:w-16 text-right">
                                                                            {agent.nombreLignes} ligne{agent.nombreLignes > 1 ? 's' : ''}
                                                                        </div>
                                                                        <span className="text-sm">{badgeLigne.icon}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </div>
                                </>
                            )}

                            {/* Chefs de Ligne */}
                            {allAgentsComparison.filter(a => a.displayRole === 'chef_ligne').length > 0 && (
                                <>
                                    <div className="flex items-center gap-4 my-6">
                                        <div className="h-px bg-border flex-1" />
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                            Chefs de Ligne
                                        </span>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {allAgentsComparison
                                            .filter(a => a.displayRole === 'chef_ligne')
                                            .map((agent, index) => {
                                                const rank = index + 1;
                                                const contribution = stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0;

                                                const badge = agent.productivite >= 90 ? { color: 'green', icon: '🟢' } :
                                                    agent.productivite >= 70 ? { color: 'orange', icon: '🟠' } :
                                                        { color: 'red', icon: '🔴' };

                                                const borderClass = badge.color === 'green' ? 'border-l-green-500' :
                                                    badge.color === 'orange' ? 'border-l-orange-500' : 'border-l-red-500';

                                                const bgClass = badge.color === 'green' ? 'bg-green-50/50' :
                                                    badge.color === 'orange' ? 'bg-orange-50/50' : 'bg-red-50/50';

                                                return (
                                                    <Card
                                                        key={agent.id}
                                                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${borderClass} ${bgClass}`}
                                                        onClick={() => setSelectedAgentForModal(agent.id)}
                                                    >
                                                        <CardContent className="p-3 sm:p-4">
                                                            <div className="flex items-center gap-3 sm:gap-4">
                                                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-primary/10 border-2 border-primary">
                                                                    <span className="text-lg sm:text-xl font-extrabold text-primary">#{rank}</span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-bold text-base sm:text-lg truncate">
                                                                            {agent.prenom} {agent.nom}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        Lignes: {agent.lines && agent.lines.length > 0 ? agent.lines.join(', ') : 'N/A'}
                                                                    </p>
                                                                </div>

                                                                <div className="text-right flex-shrink-0">
                                                                    <div className={`text-xl sm:text-2xl font-extrabold ${badge.color === 'green' ? 'text-green-600' :
                                                                        badge.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                                                                        }`}>
                                                                        {agent.productivite.toFixed(1)}%
                                                                    </div>
                                                                    <div className="text-xs sm:text-sm font-bold text-foreground">
                                                                        {(agent.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                    </div>
                                                                    <div className="text-xs text-primary font-semibold">
                                                                        {contribution.toFixed(1)}%
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3">
                                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${badge.color === 'green' ? 'bg-green-500' :
                                                                            badge.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                                                                            }`}
                                                                        style={{ width: `${Math.min(100, contribution)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </div>
                                </>
                            )}

                            {/* Sans activité */}
                            {allAgentsComparison.filter(a => a.tonnage === 0).length > 0 && (
                                <>
                                    <div className="flex items-center gap-4 my-6">
                                        <div className="h-[1px] bg-muted-foreground/30 flex-1" />
                                        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                                            Sans activité sur la période
                                        </span>
                                        <div className="h-[1px] bg-muted-foreground/30 flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {allAgentsComparison
                                            .filter(a => a.tonnage === 0)
                                            .map((agent) => (
                                                <div key={agent.id} className="p-2 border border-red-200 rounded text-xs sm:text-sm text-red-700 bg-red-50 truncate">
                                                    {agent.prenom} {agent.nom}
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. ANALYSE DES TEMPS D'ARRÊT */}
            <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                            onClick={() => setIsArretsExpanded(!isArretsExpanded)}
                        >
                            {isArretsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            <CardTitle className="text-xl flex items-center gap-2">
                                <span className="text-lg">⏱️</span>
                                <span>ANALYSE DES TEMPS D'ARRÊT</span>
                            </CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(sectionArretsRef, 'analyse-temps-arret')}
                                className="hidden sm:flex"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(sectionArretsRef, 'analyse-temps-arret')}
                                className="hidden sm:flex"
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(sectionArretsRef, 'analyse-temps-arret')}
                                className="sm:hidden"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(sectionArretsRef, 'analyse-temps-arret')}
                                className="sm:hidden"
                            >
                                <FileDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6" ref={sectionArretsRef}>
                    {isArretsExpanded && (
                        <div className="space-y-6">
                            {/* Filter Buttons */}
                            <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg w-fit">
                                {(['Tous', 'Sécurité', 'Ressources', 'Pannes', 'Autre'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setArretFilter(cat)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all",
                                            arretFilter === cat
                                                ? "bg-background text-foreground shadow-sm font-bold"
                                                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Lines Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {arretStatsByLine.map((line) => {
                                    // Determine color badge based on duration in minutes
                                    const totalMin = line.totalDuration;
                                    const level = totalMin === 0 ? 'none' : totalMin < 60 ? 'low' : totalMin < 180 ? 'medium' : 'high';
                                    
                                    const borderClass = level === 'none' ? 'border-t-slate-200 bg-slate-50/20' :
                                        level === 'low' ? 'border-t-green-500 bg-green-50/20' :
                                        level === 'medium' ? 'border-t-orange-500 bg-orange-50/20' : 'border-t-red-500 bg-red-50/20';

                                    const textClass = level === 'none' ? 'text-slate-500' :
                                        level === 'low' ? 'text-green-600' :
                                        level === 'medium' ? 'text-orange-600' : 'text-red-600';

                                    const labelClass = level === 'none' ? 'bg-slate-100 text-slate-700' :
                                        level === 'low' ? 'bg-green-100 text-green-800' :
                                        level === 'medium' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';

                                    return (
                                        <div
                                            key={line.id}
                                            className={cn(
                                                "p-4 bg-card border rounded-lg shadow-sm border-t-4 transition-all hover:shadow-md",
                                                borderClass
                                            )}
                                        >
                                            {/* Header */}
                                            <div className="text-center mb-3 pb-2 border-b flex items-center justify-between">
                                                <span className="font-bold text-base text-foreground">Ligne {line.id}</span>
                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", labelClass)}>
                                                    {line.id <= 4 ? 'B6' : 'B12'}
                                                </span>
                                            </div>

                                            {/* Total Downtime */}
                                            <div className="text-center mb-4">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Temps d'arrêt</p>
                                                <p className={cn("text-2xl font-black tabular-nums mt-0.5", textClass)}>
                                                    {formatMinutesToHours(line.totalDuration)}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {line.incidentCount} incident{line.incidentCount > 1 ? 's' : ''}
                                                </p>
                                            </div>

                                            {/* Motif list breakdown */}
                                            <div className="pt-3 border-t space-y-2">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Détail des Motifs</p>
                                                {line.motifs.length === 0 ? (
                                                    <p className="text-xs text-center text-muted-foreground py-2 italic">Aucun arrêt enregistré</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {line.motifs.map((motif) => (
                                                            <div key={motif.type} className="flex justify-between items-center text-xs p-1.5 rounded bg-muted/40 hover:bg-muted/80 transition-colors">
                                                                <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-[120px]" title={motif.label}>
                                                                    {motif.label}
                                                                </span>
                                                                <span className="font-bold text-slate-700 tabular-nums flex-shrink-0">
                                                                    {formatMinutesToHours(motif.duration)} <span className="text-[10px] font-normal text-muted-foreground">({motif.count}x)</span>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Historique des bilans/commentaires de shift */}
                            <div className="mt-3 border-t pt-4">
                                <h4 className="text-sm font-bold text-foreground mb-3">Historique des commentaires de shift</h4>
                                {rawShifts
                                    .filter((s: any) => (s.bilan_commentaire || '').trim().length > 0)
                                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">
                                        Aucun commentaire enregistré pour le filtre actuel.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {rawShifts
                                            .filter((s: any) => (s.bilan_commentaire || '').trim().length > 0)
                                            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((s: any) => (
                                                <div key={s.id} className="p-3 rounded-md border bg-card/70">
                                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                        {new Date(s.date).toLocaleDateString('fr-FR')} - {s.shift_type === '10h-19h' ? 'Shift 1' : 'Shift 2'}
                                                    </p>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                                        {s.bilan_commentaire}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Agent Details Modal */}
            <Dialog open={!!selectedAgentForModal} onOpenChange={(open) => !open && setSelectedAgentForModal(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.prenom} {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.nom}
                        </DialogTitle>
                        <div className="flex gap-2 mr-12">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const element = agentModalRef.current;
                                    if (element) {
                                        html2canvas(element, {
                                            scale: 2,
                                            backgroundColor: '#ffffff',
                                            logging: false
                                        }).then(canvas => {
                                            const link = document.createElement('a');
                                            const agentName = allAgentsComparison.find(a => a.id === selectedAgentForModal);
                                            link.download = `agent_${agentName?.prenom}_${agentName?.nom}_${new Date().toISOString().split('T')[0]}.png`;
                                            link.href = canvas.toDataURL();
                                            link.click();
                                        });
                                    }
                                }}
                                className="gap-2"
                            >
                                <Camera className="h-4 w-4" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const element = agentModalRef.current;
                                    if (element) {
                                        html2canvas(element, {
                                            scale: 2,
                                            backgroundColor: '#ffffff',
                                            logging: false
                                        }).then(canvas => {
                                            const imgData = canvas.toDataURL('image/png');
                                            const pdf = new jsPDF({
                                                orientation: 'portrait',
                                                unit: 'mm',
                                                format: 'a4'
                                            });

                                            const imgWidth = 210; // A4 width in mm
                                            const imgHeight = (canvas.height * imgWidth) / canvas.width;

                                            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                                            const agentName = allAgentsComparison.find(a => a.id === selectedAgentForModal);
                                            pdf.save(`agent_${agentName?.prenom}_${agentName?.nom}_${new Date().toISOString().split('T')[0]}.pdf`);
                                        });
                                    }
                                }}
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </Button>
                        </div>
                    </DialogHeader>

                    {agentModalData ? (
                        <div className="space-y-6 py-4" ref={agentModalRef}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Card 1: Volume — Attendu vs Réalisé en miroir */}
                                <Card className="border-l-4 border-l-blue-500">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Package className="h-5 w-5 text-blue-600" />
                                            Volume
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Attendu */}
                                            <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                                                <p className="text-[10px] uppercase tracking-widest text-purple-600 font-semibold mb-2">Attendu</p>
                                                <div className="space-y-1.5">
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground">Bouteilles</p>
                                                        <p className="font-bold text-purple-700 tabular-nums">
                                                            {Math.round(agentModalData.bouteillesAttendues || 0).toLocaleString('fr-FR')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground">Tonnage</p>
                                                        <p className="font-bold text-purple-700 tabular-nums">
                                                            {((agentModalData.tonnageAttendu || 0) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Réalisé */}
                                            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                                                <p className="text-[10px] uppercase tracking-widest text-blue-600 font-semibold mb-2">Réalisé</p>
                                                <div className="space-y-1.5">
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground">Bouteilles</p>
                                                        <p className="font-bold text-blue-700 tabular-nums">
                                                            {(agentModalData.recharges + agentModalData.consignes).toLocaleString('fr-FR')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground">Tonnage</p>
                                                        <p className="font-bold text-blue-700 tabular-nums">
                                                            {(agentModalData.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Détail recharges / consignes */}
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="text-center p-2 border rounded">
                                                <p className="text-xs text-muted-foreground">Recharges</p>
                                                <p className="font-bold text-foreground">{agentModalData.recharges.toLocaleString('fr-FR')}</p>
                                            </div>
                                            <div className="text-center p-2 border rounded">
                                                <p className="text-xs text-muted-foreground">Consignes</p>
                                                <p className="font-bold text-foreground">{agentModalData.consignes.toLocaleString('fr-FR')}</p>
                                            </div>
                                        </div>
                                        {/* Split Quart/Ligne si dual-role */}
                                        {agentModalData.isDualRole ? (
                                            <div className="space-y-2 text-sm pt-2 border-t">
                                                <div className="flex items-center justify-between p-2 border rounded bg-purple-50/50">
                                                    <span className="text-xs text-muted-foreground font-semibold">📊 Chef de Quart</span>
                                                    <span className="font-bold text-purple-600">{(agentModalData.tonnageQuart * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                </div>
                                                <div className="flex items-center justify-between p-2 border rounded bg-purple-50/50">
                                                    <span className="text-xs text-muted-foreground font-semibold">📊 Chef de Ligne</span>
                                                    <span className="font-bold text-purple-600">{(agentModalData.tonnageLigne * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                {/* Card 2: Productivité */}
                                <Card className="border-l-4 border-l-green-500">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ArrowUp className="h-5 w-5 text-green-600" />
                                            Productivité
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {agentModalData.isDualRole ? (
                                            <div className="space-y-3">
                                                {/* Chef de Quart Productivity */}
                                                <div className="p-3 bg-purple-50/50 rounded-lg border-l-4 border-l-purple-500">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-semibold text-muted-foreground">📊 Chef de Quart</span>
                                                        <span className="text-xs text-muted-foreground">{agentModalData.nombreShifts} shift{agentModalData.nombreShifts > 1 ? 's' : ''}</span>
                                                    </div>
                                                    <p className={`text-3xl font-extrabold text-center ${agentModalData.productiviteQuart >= 90 ? 'text-green-600' :
                                                        agentModalData.productiviteQuart >= 70 ? 'text-orange-500' : 'text-red-600'
                                                        }`}>
                                                        {agentModalData.productiviteQuart.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                                        <span className="text-xl ml-1">%</span>
                                                    </p>
                                                </div>

                                                {/* Chef de Ligne Productivity */}
                                                <div className="p-3 bg-purple-50/50 rounded-lg border-l-4 border-l-purple-500">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-semibold text-muted-foreground">📊 Chef de Ligne</span>
                                                        <span className="text-xs text-muted-foreground">{agentModalData.nombreLignes} ligne{agentModalData.nombreLignes > 1 ? 's' : ''}</span>
                                                    </div>
                                                    <p className={`text-3xl font-extrabold text-center ${agentModalData.productiviteLigne >= 90 ? 'text-green-600' :
                                                        agentModalData.productiviteLigne >= 70 ? 'text-orange-500' : 'text-red-600'
                                                        }`}>
                                                        {agentModalData.productiviteLigne.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                                        <span className="text-xl ml-1">%</span>
                                                    </p>
                                                </div>

                                                {/* Global Productivity */}
                                                <div className="pt-2 border-t">
                                                    <p className="text-xs text-muted-foreground text-center mb-1">Productivité Globale</p>
                                                    <p className={`text-2xl font-extrabold text-center ${agentModalData.tauxPerformance >= 90 ? 'text-green-600' :
                                                        agentModalData.tauxPerformance >= 70 ? 'text-orange-500' : 'text-red-600'
                                                        }`}>
                                                        {agentModalData.tauxPerformance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 bg-green-50/50 rounded-lg">
                                                <p className={`text-4xl font-extrabold ${agentModalData.tauxPerformance >= 90 ? 'text-green-600' :
                                                    agentModalData.tauxPerformance >= 70 ? 'text-orange-500' : 'text-red-600'
                                                    }`}>
                                                    {agentModalData.tauxPerformance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                                    <span className="text-2xl ml-1">%</span>
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Card 3: Temps — Attendu / Travaillé / Arrêt */}
                                <Card className="border-l-4 border-l-orange-500">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ArrowDown className="h-5 w-5 text-orange-600" />
                                            Temps
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="text-center p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                                                <p className="text-[10px] uppercase tracking-wider text-purple-600 font-semibold mb-1">Attendu</p>
                                                <p className="text-xl font-bold text-purple-700 tabular-nums">
                                                    {(() => {
                                                        const v = agentModalData.expectedHours || 0;
                                                        const h = Math.floor(v);
                                                        const m = Math.round((v - h) * 60);
                                                        return m === 60
                                                            ? `${h + 1}h00`
                                                            : `${h}h${m.toString().padStart(2, '0')}`;
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="text-center p-2.5 rounded-lg bg-green-50/50 border border-green-100">
                                                <p className="text-[10px] uppercase tracking-wider text-green-600 font-semibold mb-1">Travaillé</p>
                                                <p className="text-xl font-bold text-green-700 tabular-nums">
                                                    {(() => {
                                                        const v = agentModalData.actualHours || 0;
                                                        const h = Math.floor(v);
                                                        const m = Math.round((v - h) * 60);
                                                        return m === 60
                                                            ? `${h + 1}h00`
                                                            : `${h}h${m.toString().padStart(2, '0')}`;
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="text-center p-2.5 rounded-lg bg-orange-50/50 border border-orange-100">
                                                <p className="text-[10px] uppercase tracking-wider text-orange-600 font-semibold mb-1">Arrêt</p>
                                                <p className="text-xl font-bold text-orange-700 tabular-nums">
                                                    {Math.floor(agentModalData.tempsArretMinutes / 60)}<span className="text-sm">h</span>
                                                    {Math.round(agentModalData.tempsArretMinutes % 60).toString().padStart(2, '0')}
                                                </p>
                                            </div>
                                        </div>
                                        {agentModalData.downtimeByLine && Object.keys(agentModalData.downtimeByLine).length > 0 && (
                                            <div className="pt-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Arrêts par ligne</p>
                                                <div className="space-y-1">
                                                    {Object.entries(agentModalData.downtimeByLine)
                                                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                                                        .map(([line, minutes]) => (
                                                            <div key={line} className="flex items-center justify-between text-xs">
                                                                <span className="text-muted-foreground">Ligne {line}</span>
                                                                <span className="font-bold text-orange-600">
                                                                    {Math.floor((minutes as number) / 60)}h{Math.round((minutes as number) % 60).toString().padStart(2, '0')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Card 4: Périmètre — Présence + shifts/lignes couverts */}
                                <Card className="border-l-4 border-l-purple-500">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="h-5 w-5 text-purple-600" />
                                            Périmètre
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="text-center p-4 bg-purple-50/50 rounded-lg">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Taux de présence</p>
                                            <p className={`text-4xl font-extrabold ${agentModalData.tauxPresence >= 95 ? 'text-green-600' :
                                                agentModalData.tauxPresence >= 85 ? 'text-orange-500' : 'text-red-600'
                                                }`}>
                                                {agentModalData.tauxPresence.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                                <span className="text-2xl ml-1">%</span>
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded bg-gradient-to-br from-purple-50 to-purple-100/50">
                                            <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Shifts / lignes couverts</p>
                                            <div className="font-bold text-purple-600 space-y-1">
                                                {agentModalData.shiftsList && agentModalData.shiftsList.length > 0 ? (
                                                    agentModalData.shiftsList.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-sm">
                                                            {item.shift} — Lignes : {item.lignes.join(', ')}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Line Details Modal */}
            <Dialog open={!!selectedLineForModal} onOpenChange={(open) => {
                if (!open) {
                    setSelectedLineForModal(null);
                    setLineModalTab('cumul');
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Factory className="h-6 w-6 text-primary" />
                            Ligne {selectedLineForModal} {lineModalData && lineModalData.periodeDisplay && `| ${lineModalData.periodeDisplay}`}
                        </DialogTitle>
                        <div className="flex gap-2 mr-12">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const element = document.getElementById('line-modal-content');
                                    if (element) {
                                        html2canvas(element, {
                                            scale: 2,
                                            backgroundColor: '#ffffff',
                                            logging: false
                                        }).then(canvas => {
                                            const link = document.createElement('a');
                                            link.download = `ligne_${selectedLineForModal}_${lineModalTab}_${new Date().toISOString().split('T')[0]}.png`;
                                            link.href = canvas.toDataURL();
                                            link.click();
                                        });
                                    }
                                }}
                                className="gap-2"
                            >
                                <Camera className="h-4 w-4" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const element = document.getElementById('line-modal-content');
                                    if (element) {
                                        html2canvas(element, {
                                            scale: 2,
                                            backgroundColor: '#ffffff',
                                            logging: false
                                        }).then(canvas => {
                                            const imgData = canvas.toDataURL('image/png');
                                            const pdf = new jsPDF({
                                                orientation: 'portrait',
                                                unit: 'mm',
                                                format: 'a4'
                                            });

                                            const imgWidth = 210;
                                            const imgHeight = (canvas.height * imgWidth) / canvas.width;

                                            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                                            pdf.save(`ligne_${selectedLineForModal}_${lineModalTab}_${new Date().toISOString().split('T')[0]}.pdf`);
                                        });
                                    }
                                }}
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </Button>
                        </div>
                    </DialogHeader>

                    {lineModalData ? (
                        <div className="space-y-6 py-4" id="line-modal-content">
                            {/* Tabs selector */}
                            <div className="flex gap-2 p-1 bg-muted rounded-lg">
                                <button
                                    onClick={() => setLineModalTab('shift1')}
                                    disabled={!lineModalData.shift1}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${lineModalTab === 'shift1' ? 'bg-background shadow-sm' : 'hover:bg-background/50'} ${!lineModalData.shift1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Shift 1 (10h-19h)
                                </button>
                                <button
                                    onClick={() => setLineModalTab('shift2')}
                                    disabled={!lineModalData.shift2}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${lineModalTab === 'shift2' ? 'bg-background shadow-sm' : 'hover:bg-background/50'} ${!lineModalData.shift2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Shift 2 (20h-5h)
                                </button>
                                <button
                                    onClick={() => setLineModalTab('cumul')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${lineModalTab === 'cumul' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                                >
                                    Cumul
                                </button>
                            </div>

                            {(() => {
                                const tabData = lineModalData[lineModalTab];
                                if (!tabData) return <p className="text-center text-muted-foreground py-8">Aucune donnée pour ce shift</p>;

                                return (
                                    <>
                                        {/* Section 1: En-tête */}
                                        <div className="text-center space-y-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                                            <div className="flex items-center justify-center gap-4">
                                                <div>
                                                    <p className={`text-5xl font-extrabold ${tabData.productivite >= 90 ? 'text-green-600' : tabData.productivite >= 70 ? 'text-orange-500' : 'text-red-600'}`}>
                                                        {tabData.productivite?.toFixed(1) || '0'}%
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">Productivité</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Statistiques Clés */}
                                        <Card className="border-l-4 border-l-blue-500">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Package className="h-5 w-5 text-blue-600" />
                                                    Statistiques Clés
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {/* Attendu vs Réalisé */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="p-4 border rounded-lg bg-purple-50/50">
                                                        <p className="text-xs uppercase tracking-wider text-purple-700 font-bold mb-3">PRODUCTION ATTENDUE</p>
                                                        <div className="space-y-2">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm text-muted-foreground">Bouteilles</span>
                                                                <span className="text-xl font-bold text-purple-600 tabular-nums">
                                                                    {Math.round(tabData.bouteillesAttendu || 0).toLocaleString('fr-FR')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm text-muted-foreground">Tonnage</span>
                                                                <span className="text-xl font-bold text-purple-600 tabular-nums">
                                                                    {((tabData.productionTheorique || 0) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 border rounded-lg bg-blue-50/50">
                                                        <p className="text-xs uppercase tracking-wider text-blue-700 font-bold mb-3">PRODUCTION REALISEE</p>
                                                        <div className="space-y-2">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm text-muted-foreground">Bouteilles</span>
                                                                <span className="text-xl font-bold text-blue-600 tabular-nums">
                                                                    {(tabData.totalBouteilles || 0).toLocaleString('fr-FR')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-sm text-muted-foreground">Tonnage</span>
                                                                <span className="text-xl font-bold text-blue-600 tabular-nums">
                                                                    {((tabData.totalTonnage || 0) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Temps */}
                                                <div className="p-4 border rounded-lg bg-orange-50/50 space-y-4">
                                                    <p className="text-xs uppercase tracking-wider text-orange-700 font-bold">Temps de Production</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="p-2 bg-white/60 rounded-md border border-orange-100">
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Temps Théorique</p>
                                                            <p className="text-lg font-bold text-slate-800 tabular-nums">
                                                                {formatHours(tabData.totalTempsTheorique || 0)}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 bg-white/60 rounded-md border border-orange-100">
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Temps Réel Ouverture</p>
                                                            <p className="text-lg font-bold text-blue-700 tabular-nums">
                                                                {formatHours(tabData.totalHeuresShift || 0)}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 bg-white/60 rounded-md border border-orange-100">
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Temps productif</p>
                                                            <p className="text-lg font-bold text-green-700 tabular-nums">
                                                                {formatHours(tabData.heuresProductives || 0)}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 bg-white/60 rounded-md border border-orange-100">
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Temps d'arrêt</p>
                                                            <p className="text-lg font-bold text-red-600 tabular-nums">
                                                                {formatMinutesToHours(tabData.totalTempsArret || 0)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Détail des arrêts par catégorie */}
                                                    <div className="pt-2 border-t border-orange-100">
                                                        <p className="text-xs font-semibold text-orange-800 mb-2">Détail des temps d'arrêt par catégorie :</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                            <div className="flex justify-between p-2 rounded bg-white/40">
                                                                <span className="text-muted-foreground">Sécurité :</span>
                                                                <span className="font-semibold text-orange-950">{formatMinutesToHours(tabData.arretsSecurite || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between p-2 rounded bg-white/40">
                                                                <span className="text-muted-foreground">Ressources :</span>
                                                                <span className="font-semibold text-orange-950">{formatMinutesToHours(tabData.arretsRessources || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between p-2 rounded bg-white/40">
                                                                <span className="text-muted-foreground">Pannes :</span>
                                                                <span className="font-semibold text-orange-950">{formatMinutesToHours(tabData.arretsPannes || 0)}</span>
                                                            </div>
                                                            <div className="flex justify-between p-2 rounded bg-white/40">
                                                                <span className="text-muted-foreground">Autre :</span>
                                                                <span className="font-semibold text-orange-950">{formatMinutesToHours(tabData.arretsAutre || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Section 3: Détail par Format */}
                                        <Card className="border-l-4 border-l-green-500">
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Package className="h-5 w-5 text-green-600" />
                                                    Détail par Format
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {tabData.formatBreakdown && Object.entries(tabData.formatBreakdown).map(([fmt, data]: [string, any]) => (
                                                        <div key={fmt} className="p-4 border rounded-lg bg-gray-50/50">
                                                            <h4 className="font-bold text-lg mb-3 text-primary">Format {fmt}</h4>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="text-center p-2 border rounded bg-white">
                                                                    <div className="flex justify-center mb-2">
                                                                        <img src="/images/logo-petro.png" alt="Petro" className="h-8 object-contain" />
                                                                    </div>
                                                                    <p className="text-sm font-medium text-blue-600">{(data.petro?.recharges || 0).toLocaleString('fr-FR')} recharges</p>
                                                                    <p className="text-sm font-medium text-green-600">{(data.petro?.consignes || 0).toLocaleString('fr-FR')} consignes</p>
                                                                </div>
                                                                <div className="text-center p-2 border rounded bg-white">
                                                                    <div className="flex justify-center mb-2">
                                                                        <img src="/images/logo-total.png" alt="Total" className="h-8 object-contain" />
                                                                    </div>
                                                                    <p className="text-sm font-medium text-blue-600">{(data.total?.recharges || 0).toLocaleString('fr-FR')} recharges</p>
                                                                    <p className="text-sm font-medium text-green-600">{(data.total?.consignes || 0).toLocaleString('fr-FR')} consignes</p>
                                                                </div>
                                                                <div className="text-center p-2 border rounded bg-white">
                                                                    <div className="flex justify-center mb-2">
                                                                        <img src="/images/logo-vivo.png" alt="Vivo" className="h-8 object-contain" />
                                                                    </div>
                                                                    <p className="text-sm font-medium text-blue-600">{(data.vivo?.recharges || 0).toLocaleString('fr-FR')} recharges</p>
                                                                    <p className="text-sm font-medium text-green-600">{(data.vivo?.consignes || 0).toLocaleString('fr-FR')} consignes</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!tabData.formatBreakdown || Object.keys(tabData.formatBreakdown).length === 0) && (
                                                        <p className="text-muted-foreground text-center py-4">Aucune donnée de format disponible</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>


        </div >
    );
};

export default CentreEmplisseurView;
