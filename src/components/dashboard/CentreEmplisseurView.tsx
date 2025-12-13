import { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Loader2, Factory, Users, ArrowUp, ArrowDown, Calendar as CalendarIcon, Package, Download, FileDown, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface CentreEmplisseurViewProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    filterType: 'month' | 'date' | 'range';
    setFilterType: (type: 'month' | 'date' | 'range') => void;
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
    // Refs for exportable sections
    const section1Ref = useRef<HTMLDivElement>(null);
    const section2Ref = useRef<HTMLDivElement>(null);
    const section3Ref = useRef<HTMLDivElement>(null);
    const agentModalRef = useRef<HTMLDivElement>(null);

    // Collapsible sections state
    const [isLinesExpanded, setIsLinesExpanded] = useState(false);
    const [isAgentsExpanded, setIsAgentsExpanded] = useState(false);

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





    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        // Global
        totalTonnage: 0,
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


    // Agent Filter States (default to current month)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Generate last 12 months for filter (memoized to avoid duplicates)
    const availableMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7);
    }), []);


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
            let shiftsQuery = supabase.from('production_shifts').select('*');
            let linesQuery = supabase.from('lignes_production').select('*, production_shifts!inner(date, shift_type)');

            // Apply filters
            if (filterType === 'month') {
                const startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                linesQuery = linesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
            } else if (filterType === 'date' && selectedDate) {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                shiftsQuery = shiftsQuery.eq('date', dateStr);
                linesQuery = linesQuery.eq('production_shifts.date', dateStr);
            } else if (filterType === 'range' && dateRange?.from) {
                const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                linesQuery = linesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
            }

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

                return {
                    id,
                    tonnage,
                    percentage: totalTonnage > 0 ? (tonnage / totalTonnage) * 100 : 0,
                    recharges,
                    consignes,
                    rechargesKg,
                    consignesKg
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

            setStats({
                totalTonnage,
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

        } catch (error) {
            console.error('Error fetching production stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            // Fetch both chefs de quart and chefs de ligne
            const [quartsResult, lignesResult] = await Promise.all([
                supabase.from('chefs_quart').select('*').order('nom'),
                supabase.from('chefs_ligne').select('*').order('nom')
            ]);

            if (quartsResult.error) throw quartsResult.error;
            if (lignesResult.error) throw lignesResult.error;

            // Combine both lists with unique IDs and role info
            const quartsWithRole = (quartsResult.data || []).map(agent => ({ ...agent, role: 'chef_quart' }));
            const lignesWithRole = (lignesResult.data || []).map(agent => ({ ...agent, role: 'chef_ligne' }));

            // Merge and remove duplicates based on name (in case same person is in both tables)
            const allAgentsList = [...quartsWithRole, ...lignesWithRole];
            setAllAgents(allAgentsList);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const fetchAllAgentsComparison = async () => {
        try {
            // Get all agents
            const [quartsResult, lignesResult] = await Promise.all([
                supabase.from('chefs_quart').select('id, nom, prenom'),
                supabase.from('chefs_ligne').select('id, nom, prenom')
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
                        .select('tonnage_total, temps_arret_total_minutes, arrets_production(*), lignes_production(*)')
                        .eq('chef_quart_id', agent.id);

                    // Query lignes as chef de ligne (including arrets for productivity calc)
                    let lignesQuery = supabase
                        .from('lignes_production')
                        .select('tonnage_ligne, numero_ligne, production_shifts!inner(id, date, shift_type, arrets_production(*))')
                        .eq('chef_ligne_id', agent.id);

                    // Apply filters
                    if (filterType === 'month') {
                        const startDate = `${selectedMonth}-01`;
                        const [y, m] = selectedMonth.split('-').map(Number);
                        const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                        shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                        lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
                    } else if (filterType === 'date' && selectedDate) {
                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                        shiftsQuery = shiftsQuery.eq('date', dateStr);
                        lignesQuery = lignesQuery.eq('production_shifts.date', dateStr);
                    } else if (filterType === 'range' && dateRange?.from) {
                        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                        shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                        lignesQuery = lignesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
                    }

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
                        // Mixed roles
                        if (filterType === 'date') {
                            displayRole = 'both';
                        } else {
                            // For interval/month: "si il a occupé les 2 postes... n'affiche rien"
                            displayRole = null;
                        }
                    }

                    // 3. Productivity - Calculate theoretical production PER LINE
                    let productionTheoriqueTotal = 0;

                    // A. Process shifts (Chef de Quart) - Calculate per line
                    (shiftsData as any[]).forEach((s: any) => {
                        const shiftLines = s.lignes_production || [];
                        const shiftArrets = s.arrets_production || [];

                        shiftLines.forEach((l: any) => {
                            // Find stops affecting THIS specific line
                            const lineArrets = shiftArrets.filter((a: any) =>
                                a.lignes_concernees && a.lignes_concernees.includes(l.numero_ligne)
                            );

                            // Calculate downtime for this line (using duree_minutes or fallback)
                            let ligneTempsArret = 0;
                            lineArrets.forEach((a: any) => {
                                if (a.duree_minutes && a.duree_minutes > 0) {
                                    ligneTempsArret += a.duree_minutes;
                                } else if (a.heure_debut && a.heure_fin) {
                                    // Fallback for legacy data
                                    const [hD, mD] = a.heure_debut.split(':').map(Number);
                                    const [hF, mF] = a.heure_fin.split(':').map(Number);
                                    let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                                    if (diffMins < 0) diffMins += 24 * 60;
                                    ligneTempsArret += diffMins;
                                }
                            });

                            // Calculate theoretical for THIS line only
                            // Cap downtime at 540 min (9h) to avoid negative hours
                            const effectiveDowntime = Math.min(ligneTempsArret, 540);
                            const productiveHours = 9 - (effectiveDowntime / 60);

                            // Rate: Lines 1-4 = B6 (1600 × 6kg), Line 5 = B12 (900 × 12.5kg)
                            const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                            const contrib = (rate * productiveHours) / 1000; // Convert to Tonnes

                            productionTheoriqueTotal += contrib;
                        });
                    });

                    // B. Process lignes (Chef de Ligne) - Now with arrets from shift
                    (lignesData as any[]).forEach((l: any) => {
                        const shiftArrets = l.production_shifts?.arrets_production || [];

                        // Find stops affecting THIS specific line
                        const lineArrets = shiftArrets.filter((a: any) =>
                            a.lignes_concernees && a.lignes_concernees.includes(l.numero_ligne)
                        );

                        // Calculate downtime for this line
                        let ligneTempsArret = 0;
                        lineArrets.forEach((a: any) => {
                            if (a.duree_minutes && a.duree_minutes > 0) {
                                ligneTempsArret += a.duree_minutes;
                            } else if (a.heure_debut && a.heure_fin) {
                                const [hD, mD] = a.heure_debut.split(':').map(Number);
                                const [hF, mF] = a.heure_fin.split(':').map(Number);
                                let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                                if (diffMins < 0) diffMins += 24 * 60;
                                ligneTempsArret += diffMins;
                            }
                        });

                        // Calculate theoretical for this line
                        const effectiveDowntime = Math.min(ligneTempsArret, 540);
                        const productiveHours = 9 - (effectiveDowntime / 60);
                        const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                        const contrib = (rate * productiveHours) / 1000;
                        productionTheoriqueTotal += contrib;
                    });

                    // Calculate final productivity
                    let productivite = 0;
                    if (productionTheoriqueTotal > 0) {
                        productivite = (totalTonnage / productionTheoriqueTotal) * 100;
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
                        lines
                    };
                })
            );

            const sorted = agentsWithStats.sort((a, b) => {
                // 0. Primary: Active agents (tonnage > 0) first, inactive at bottom
                const aActive = a.tonnage > 0 ? 0 : 1;
                const bActive = b.tonnage > 0 ? 0 : 1;
                if (aActive !== bActive) return aActive - bActive;

                // 1. Secondary Sort: Role Group (Chef de Quart > Chef de Ligne > Others)
                const getRoleWeight = (role: string | null) => {
                    if (role === 'chef_quart') return 1;
                    if (role === 'chef_ligne') return 2;
                    return 3;
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
                    .select('*, production_shifts!inner(date, shift_type, arrets_production(*))')
                    .eq('chef_ligne_id', agentId)
                    .gte('production_shifts.date', start)
                    .lte('production_shifts.date', end);

                return [shiftsQuery, lignesQuery];
            };

            // Determine current period dates
            let startDate, endDate;
            if (filterType === 'month') {
                startDate = `${selectedMonth}-01`;
                const [y, m] = selectedMonth.split('-').map(Number);
                endDate = new Date(y, m, 0).toISOString().split('T')[0];
            } else if (filterType === 'date' && selectedDate) {
                startDate = format(selectedDate, 'yyyy-MM-dd');
                endDate = startDate;
            } else if (filterType === 'range' && dateRange?.from) {
                startDate = format(dateRange.from, 'yyyy-MM-dd');
                endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : startDate;
            } else {
                return null;
            }

            // Determine previous period dates for trend calculation
            let prevStartDate, prevEndDate;
            const startD = new Date(startDate);
            const endD = new Date(endDate);

            if (filterType === 'month') {
                const prevMonthDate = new Date(startD);
                prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                const prevY = prevMonthDate.getFullYear();
                const prevM = prevMonthDate.getMonth() + 1;
                prevStartDate = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
                prevEndDate = new Date(prevY, prevM, 0).toISOString().split('T')[0];
            } else {
                // For date and range, shift back by duration
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

                const arrets = shift.arrets_production || [];
                arrets.forEach((a: any) => {
                    if (a.heure_debut && a.heure_fin) {
                        const [hD, mD] = a.heure_debut.split(':').map(Number);
                        const [hF, mF] = a.heure_fin.split(':').map(Number);
                        let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                        if (diffMins < 0) diffMins += 24 * 60;
                        totalTempsArret += diffMins;
                    }
                });
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

                // Calculate downtime for Chef de Ligne (from shift's arrets_production)
                const shiftArrets = l.production_shifts?.arrets_production || [];
                const lineArrets = shiftArrets.filter((a: any) =>
                    a.lignes_concernees && a.lignes_concernees.includes(l.numero_ligne)
                );
                lineArrets.forEach((a: any) => {
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
            });

            totalBouteilles = totalRecharges + totalConsignes;

            const nombreShifts = shifts.length;
            const nombreLignes = lignes.length;
            const totalSessions = nombreShifts + nombreLignes;

            // Get unique lines occupied as chef de ligne
            const lignesOccupees = Array.from(new Set(lignes.map(l => l.numero_ligne))).sort();

            // NEW: Calculate productivity as average of individual session productivities
            const sessionProductivities: number[] = [];

            // Calculate productivity for each Chef de Quart shift
            shifts.forEach(shift => {
                const shiftTonnage = Number(shift.tonnage_total) || 0;
                const shiftTempsArret = Number(shift.temps_arret_total_minutes) || 0;
                const heuresProductives = 9 - (shiftTempsArret / 60);

                // Production théorique for all lines in this shift
                let productionTheorique = 0;
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    if (l.numero_ligne >= 1 && l.numero_ligne <= 4) {
                        productionTheorique += (1600 * 6 * heuresProductives) / 1000; // Tonnes
                    } else if (l.numero_ligne === 5) {
                        productionTheorique += (900 * 12.5 * heuresProductives) / 1000; // Tonnes
                    }
                });

                if (productionTheorique > 0) {
                    const shiftProductivity = (shiftTonnage / productionTheorique) * 100;
                    sessionProductivities.push(shiftProductivity);
                }
            });

            // Calculate productivity for each Chef de Ligne session
            lignes.forEach(ligne => {
                const ligneTonnage = Number(ligne.tonnage_ligne) || 0;
                const shift = ligne.production_shifts;

                // Get downtime for this specific line from the shift's arrêts
                let ligneTempsArret = 0;
                const arrets = shift?.arrets_production || [];
                arrets.forEach((arret: any) => {
                    if (arret.lignes_concernees?.includes(ligne.numero_ligne) && arret.heure_debut && arret.heure_fin) {
                        const [hD, mD] = arret.heure_debut.split(':').map(Number);
                        const [hF, mF] = arret.heure_fin.split(':').map(Number);
                        let diffMins = (hF * 60 + mF) - (hD * 60 + mD);
                        if (diffMins < 0) diffMins += 24 * 60;
                        ligneTempsArret += diffMins; // minutes
                    }
                });

                const heuresProductives = 9 - (ligneTempsArret / 60);

                // Production théorique for this specific line
                let productionTheorique = 0;
                if (ligne.numero_ligne >= 1 && ligne.numero_ligne <= 4) {
                    productionTheorique = (1600 * 6 * heuresProductives) / 1000; // Tonnes
                } else if (ligne.numero_ligne === 5) {
                    productionTheorique = (900 * 12.5 * heuresProductives) / 1000; // Tonnes
                }

                if (productionTheorique > 0) {
                    const ligneProductivity = (ligneTonnage / productionTheorique) * 100;
                    sessionProductivities.push(ligneProductivity);
                }
            });

            // Calculate average productivity
            const tauxPerformance = sessionProductivities.length > 0
                ? sessionProductivities.reduce((sum, p) => sum + p, 0) / sessionProductivities.length
                : 0;

            // Calculate ACTUAL performance for each day in daily history
            Object.keys(dailyHistory).forEach(date => {
                const dayProductivities: number[] = [];

                // Get productivities from shifts on this date
                shifts.forEach(shift => {
                    if (shift.date === date) {
                        const shiftTonnage = Number(shift.tonnage_total) || 0;
                        const shiftTempsArret = Number(shift.temps_arret_total_minutes) || 0;
                        const heuresProductives = 9 - (shiftTempsArret / 60);

                        let productionTheorique = 0;
                        const shiftLignes = shift.lignes_production || [];
                        shiftLignes.forEach((l: any) => {
                            if (l.numero_ligne >= 1 && l.numero_ligne <= 4) {
                                productionTheorique += (1600 * 6 * heuresProductives) / 1000;
                            } else if (l.numero_ligne === 5) {
                                productionTheorique += (900 * 12.5 * heuresProductives) / 1000;
                            }
                        });

                        if (productionTheorique > 0) {
                            dayProductivities.push((shiftTonnage / productionTheorique) * 100);
                        }
                    }
                });

                // Get productivities from lignes on this date
                lignes.forEach(ligne => {
                    if (ligne.production_shifts?.date === date) {
                        const ligneTonnage = Number(ligne.tonnage_ligne) || 0;
                        const shift = ligne.production_shifts;

                        let ligneTempsArret = 0;
                        const arrets = shift?.arrets_production || [];
                        arrets.forEach((arret: any) => {
                            if (arret.lignes_concernees?.includes(ligne.numero_ligne) && arret.heure_debut && arret.heure_fin) {
                                const debut = new Date(`2000-01-01T${arret.heure_debut}`);
                                const fin = new Date(`2000-01-01T${arret.heure_fin}`);
                                const diffMs = fin.getTime() - debut.getTime();
                                ligneTempsArret += diffMs / 60000;
                            }
                        });

                        const heuresProductives = 9 - (ligneTempsArret / 60);

                        let productionTheorique = 0;
                        if (ligne.numero_ligne >= 1 && ligne.numero_ligne <= 4) {
                            productionTheorique = (1600 * 6 * heuresProductives) / 1000;
                        } else if (ligne.numero_ligne === 5) {
                            productionTheorique = (900 * 12.5 * heuresProductives) / 1000;
                        }

                        if (productionTheorique > 0) {
                            dayProductivities.push((ligneTonnage / productionTheorique) * 100);
                        }
                    }
                });

                // Calculate average productivity for this day
                const dayPerf = dayProductivities.length > 0
                    ? dayProductivities.reduce((sum, p) => sum + p, 0) / dayProductivities.length
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

            // From shifts (Chef de Quart - arrêts affect specified lines)
            shifts.forEach(shift => {
                const arrets = shift.arrets_production || [];
                arrets.forEach((arret: any) => {
                    const duration = getArretDuration(arret);
                    if (duration > 0) {
                        const lignesConcernees = arret.lignes_concernees || [];
                        lignesConcernees.forEach((lineNum: number) => {
                            downtimeByLine[lineNum] = (downtimeByLine[lineNum] || 0) + duration;
                        });
                    }
                });
            });

            // From lignes (Chef de Ligne - get arrêts from parent shift affecting this line)
            lignes.forEach(ligne => {
                const shift = ligne.production_shifts;
                const arrets = shift?.arrets_production || [];
                arrets.forEach((arret: any) => {
                    if (arret.lignes_concernees?.includes(ligne.numero_ligne)) {
                        const duration = getArretDuration(arret);
                        if (duration > 0) {
                            downtimeByLine[ligne.numero_ligne] = (downtimeByLine[ligne.numero_ligne] || 0) + duration;
                        }
                    }
                });
            });

            // NEW: Daily Productivity Array (sorted by date)
            const dailyProductivity = Object.entries(dailyHistory)
                .map(([date, data]) => ({
                    date,
                    productivite: data.tauxPerformance
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // NEW: Taux de Présence (Attendance Rate)
            const totalShiftsWorked = nombreShifts + nombreLignes;
            const expectedHours = totalShiftsWorked * 9; // 9 hours per shift
            const downtimeHours = totalTempsArret / 60; // Convert minutes to hours
            const actualHours = expectedHours - downtimeHours;
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
                lineBreakdown: lineBreakdownArray
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
                ['Période:', filterType === 'month' ? selectedMonth : filterType === 'date' ? (selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '-') : (dateRange?.from ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}` : '-'), '', '', '', '', ''],
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
                    <p className="text-muted-foreground">Suivi détaillé de la production et des performances</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="h-9 gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                        onClick={exportDashboardToExcel}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Rapport Excel
                    </Button>
                    <Select value={filterType} onValueChange={(value: 'month' | 'date' | 'range') => setFilterType(value)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Par mois</SelectItem>
                            <SelectItem value="date">Par date</SelectItem>
                            <SelectItem value="range">Par période</SelectItem>
                        </SelectContent>
                    </Select>

                    {filterType === 'month' && (
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]">
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
                    )}

                    {filterType === 'date' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Sélectionner une date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    locale={fr}
                                    disabled={{ after: new Date() }}
                                    className="pointer-events-auto"
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {filterType === 'range' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-[280px] justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd/MM/yyyy")
                                        )
                                    ) : (
                                        "Sélectionner une période"
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
                                    className="pointer-events-auto"
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

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
                        <div className="flex items-center justify-between mb-2">
                            <div
                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
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
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Image
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportSectionAsPDF(section2Ref, 'detail-par-ligne')}
                                >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    PDF
                                </Button>
                            </div>
                        </div>
                        {isLinesExpanded && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[...stats.lines]
                                    .sort((a, b) => b.tonnage - a.tonnage)
                                    .map((line, index) => {
                                        const rank = index + 1;
                                        let statusColor = "red";
                                        if (rank === 1) statusColor = "green";
                                        else if (rank >= 2 && rank <= 4) statusColor = "orange";
                                        else statusColor = "red";

                                        const borderClass = statusColor === 'green' ? 'border-l-green-500' :
                                            statusColor === 'orange' ? 'border-l-orange-500' : 'border-l-red-500';

                                        const bgClass = statusColor === 'green' ? 'bg-green-50/50' :
                                            statusColor === 'orange' ? 'bg-orange-50/50' : 'bg-red-50/50';

                                        const badgeClass = statusColor === 'green' ? 'bg-green-600 text-white' :
                                            statusColor === 'orange' ? 'bg-orange-600 text-white' : 'bg-red-600 text-white';

                                        const textClass = statusColor === 'green' ? 'text-green-600' :
                                            statusColor === 'orange' ? 'text-orange-600' : 'text-red-600';

                                        return (
                                            <div key={line.id} className={`p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 ${borderClass} ${bgClass}`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`font-bold px-3 py-1 rounded-md text-sm shadow-sm ${badgeClass}`}>
                                                            {rank === 1 ? '1er' : `${rank}e`}
                                                        </div>

                                                        <span className="font-bold text-muted-foreground text-sm uppercase tracking-wider mx-1">
                                                            Ligne {line.id}
                                                        </span>

                                                        <span className={`font-extrabold text-2xl tracking-tight ${textClass}`}>
                                                            {(line.tonnage * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                            <span className="text-lg opacity-70 ml-1">Kg</span>
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-extrabold text-primary bg-primary/5 px-3 py-1.5 rounded-md border border-primary/10">
                                                        {stats.totalTonnage > 0 ? ((line.tonnage / stats.totalTonnage) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm bg-muted/30 p-3 rounded-md border">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Recharges:</span>
                                                        <span className="font-bold text-foreground text-base">{line.recharges.toLocaleString('fr-FR')}</span>
                                                        <span className="text-muted-foreground mx-1">•</span>
                                                        <span className="font-bold text-blue-600">{line.rechargesKg.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg</span>
                                                    </div>
                                                    <div className="h-4 w-px bg-border"></div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Consignes:</span>
                                                        <span className="font-bold text-foreground text-base">{line.consignes.toLocaleString('fr-FR')}</span>
                                                        <span className="text-muted-foreground mx-1">•</span>
                                                        <span className="font-bold text-green-600">{line.consignesKg.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                </CardContent >
            </Card >

            {/* 2. PRODUCTIVITÉ PAR AGENT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                            onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
                        >
                            {isAgentsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                PRODUCTIVITÉ PAR AGENT
                            </CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsImage(section3Ref, 'productivite-par-agent')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Image
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportSectionAsPDF(section3Ref, 'productivite-par-agent')}
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8 pt-6" ref={section3Ref}>
                    {isAgentsExpanded && (
                        <>
                            {/* Comparison Chart */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stat des agents</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {allAgentsComparison.map((agent, index) => {
                                        const isFirst = index === 0;
                                        const isLast = index === allAgentsComparison.length - 1 && allAgentsComparison.length > 1;

                                        // Determine separator for Chef de Ligne
                                        const needsChefLigneSeparator = index > 0 &&
                                            agent.displayRole === 'chef_ligne' &&
                                            allAgentsComparison[index - 1].displayRole === 'chef_quart';

                                        // Determine separator for inactive agents (tonnage = 0)
                                        const needsInactiveSeparator = index > 0 &&
                                            agent.tonnage === 0 &&
                                            allAgentsComparison[index - 1].tonnage > 0;

                                        // Calculate Contribution Color Status
                                        const contribution = stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0;
                                        let statusColor = "red"; // default
                                        if (agent.displayRole === 'chef_quart') {
                                            statusColor = contribution > 50 ? "green" : "red";
                                        } else {
                                            // Chef de Ligne
                                            if (contribution > 8) statusColor = "green";
                                            else if (contribution >= 5) statusColor = "orange";
                                            else statusColor = "red";
                                        }

                                        // Map status to Tailwind classes
                                        const borderClass = statusColor === 'green' ? 'border-l-green-500' :
                                            statusColor === 'orange' ? 'border-l-orange-500' : 'border-l-red-500';

                                        const bgClass = statusColor === 'green' ? 'bg-green-50/50' :
                                            statusColor === 'orange' ? 'bg-orange-50/50' : 'bg-red-50/50';

                                        const rankClass = statusColor === 'green' ? 'bg-green-100 text-green-700 border-green-400' :
                                            statusColor === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                'bg-red-100 text-red-700 border-red-300';

                                        const barClass = statusColor === 'green' ? 'bg-green-500' :
                                            statusColor === 'orange' ? 'bg-orange-500' : 'bg-red-500';

                                        return (
                                            <Fragment key={agent.id}>
                                                {needsChefLigneSeparator && (
                                                    <div className="col-span-1 lg:col-span-2 flex items-center gap-4 my-4">
                                                        <div className="h-px bg-border flex-1" />
                                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                                            Chefs de Ligne
                                                        </span>
                                                        <div className="h-px bg-border flex-1" />
                                                    </div>
                                                )}

                                                {needsInactiveSeparator && (
                                                    <div className="col-span-1 lg:col-span-2 flex items-center gap-4 my-4">
                                                        <div className="h-[1px] bg-muted-foreground/30 flex-1" />
                                                        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                                                            Sans activité sur la période
                                                        </span>
                                                        <div className="h-[1px] bg-muted-foreground/30 flex-1" />
                                                    </div>
                                                )}

                                                <Card
                                                    className={cn(
                                                        "cursor-pointer transition-all hover:shadow-md border-l-4 group",
                                                        borderClass,
                                                        // Only apply background tint if it was previously applied logic (first/last) OR we can apply it to all based on status?
                                                        // User asked for border and rank. Let's keep background subtle or remove specific first/last logic to be consistent with color.
                                                        // Let's apply the tint based on status for consistency as requested "harmoniser tout ça"
                                                        bgClass
                                                    )}
                                                    onClick={() => {
                                                        setSelectedAgentForModal(agent.id);
                                                    }}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-4">
                                                            {/* 1. RANK */}
                                                            <div className={cn(
                                                                "flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full font-extrabold text-2xl border-4 shadow-sm",
                                                                rankClass
                                                            )}>
                                                                {agent.displayRole === 'chef_quart' ?
                                                                    `#${allAgentsComparison.filter(a => a.displayRole === 'chef_quart').findIndex(a => a.id === agent.id) + 1}` :
                                                                    `#${allAgentsComparison.filter(a => a.displayRole === 'chef_ligne').findIndex(a => a.id === agent.id) + 1}`
                                                                }
                                                            </div>

                                                            {/* 2. INFO (Name) */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "font-bold text-lg truncate group-hover:text-primary transition-colors"
                                                                    )}>
                                                                        {agent.prenom} {agent.nom}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {agent.displayRole === 'chef_ligne' && agent.lines && agent.lines.length > 0 && (
                                                                            <span className="text-xs text-muted-foreground truncate">
                                                                                ({agent.lines.join(', ')})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 3. STATS (Prod & Tonnage) */}
                                                            <div className="text-right flex-shrink-0">
                                                                <div className={cn(
                                                                    "text-xl font-extrabold",
                                                                    agent.productivite >= 90 ? "text-green-600" :
                                                                        agent.productivite >= 70 ? "text-orange-600" : "text-red-600"
                                                                )}>
                                                                    {(agent.productivite || 0).toFixed(1)}%
                                                                </div>
                                                                <div className="text-sm font-bold text-foreground mt-0.5">
                                                                    {(agent.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 4. PROGRESS BAR */}
                                                        <div className="mt-4 space-y-1.5">
                                                            <div className="flex justify-between text-xs uppercase tracking-wider font-bold text-foreground items-end">
                                                                <span className="text-muted-foreground font-semibold text-[10px] mb-0.5">Contribution</span>
                                                                <span className="text-primary text-lg font-extrabold leading-none">
                                                                    {stats.totalTonnage > 0 ? ((agent.tonnage / stats.totalTonnage) * 100).toFixed(1) : 0}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full transition-all", barClass)}
                                                                    style={{ width: `${stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Agent Details Modal */}
            <Dialog open={!!selectedAgentForModal} onOpenChange={(open) => !open && setSelectedAgentForModal(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.prenom} {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.nom}
                            </DialogTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const agent = allAgentsComparison.find(a => a.id === selectedAgentForModal);
                                        const filename = `statistiques-${agent?.prenom}-${agent?.nom}`.toLowerCase().replace(/\s+/g, '-');
                                        exportSectionAsImage(agentModalRef, filename);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Image
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const agent = allAgentsComparison.find(a => a.id === selectedAgentForModal);
                                        const filename = `statistiques-${agent?.prenom}-${agent?.nom}`.toLowerCase().replace(/\s+/g, '-');
                                        exportSectionAsPDF(agentModalRef, filename);
                                    }}
                                >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {agentModalData ? (
                        <div className="space-y-6 py-4" ref={agentModalRef}>

                            {/* CARD 1: Volume Produit */}
                            <Card className="border-l-4 border-l-blue-500">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-600" />
                                        Volume Produit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Main Tonnage */}
                                    <div className="text-center p-4 bg-blue-50/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Volume Produit</p>
                                        <p className="text-4xl font-extrabold text-blue-600">
                                            {(agentModalData.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-2xl">Kg</span>
                                        </p>
                                    </div>

                                    {/* Répartition par Ligne */}
                                    {agentModalData.lineBreakdown && agentModalData.lineBreakdown.length > 0 && (filterType === 'month' || filterType === 'range') && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Répartition par Ligne</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {agentModalData.lineBreakdown.map((line: any, i: number) => (
                                                    <div key={i} className="p-3 border rounded-lg text-center bg-white hover:shadow-md transition-shadow">
                                                        <p className="text-xs font-semibold text-muted-foreground mb-1">{line.ligne}</p>
                                                        <p className="text-lg font-bold text-blue-600">
                                                            {(line.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">Kg</p>
                                                        <p className="text-xs font-medium text-blue-600 mt-0.5">
                                                            {agentModalData.tonnage > 0 ? ((line.tonnage / agentModalData.tonnage) * 100).toFixed(1) : 0}%
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">{line.sessions} shift{line.sessions > 1 ? 's' : ''}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Répartition par Client */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Répartition par Client</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="p-3 border rounded-lg bg-orange-50/50">
                                                <p className="text-xs font-semibold text-orange-700 uppercase mb-2">Petro Ivoire</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Recharges:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.petro.recharges.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Consignes:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.petro.consignes.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t">
                                                        <span className="font-semibold">Cumul:</span>
                                                        <span className="font-extrabold text-orange-700">{agentModalData.clientBreakdown.petro.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-green-50/50">
                                                <p className="text-xs font-semibold text-green-700 uppercase mb-2">Vivo Energies</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Recharges:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.vivo.recharges.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Consignes:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.vivo.consignes.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t">
                                                        <span className="font-semibold">Cumul:</span>
                                                        <span className="font-extrabold text-green-700">{agentModalData.clientBreakdown.vivo.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-3 border rounded-lg bg-purple-50/50">
                                                <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Total Energies</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Recharges:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.total.recharges.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Consignes:</span>
                                                        <span className="font-bold">{agentModalData.clientBreakdown.total.consignes.toLocaleString('fr-FR')}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1 border-t">
                                                        <span className="font-semibold">Cumul:</span>
                                                        <span className="font-extrabold text-purple-700">{agentModalData.clientBreakdown.total.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CARD 2: Productivité */}
                            <Card className="border-l-4 border-l-green-500">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ArrowUp className="h-5 w-5 text-green-600" />
                                        Productivité
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Main Productivity */}
                                    <div className="text-center p-4 bg-green-50/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Taux de Performance</p>
                                        <p className={`text-4xl font-extrabold ${agentModalData.tauxPerformance >= 90 ? 'text-green-600' :
                                            agentModalData.tauxPerformance >= 70 ? 'text-orange-500' : 'text-red-600'
                                            }`}>
                                            {agentModalData.tauxPerformance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} <span className="text-2xl">%</span>
                                        </p>
                                    </div>

                                    {/* Daily Evolution Curve */}
                                    {agentModalData.dailyProductivity && agentModalData.dailyProductivity.length > 0 && (filterType === 'month' || filterType === 'range') && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Évolution sur la Période</h4>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={agentModalData.dailyProductivity}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    />
                                                    <YAxis />
                                                    <Tooltip
                                                        labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR')}
                                                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Productivité']}
                                                    />
                                                    <Line type="monotone" dataKey="productivite" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* CARD 3: Temps d'Arrêt */}
                            <Card className="border-l-4 border-l-orange-500">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ArrowDown className="h-5 w-5 text-orange-600" />
                                        Temps d'Arrêt
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Main Downtime */}
                                    <div className="text-center p-4 bg-orange-50/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Temps d'Arrêt Cumulé</p>
                                        <p className="text-4xl font-extrabold text-orange-600">
                                            {Math.floor(agentModalData.tempsArretMinutes / 60)}<span className="text-2xl">h</span>
                                            {Math.round(agentModalData.tempsArretMinutes % 60)}<span className="text-2xl">m</span>
                                        </p>
                                    </div>

                                    {/* Downtime per Line */}
                                    {agentModalData.downtimeByLine && Object.keys(agentModalData.downtimeByLine).length > 0 && (filterType === 'month' || filterType === 'range') && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Répartition par Ligne</h4>
                                            <div className="space-y-2">
                                                {Object.entries(agentModalData.downtimeByLine)
                                                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                                                    .map(([line, minutes]) => (
                                                        <div key={line} className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-muted-foreground w-16">Ligne {line}</span>
                                                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                                                <div
                                                                    className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                                                                    style={{
                                                                        width: `${Math.min(100, ((minutes as number) / agentModalData.tempsArretMinutes) * 100)}%`
                                                                    }}
                                                                >
                                                                    <span className="text-xs font-bold text-white">
                                                                        {Math.floor((minutes as number) / 60)}h{Math.round((minutes as number) % 60)}m
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* CARD 4: Taux de Présence */}
                            <Card className="border-l-4 border-l-purple-500">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-purple-600" />
                                        Taux de Présence
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Main Attendance Rate */}
                                    <div className="text-center p-4 bg-purple-50/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Taux de Présence</p>
                                        <p className={`text-4xl font-extrabold ${agentModalData.tauxPresence >= 95 ? 'text-green-600' :
                                            agentModalData.tauxPresence >= 85 ? 'text-orange-500' : 'text-red-600'
                                            }`}>
                                            {agentModalData.tauxPresence.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} <span className="text-2xl">%</span>
                                        </p>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="p-3 border rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Heures Attendues</p>
                                            <p className="text-2xl font-bold text-primary">{agentModalData.expectedHours}h</p>
                                        </div>
                                        <div className="p-3 border rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Heures Réelles</p>
                                            <p className="text-2xl font-bold text-green-600">{agentModalData.actualHours.toFixed(1)}h</p>
                                        </div>
                                        <div className="p-3 border rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Shifts Travaillés</p>
                                            <p className="text-2xl font-bold text-purple-600">{agentModalData.nombreShifts + agentModalData.nombreLignes}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

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
