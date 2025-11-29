import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Loader2, Factory, Users, ArrowUp, ArrowDown, Calendar as CalendarIcon, Package } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProductionHistory from './ProductionHistory';

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
        }
    });

    // Agent productivity states
    const [allAgents, setAllAgents] = useState<any[]>([]);
    const [allAgentsComparison, setAllAgentsComparison] = useState<any[]>([]);
    const [selectedAgentForModal, setSelectedAgentForModal] = useState<string | null>(null);
    const [agentModalData, setAgentModalData] = useState<any>(null);


    // Agent Filter States (default to current month)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Production History States
    const [productionHistory, setProductionHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<string | null>(null);
    const [editModalData, setEditModalData] = useState<any>(null);
    const [historyFilterType, setHistoryFilterType] = useState<'all' | 'month' | 'date' | 'range'>('all');
    const [historySelectedMonth, setHistorySelectedMonth] = useState<string>(currentMonth);
    const [historySelectedDate, setHistorySelectedDate] = useState<Date | undefined>(undefined);
    const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>(undefined);
    const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('all');
    const [historyLigneFilter, setHistoryLigneFilter] = useState<string>('all');
    const [historyChefFilter, setHistoryChefFilter] = useState<string>('all');

    // Generate last 12 months for filter
    const availableMonths = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7);
    });

    useEffect(() => {
        fetchStats();
        fetchAgents();
    }, [dateRange, filterType, selectedDate, selectedMonth]);

    useEffect(() => {
        fetchAllAgentsComparison();
    }, [filterType, selectedMonth, selectedDate, dateRange]);

    // Load production history when filters change
    useEffect(() => {
        fetchProductionHistory();
    }, [historyFilterType, historySelectedMonth, historySelectedDate, historyDateRange, historyShiftFilter, historyLigneFilter, historyChefFilter]);

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
                }
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
                        .select('tonnage_total, arrets_production(*), lignes_production(numero_ligne)')
                        .eq('chef_quart_id', agent.id);

                    // Query lignes as chef de ligne
                    let lignesQuery = supabase
                        .from('lignes_production')
                        .select('tonnage_ligne, numero_ligne, production_shifts!inner(date)')
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

                    // 3. Productivity
                    let totalTempsArret = 0;
                    // Cast to any to avoid TS errors with joined tables
                    (shiftsData as any[]).forEach((s: any) => {
                        (s.arrets_production || []).forEach((a: any) => {
                            if (a.heure_debut && a.heure_fin) {
                                const debut = new Date(`2000-01-01T${a.heure_debut}`);
                                const fin = new Date(`2000-01-01T${a.heure_fin}`);
                                totalTempsArret += (fin.getTime() - debut.getTime()) / 60000;
                            }
                        });
                    });

                    const totalSessions = countQuart + countLigne;
                    let productivite = 0;

                    if (totalSessions > 0) {
                        const heuresProductives = totalSessions * 9 - (totalTempsArret / 60);
                        let productionTheorique = 0;

                        // From shifts
                        (shiftsData as any[]).forEach((s: any) => {
                            (s.lignes_production || []).forEach((l: any) => {
                                const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                                productionTheorique += (rate * (heuresProductives / totalSessions)) / 1000;
                            });
                        });

                        // From lignes
                        (lignesData as any[]).forEach((l: any) => {
                            const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                            productionTheorique += (rate * (heuresProductives / totalSessions)) / 1000;
                        });

                        productivite = productionTheorique > 0 ? (totalTonnage / productionTheorique) * 100 : 0;
                    }

                    return {
                        id: agent.id,
                        nom: agent.nom,
                        prenom: agent.prenom,
                        tonnage: totalTonnage,
                        displayRole,
                        productivite
                    };
                })
            );

            const sorted = agentsWithStats.sort((a, b) => b.tonnage - a.tonnage);
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
                    .select('*, production_shifts!inner(date, shift_type)')
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
                        const debut = new Date(`2000-01-01T${a.heure_debut}`);
                        const fin = new Date(`2000-01-01T${a.heure_fin}`);
                        const diffMs = fin.getTime() - debut.getTime();
                        totalTempsArret += diffMs / 60000;
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
            });

            totalBouteilles = totalRecharges + totalConsignes;

            const nombreShifts = shifts.length;
            const nombreLignes = lignes.length;
            const totalSessions = nombreShifts + nombreLignes;

            // Get unique lines occupied as chef de ligne
            const lignesOccupees = Array.from(new Set(lignes.map(l => l.numero_ligne))).sort();

            // Calculate performance rate
            const heuresProductives = totalSessions * 9 - (totalTempsArret / 60);
            let productionTheorique = 0;

            // From shifts (all lines)
            shifts.forEach(shift => {
                const shiftLignes = shift.lignes_production || [];
                shiftLignes.forEach((l: any) => {
                    if (l.numero_ligne >= 1 && l.numero_ligne <= 4) {
                        productionTheorique += (1600 * 6 * (heuresProductives / totalSessions)) / 1000; // Convert to Tonnes
                    } else if (l.numero_ligne === 5) {
                        productionTheorique += (900 * 12.5 * (heuresProductives / totalSessions)) / 1000; // Convert to Tonnes
                    }
                });
            });

            // From lignes (specific lines)
            const uniqueLines = new Set(lignes.map(l => l.numero_ligne));
            uniqueLines.forEach(numeroLigne => {
                if (numeroLigne >= 1 && numeroLigne <= 4) {
                    productionTheorique += (1600 * 6 * (heuresProductives / totalSessions)) / 1000; // Convert to Tonnes
                } else if (numeroLigne === 5) {
                    productionTheorique += (900 * 12.5 * (heuresProductives / totalSessions)) / 1000; // Convert to Tonnes
                }
            });

            const tauxPerformance = productionTheorique > 0 ? (totalTonnage / productionTheorique) * 100 : 0;

            // Calculate performance for each day in daily history
            Object.keys(dailyHistory).forEach(date => {
                // Simplified performance calculation for daily view
                const dayTonnage = dailyHistory[date].tonnage;
                const dayPerf = productionTheorique > 0 ? (dayTonnage / (productionTheorique / totalSessions)) * 100 : 0;
                dailyHistory[date].tauxPerformance = dayPerf;
            });

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
                // New data
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

    // ===== PRODUCTION HISTORY FUNCTIONS =====

    const fetchProductionHistory = async () => {
        try {
            setHistoryLoading(true);

            // Determine date range based on filter type
            let startDate: string | undefined;
            let endDate: string | undefined;
            if (historyFilterType === 'month') {
                startDate = `${historySelectedMonth}-01`;
                const [y, m] = historySelectedMonth.split('-').map(Number);
                endDate = new Date(y, m, 0).toISOString().split('T')[0];
            } else if (historyFilterType === 'date' && historySelectedDate) {
                startDate = format(historySelectedDate, 'yyyy-MM-dd');
                endDate = startDate;
            } else if (historyFilterType === 'range' && historyDateRange?.from) {
                startDate = format(historyDateRange.from, 'yyyy-MM-dd');
                endDate = historyDateRange.to ? format(historyDateRange.to, 'yyyy-MM-dd') : startDate;
            }

            // Build query
            let query = supabase
                .from('production_shifts')
                .select(`
                    *,
                    chef_quart:chefs_quart!production_shifts_chef_quart_id_fkey(id, nom, prenom),
                    lignes_production(*),
                    arrets_production(*),
                    production_modifications(*)
                `)
                .order('date', { ascending: false })
                .order('shift_type', { ascending: false });

            // Apply date filters only if a period is defined
            if (startDate && endDate) {
                query = query.gte('date', startDate).lte('date', endDate);
            }

            // Apply filters
            if (historyShiftFilter !== 'all') {
                const shiftValue = historyShiftFilter === '1' ? '10h-19h' : '20h-5h';
                query = query.eq('shift_type', shiftValue);
            }

            if (historyChefFilter !== 'all') {
                query = query.eq('chef_quart_id', historyChefFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Filter by ligne if needed (post-query since it's in related table)
            let filteredData = data || [];
            if (historyLigneFilter !== 'all') {
                filteredData = filteredData.filter((shift: any) => {
                    const lignes = shift.lignes_production || [];
                    return lignes.some((l: any) => l.numero_ligne === parseInt(historyLigneFilter));
                });
            }

            setProductionHistory(filteredData);
        } catch (error) {
            console.error('Error fetching production history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const updateProductionShift = async (shiftId: string, updates: any, reason: string) => {
        try {
            // 1. Get current values
            const { data: currentShift, error: fetchError } = await supabase
                .from('production_shifts')
                .select('*')
                .eq('id', shiftId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Create audit trail entry (TODO: Implement when production_modifications table is created)
            // const { data: { user } } = await supabase.auth.getUser();
            // await supabase.from('production_modifications').insert({ ... });

            // 3. Update production_shifts
            const { error: updateError } = await supabase
                .from('production_shifts')
                .update(updates)
                .eq('id', shiftId);

            if (updateError) throw updateError;

            // 4. Refresh history
            await fetchProductionHistory();

            return { success: true };
        } catch (error) {
            console.error('Error updating production shift:', error);
            return { success: false, error };
        }
    };

    const deleteProductionShift = async (shiftId: string, reason: string) => {
        try {
            // 1. Get current values for audit
            const { data: currentShift, error: fetchError } = await supabase
                .from('production_shifts')
                .select('*')
                .eq('id', shiftId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Create audit trail entry (TODO: Implement when production_modifications table is created)
            // const { data: { user } } = await supabase.auth.getUser();
            // await supabase.from('production_modifications').insert({ ... });

            // 3. Delete production_shifts (cascade will delete related records)
            const { error: deleteError } = await supabase
                .from('production_shifts')
                .delete()
                .eq('id', shiftId);

            if (deleteError) throw deleteError;

            // 4. Refresh history
            await fetchProductionHistory();

            return { success: true };
        } catch (error) {
            console.error('Error deleting production shift:', error);
            return { success: false, error };
        }
    };

    const fetchShiftDetailsForEdit = async (shiftId: string) => {
        try {
            const { data, error } = await supabase
                .from('production_shifts')
                .select(`
                    *,
                    chef_quart:chefs_quart!production_shifts_chef_quart_id_fkey(id, nom, prenom),
                    lignes_production(*),
                    arrets_production(*)
                `)
                .eq('id', shiftId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching shift details:', error);
            return null;
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
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Factory className="h-5 w-5" />
                        PRODUCTION GLOBALE
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Global Tonnage with Recharges, Consignes and Clients */}
                    {/* Global Tonnage with Recharges, Consignes and Clients */}
                    {/* Global Tonnage with Recharges, Consignes and Clients */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="text-center mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Production Totale</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="border-t my-4"></div>

                    {/* Lines Breakdown */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Détail par Ligne</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {stats.lines.map((line) => {
                                const isBest = line.id === stats.maxLine.id && line.tonnage > 0;
                                const isWorst = line.id === stats.minLine.id && line.tonnage > 0 && stats.lines.filter(l => l.tonnage > 0).length > 1;

                                return (
                                    <div key={line.id} className={`p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 ${isBest ? 'border-l-green-500 bg-green-50/50' :
                                        isWorst ? 'border-l-red-500 bg-red-50/50' :
                                            'border-l-blue-500'
                                        }`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`font-bold px-3 py-1 rounded-md text-sm shadow-sm ${isBest ? 'bg-green-600 text-white' :
                                                    isWorst ? 'bg-red-600 text-white' :
                                                        'bg-blue-600 text-white'
                                                    }`}>
                                                    Ligne {line.id}
                                                </div>
                                                {isBest && (
                                                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                        🏆 Meilleure
                                                    </span>
                                                )}
                                                {isWorst && (
                                                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                                                        ⚠️ À améliorer
                                                    </span>
                                                )}
                                                <span className={`font-extrabold text-2xl tracking-tight ${isBest ? 'text-green-600' :
                                                    isWorst ? 'text-red-600' :
                                                        'text-blue-600'
                                                    }`}>
                                                    {(line.tonnage * 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    <span className="text-lg opacity-70 ml-1">Kg</span>
                                                </span>
                                            </div>
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
                    </div>

                </CardContent >
            </Card >

            {/* 2. PRODUCTIVITÉ PAR AGENT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        PRODUCTIVITÉ PAR AGENT
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-8 pt-6">
                    {/* Comparison Chart */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comparaison de tous les agents</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {allAgentsComparison.map((agent, index) => {
                                const isFirst = index === 0;
                                const isLast = index === allAgentsComparison.length - 1 && allAgentsComparison.length > 1;

                                // Determine border color
                                let borderColor = "border-l-blue-500";
                                if (isFirst) borderColor = "border-l-green-500";
                                if (isLast) borderColor = "border-l-red-500";

                                // Determine separator
                                const needsSeparator = index > 0 &&
                                    agent.displayRole === 'chef_ligne' &&
                                    allAgentsComparison[index - 1].displayRole === 'chef_quart';

                                return (
                                    <>
                                        {needsSeparator && (
                                            <div className="col-span-1 lg:col-span-2 flex items-center gap-4 my-4">
                                                <div className="h-px bg-border flex-1" />
                                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                                    Chefs de Ligne
                                                </span>
                                                <div className="h-px bg-border flex-1" />
                                            </div>
                                        )}

                                        <Card
                                            key={agent.id}
                                            className={cn(
                                                "cursor-pointer transition-all hover:shadow-md border-l-4",
                                                borderColor
                                            )}
                                            onClick={() => {
                                                setSelectedAgentForModal(agent.id);
                                                fetchAgentDetailedStats(agent.id).then(data => setAgentModalData(data));
                                            }}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn(
                                                                "font-bold text-lg",
                                                                isFirst ? "text-green-600" : isLast ? "text-red-600" : "text-foreground"
                                                            )}>
                                                                {agent.prenom} {agent.nom}
                                                            </span>

                                                            {/* Role Badge */}
                                                            {agent.displayRole === 'chef_quart' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium border border-blue-200">
                                                                    Chef de Quart
                                                                </span>
                                                            )}
                                                            {agent.displayRole === 'chef_ligne' && (
                                                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium border border-orange-200">
                                                                    Chef de Ligne
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isFirst && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                🏆 Meilleur
                                                            </span>
                                                        )}
                                                        {isLast && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                ⚠️ À améliorer
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-extrabold">
                                                            {(agent.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                        </div>
                                                        {/* Productivity Display */}
                                                        <div className={cn(
                                                            "text-sm font-medium mt-1",
                                                            agent.productivite >= 90 ? "text-green-600" :
                                                                agent.productivite >= 70 ? "text-orange-600" : "text-red-600"
                                                        )}>
                                                            Prod: {(agent.productivite || 0).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                        <span>Contribution</span>
                                                        <span>{stats.totalTonnage > 0 ? ((agent.tonnage / stats.totalTonnage) * 100).toFixed(1) : 0}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all",
                                                                isFirst ? "bg-green-500" : isLast ? "bg-red-500" : "bg-blue-500"
                                                            )}
                                                            style={{ width: `${stats.totalTonnage > 0 ? (agent.tonnage / stats.totalTonnage) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Agent Details Modal */}
            <Dialog open={!!selectedAgentForModal} onOpenChange={(open) => !open && setSelectedAgentForModal(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.prenom} {allAgentsComparison.find(a => a.id === selectedAgentForModal)?.nom}
                        </DialogTitle>
                    </DialogHeader>

                    {agentModalData ? (
                        <div className="space-y-6 py-4">
                            {/* Key Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-center">
                                    <p className="text-sm text-muted-foreground mb-1">Tonnage Total</p>
                                    <p className="text-3xl font-bold text-primary">{(agentModalData.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Kg</p>
                                    {agentModalData.trend !== undefined && (
                                        <div className={`flex items-center justify-center gap-1 mt-2 text-sm font-medium ${agentModalData.trend > 0 ? 'text-green-600' : agentModalData.trend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                            {agentModalData.trend > 0 ? <ArrowUp className="h-4 w-4" /> : agentModalData.trend < 0 ? <ArrowDown className="h-4 w-4" /> : null}
                                            <span>{Math.abs(agentModalData.trend).toFixed(1)}%</span>
                                            <span className="text-xs text-muted-foreground font-normal">vs préc.</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-white rounded-xl border text-center shadow-sm">
                                    <p className="text-sm text-muted-foreground mb-1">Productivité</p>
                                    <p className={`text-3xl font-bold ${agentModalData.tauxPerformance >= 90 ? 'text-green-600' :
                                        agentModalData.tauxPerformance >= 70 ? 'text-orange-500' : 'text-red-600'
                                        }`}>
                                        {agentModalData.tauxPerformance.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%
                                    </p>
                                </div>
                                <div className="p-4 bg-white rounded-xl border text-center shadow-sm">
                                    <p className="text-sm text-muted-foreground mb-1">Temps d'Arrêt</p>
                                    <p className="text-3xl font-bold text-orange-600">
                                        {Math.floor(agentModalData.tempsArretMinutes / 60)}h{Math.round(agentModalData.tempsArretMinutes % 60)}
                                    </p>
                                </div>
                            </div>

                            {/* 3-Month Sparkline */}
                            {agentModalData.last3Months && agentModalData.last3Months.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tendance 3 Derniers Mois</h3>
                                    <div className="p-4 border rounded-xl bg-white flex items-center gap-4">
                                        <div className="flex-1">
                                            <ResponsiveContainer width="100%" height={60}>
                                                <AreaChart data={agentModalData.last3Months}>
                                                    <defs>
                                                        <linearGradient id="colorTonnage" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Area type="monotone" dataKey="tonnage" stroke="#0088FE" fillOpacity={1} fill="url(#colorTonnage)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="text-right">
                                            {agentModalData.last3Months.map((m: any, i: number) => (
                                                <div key={i} className="text-xs">
                                                    <span className="font-medium text-muted-foreground">{m.month}:</span>{' '}
                                                    <span className="font-bold">{(m.tonnage * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Best/Worst Day Badges */}
                            {(agentModalData.bestDay || agentModalData.worstDay) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {agentModalData.bestDay && (
                                        <div className="p-4 border-l-4 border-l-green-500 bg-green-50/50 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="text-2xl">🏆</span>
                                                <div>
                                                    <p className="text-xs font-semibold text-green-700 uppercase">Meilleure Journée</p>
                                                    <p className="text-sm font-medium mt-1">
                                                        {new Date(agentModalData.bestDay.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        {agentModalData.bestDay.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                    </p>
                                                    <p className="text-xs text-green-600">
                                                        ({agentModalData.bestDay.productivite.toFixed(1)}%)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {agentModalData.worstDay && (
                                        <div className="p-4 border-l-4 border-l-red-500 bg-red-50/50 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="text-2xl">⚠️</span>
                                                <div>
                                                    <p className="text-xs font-semibold text-red-700 uppercase">Pire Journée</p>
                                                    <p className="text-sm font-medium mt-1">
                                                        {new Date(agentModalData.worstDay.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                    <p className="text-lg font-bold text-red-600">
                                                        {agentModalData.worstDay.tonnage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Kg
                                                    </p>
                                                    <p className="text-xs text-red-600">
                                                        ({agentModalData.worstDay.productivite.toFixed(1)}%)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Shift Breakdown */}
                            {agentModalData.shiftBreakdown && agentModalData.shiftBreakdown.length > 1 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Répartition par Shift</h3>
                                    <div className="p-4 border rounded-xl bg-white">
                                        <ResponsiveContainer width="100%" height={agentModalData.shiftBreakdown.length * 60}>
                                            <BarChart data={agentModalData.shiftBreakdown} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="shift" type="category" width={80} />
                                                <Tooltip
                                                    formatter={(value: number) => `${(value * 1000).toLocaleString('fr-FR')} Kg`}
                                                    labelFormatter={(label) => `${label}`}
                                                />
                                                <Bar dataKey="tonnage" fill="#0088FE" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 space-y-2">
                                            {agentModalData.shiftBreakdown.map((s: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{s.shift}</span>
                                                    <span className="font-medium">{s.sessions} sessions</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Line Breakdown */}
                            {agentModalData.lineBreakdown && agentModalData.lineBreakdown.length > 1 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Répartition par Ligne</h3>
                                    <div className="p-4 border rounded-xl bg-white">
                                        <ResponsiveContainer width="100%" height={agentModalData.lineBreakdown.length * 60}>
                                            <BarChart data={agentModalData.lineBreakdown} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="ligne" type="category" width={80} />
                                                <Tooltip
                                                    formatter={(value: number) => `${(value * 1000).toLocaleString('fr-FR')} Kg`}
                                                    labelFormatter={(label) => `${label}`}
                                                />
                                                <Bar dataKey="tonnage" fill="#00C49F" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 space-y-2">
                                            {agentModalData.lineBreakdown.map((l: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">{l.ligne}</span>
                                                    <span className="font-medium">{l.sessions} sessions</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Detailed Production */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-xl bg-muted/20">
                                    <h3 className="text-sm font-semibold mb-3">Activité</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Shifts (Chef de Quart)</span>
                                            <span className="font-medium">{agentModalData.nombreShifts}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sessions (Chef de Ligne)</span>
                                            <span className="font-medium">{agentModalData.nombreLignes}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Lignes gérées</span>
                                            <span className="font-medium">{agentModalData.lignesOccupees.length > 0 ? `L${agentModalData.lignesOccupees.join(', L')}` : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border rounded-xl bg-muted/20">
                                    <h3 className="text-sm font-semibold mb-3">Production</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Bouteilles</span>
                                            <span className="font-medium">{agentModalData.bouteilles.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Recharges</span>
                                            <span className="font-medium text-blue-600">{agentModalData.recharges.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Consignes</span>
                                            <span className="font-medium text-green-600">{agentModalData.consignes.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* 3. HISTORIQUE DES SAISIES */}
            <ProductionHistory
                history={productionHistory}
                loading={historyLoading}
                filterType={historyFilterType}
                setFilterType={setHistoryFilterType}
                selectedMonth={historySelectedMonth}
                setSelectedMonth={setHistorySelectedMonth}
                selectedDate={historySelectedDate}
                setSelectedDate={setHistorySelectedDate}
                dateRange={historyDateRange}
                setDateRange={setHistoryDateRange}
                shiftFilter={historyShiftFilter}
                setShiftFilter={setHistoryShiftFilter}
                ligneFilter={historyLigneFilter}
                setLigneFilter={setHistoryLigneFilter}
                chefFilter={historyChefFilter}
                setChefFilter={setHistoryChefFilter}
                availableMonths={availableMonths}
                allAgents={allAgents}
                onEdit={async (shiftId) => {
                    const data = await fetchShiftDetailsForEdit(shiftId);
                    setEditModalData(data);
                    setSelectedShiftForEdit(shiftId);
                }}
                onDelete={async (shiftId) => {
                    const reason = prompt("Raison de la suppression :");
                    if (reason) {
                        await deleteProductionShift(shiftId, reason);
                    }
                }}
            />

        </div >
    );
};

export default CentreEmplisseurView;
