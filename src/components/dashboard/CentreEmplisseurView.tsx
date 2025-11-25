import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Factory, Users, ArrowUp, ArrowDown, Calendar as CalendarIcon, Package } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
    const [agentType, setAgentType] = useState<'chef_quart' | 'chef_ligne'>('chef_quart');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [chefsQuart, setChefsQuart] = useState<any[]>([]);
    const [chefsLigne, setChefsLigne] = useState<any[]>([]);
    const [agentStats, setAgentStats] = useState({
        tonnage: 0,
        bouteilles: 0,
        recharges: 0,
        consignes: 0,
        nombreShifts: 0,
        nombreLignes: 0,
        effectifMoyen: 0,
        tempsArretMinutes: 0,
        productivite: 0
    });

    // Agent Filter States
    const [agentFilterType, setAgentFilterType] = useState<'month' | 'date' | 'range'>('month');
    const [agentSelectedMonth, setAgentSelectedMonth] = useState<string>(selectedMonth);
    const [agentSelectedDate, setAgentSelectedDate] = useState<Date | undefined>(selectedDate);
    const [agentDateRange, setAgentDateRange] = useState<DateRange | undefined>(dateRange);

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
        if (selectedAgentId) {
            fetchAgentStats();
        }
    }, [selectedAgentId, agentType, agentFilterType, agentSelectedMonth, agentSelectedDate, agentDateRange]);

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
            // Fetch chefs de quart
            const { data: quartsData, error: quartsError } = await supabase
                .from('chefs_quart')
                .select('*')
                .order('nom');

            if (quartsError) throw quartsError;
            setChefsQuart(quartsData || []);

            // Fetch chefs de ligne
            const { data: lignesData, error: lignesError } = await supabase
                .from('chefs_ligne')
                .select('*')
                .order('nom');

            if (lignesError) throw lignesError;
            setChefsLigne(lignesData || []);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    const fetchAgentStats = async () => {
        if (!selectedAgentId) return;

        try {
            if (agentType === 'chef_quart') {
                // Fetch shifts for this chef de quart
                let shiftsQuery = supabase
                    .from('production_shifts')
                    .select('*, lignes_production(*), arrets_production(*)')
                    .eq('chef_quart_id', selectedAgentId);

                // Apply filters using agent-specific state
                if (agentFilterType === 'month') {
                    const startDate = `${agentSelectedMonth}-01`;
                    const [y, m] = agentSelectedMonth.split('-').map(Number);
                    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                    shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
                } else if (agentFilterType === 'date' && agentSelectedDate) {
                    const dateStr = format(agentSelectedDate, 'yyyy-MM-dd');
                    shiftsQuery = shiftsQuery.eq('date', dateStr);
                } else if (agentFilterType === 'range' && agentDateRange?.from) {
                    const fromStr = format(agentDateRange.from, 'yyyy-MM-dd');
                    const toStr = agentDateRange.to ? format(agentDateRange.to, 'yyyy-MM-dd') : fromStr;
                    shiftsQuery = shiftsQuery.gte('date', fromStr).lte('date', toStr);
                }

                const { data: shifts, error } = await shiftsQuery;
                if (error) throw error;

                const totalTonnage = shifts?.reduce((sum, s) => sum + (Number(s.tonnage_total) || 0), 0) || 0;
                const totalBouteilles = shifts?.reduce((sum, s) => sum + (Number(s.bouteilles_produites) || 0), 0) || 0;

                let totalRecharges = 0;
                let totalConsignes = 0;
                let totalEffectif = 0;
                let totalTempsArret = 0;

                shifts?.forEach(shift => {
                    const lignes = shift.lignes_production || [];
                    lignes.forEach((l: any) => {
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
                            totalTempsArret += diffMs / 60000; // Convert to minutes
                        }
                    });
                });

                const effectifMoyen = shifts && shifts.length > 0 ? totalEffectif / shifts.length : 0;

                // Calculate performance rate for chef de quart
                // Heures productives = 9h par shift - temps d'arrêt
                const heuresProductives = (shifts?.length || 0) * 9 - (totalTempsArret / 60); // Convert minutes to hours

                // Production théorique = somme pour chaque ligne
                // L1-L4 (B6): 1600 btl/h × 6 Kg/btl
                // L5 (B12): 900 btl/h × 12.5 Kg/btl
                let productionTheoriqueL1_4 = 0;
                let productionTheoriqueL5 = 0;

                shifts?.forEach(shift => {
                    const lignes = shift.lignes_production || [];
                    lignes.forEach((l: any) => {
                        if (l.numero_ligne >= 1 && l.numero_ligne <= 4) {
                            // Ligne B6
                            productionTheoriqueL1_4 += 1600 * 6 * heuresProductives / (shifts?.length || 1);
                        } else if (l.numero_ligne === 5) {
                            // Ligne B12
                            productionTheoriqueL5 += 900 * 12.5 * heuresProductives / (shifts?.length || 1);
                        }
                    });
                });

                const productionTheorique = productionTheoriqueL1_4 + productionTheoriqueL5;
                const tauxPerformance = productionTheorique > 0 ? (totalTonnage / productionTheorique) * 100 : 0;

                setAgentStats({
                    tonnage: totalTonnage,
                    bouteilles: totalBouteilles,
                    recharges: totalRecharges,
                    consignes: totalConsignes,
                    nombreShifts: shifts?.length || 0,
                    nombreLignes: 0,
                    effectifMoyen,
                    tempsArretMinutes: totalTempsArret,
                    productivite: tauxPerformance
                });

            } else {
                // Fetch lignes for this chef de ligne
                let lignesQuery = supabase
                    .from('lignes_production')
                    .select('*, production_shifts!inner(date, shift_type)')
                    .eq('chef_ligne_id', selectedAgentId);

                // Apply filters using agent-specific state
                if (agentFilterType === 'month') {
                    const startDate = `${agentSelectedMonth}-01`;
                    const [y, m] = agentSelectedMonth.split('-').map(Number);
                    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                    lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
                } else if (agentFilterType === 'date' && agentSelectedDate) {
                    const dateStr = format(agentSelectedDate, 'yyyy-MM-dd');
                    lignesQuery = lignesQuery.eq('production_shifts.date', dateStr);
                } else if (agentFilterType === 'range' && agentDateRange?.from) {
                    const fromStr = format(agentDateRange.from, 'yyyy-MM-dd');
                    const toStr = agentDateRange.to ? format(agentDateRange.to, 'yyyy-MM-dd') : fromStr;
                    lignesQuery = lignesQuery.gte('production_shifts.date', fromStr).lte('production_shifts.date', toStr);
                }

                const { data: lignes, error } = await lignesQuery;
                if (error) throw error;

                const totalTonnage = lignes?.reduce((sum, l) => sum + (Number(l.tonnage_ligne) || 0), 0) || 0;

                let totalRecharges = 0;
                let totalConsignes = 0;
                let totalAgents = 0;

                lignes?.forEach(l => {
                    totalRecharges += (l.cumul_recharges_b6 || 0) + (l.cumul_recharges_b12 || 0) +
                        (l.cumul_recharges_b28 || 0) + (l.cumul_recharges_b38 || 0);
                    totalConsignes += (l.cumul_consignes_b6 || 0) + (l.cumul_consignes_b12 || 0) +
                        (l.cumul_consignes_b28 || 0) + (l.cumul_consignes_b38 || 0);
                    totalAgents += l.nombre_agents || 0;
                });

                const effectifMoyen = lignes && lignes.length > 0 ? totalAgents / lignes.length : 0;

                // Calculate performance rate for chef de ligne
                // Count unique lines to determine which formula to use
                const uniqueLines = new Set(lignes?.map(l => l.numero_ligne));

                // Calculate productive hours (9h per shift - downtime)
                // For chef de ligne, we need to get downtime from shifts
                const nombreShifts = lignes?.length || 0;
                const heuresProductives = nombreShifts * 9; // Simplified: 9h per shift (downtime already reflected in production)

                // Calculate theoretical production based on line types
                let productionTheorique = 0;

                uniqueLines.forEach(numeroLigne => {
                    if (numeroLigne >= 1 && numeroLigne <= 4) {
                        // Ligne B6: 1600 btl/h × 6 Kg/btl
                        productionTheorique += 1600 * 6 * heuresProductives;
                    } else if (numeroLigne === 5) {
                        // Ligne B12: 900 btl/h × 12.5 Kg/btl
                        productionTheorique += 900 * 12.5 * heuresProductives;
                    }
                });

                const tauxPerformance = productionTheorique > 0 ? (totalTonnage / productionTheorique) * 100 : 0;

                setAgentStats({
                    tonnage: totalTonnage,
                    bouteilles: totalRecharges + totalConsignes,
                    recharges: totalRecharges,
                    consignes: totalConsignes,
                    nombreShifts: 0,
                    nombreLignes: uniqueLines.size,
                    effectifMoyen,
                    tempsArretMinutes: 0,
                    productivite: tauxPerformance
                });
            }
        } catch (error) {
            console.error('Error fetching agent stats:', error);
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
                                {stats.totalTonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
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
                                    return (
                                        <div key={client} className="p-3 bg-white/50 rounded-lg border border-primary/20 hover:shadow-sm transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-semibold">{names[client as keyof typeof names]}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-extrabold text-foreground">{cStats.pct.toFixed(1)}%</p>
                                                    <p className="text-sm font-extrabold text-primary">{(cStats.tonnage / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1 })} T</p>
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
                                <span className="font-bold text-xl text-primary">{stats.shift1.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} Kg</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Recharges: <span className="font-medium text-foreground">{stats.shift1.recharges.toLocaleString('fr-FR')}</span></span>
                                <span>Consignes: <span className="font-medium text-foreground">{stats.shift1.consignes.toLocaleString('fr-FR')}</span></span>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-lg">Shift 2</span>
                                <span className="font-bold text-xl text-primary">{stats.shift2.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} Kg</span>
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
                            {stats.lines.map((line) => (
                                <div key={line.id} className="p-4 bg-card border border-primary/20 rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary text-primary-foreground font-bold px-3 py-1 rounded-md text-sm shadow-sm">
                                                Ligne {line.id}
                                            </div>
                                            <span className="font-extrabold text-2xl text-primary tracking-tight">{line.tonnage.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-lg text-primary/70">Kg</span></span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm bg-primary/5 p-3 rounded-md border border-primary/10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Recharges:</span>
                                            <span className="font-bold text-foreground text-base">{line.recharges.toLocaleString('fr-FR')}</span>
                                            <span className="text-muted-foreground text-xs">Btl</span>
                                            <span className="text-muted-foreground mx-1">•</span>
                                            <span className="font-bold text-primary">{(line.rechargesKg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T</span>
                                        </div>
                                        <div className="h-4 w-px bg-primary/20"></div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Consignes:</span>
                                            <span className="font-bold text-foreground text-base">{line.consignes.toLocaleString('fr-FR')}</span>
                                            <span className="text-muted-foreground text-xs">Btl</span>
                                            <span className="text-muted-foreground mx-1">•</span>
                                            <span className="font-bold text-primary">{(line.consignesKg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* 2. PRODUCTIVITÉ PAR AGENT */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        PRODUCTIVITÉ PAR AGENT
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Agent Filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/20 rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground mr-2">Période :</span>
                        <Select value={agentFilterType} onValueChange={(value: 'month' | 'date' | 'range') => setAgentFilterType(value)}>
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">Par mois</SelectItem>
                                <SelectItem value="date">Par date</SelectItem>
                                <SelectItem value="range">Par période</SelectItem>
                            </SelectContent>
                        </Select>

                        {agentFilterType === 'month' && (
                            <Select value={agentSelectedMonth} onValueChange={setAgentSelectedMonth}>
                                <SelectTrigger className="w-[160px] h-8 text-sm">
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

                        {agentFilterType === 'date' && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[200px] justify-start text-left font-normal h-8 text-sm",
                                            !agentSelectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {agentSelectedDate ? format(agentSelectedDate, "dd/MM/yyyy") : "Sélectionner une date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={agentSelectedDate}
                                        onSelect={setAgentSelectedDate}
                                        locale={fr}
                                        disabled={{ after: new Date() }}
                                        className="pointer-events-auto"
                                    />
                                </PopoverContent>
                            </Popover>
                        )}

                        {agentFilterType === 'range' && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal h-8 text-sm",
                                            !agentDateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {agentDateRange?.from ? (
                                            agentDateRange.to ? (
                                                <>
                                                    {format(agentDateRange.from, "dd/MM/yyyy")} - {format(agentDateRange.to, "dd/MM/yyyy")}
                                                </>
                                            ) : (
                                                format(agentDateRange.from, "dd/MM/yyyy")
                                            )
                                        ) : (
                                            "Sélectionner une période"
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        selected={agentDateRange}
                                        onSelect={setAgentDateRange}
                                        locale={fr}
                                        disabled={{ after: new Date() }}
                                        numberOfMonths={2}
                                        className="pointer-events-auto"
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    {/* Agent Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Type d'agent</label>
                            <Select value={agentType} onValueChange={(value: 'chef_quart' | 'chef_ligne') => {
                                setAgentType(value);
                                setSelectedAgentId('');
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="chef_quart">Chef de Quart</SelectItem>
                                    <SelectItem value="chef_ligne">Chef de Ligne</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Agent</label>
                            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agentType === 'chef_quart' ? (
                                        chefsQuart.map(chef => (
                                            <SelectItem key={chef.id} value={chef.id}>
                                                {chef.prenom} {chef.nom}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        chefsLigne.map(chef => (
                                            <SelectItem key={chef.id} value={chef.id}>
                                                {chef.prenom} {chef.nom}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* KPIs Display */}
                    {selectedAgentId && (
                        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                            {/* Main Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-xs text-muted-foreground mb-1">Tonnage Total</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {(agentStats.tonnage / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} T
                                    </p>
                                </div>
                                <div className="text-center p-3 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-xs text-muted-foreground mb-1">Bouteilles Produites</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {agentStats.bouteilles.toLocaleString('fr-FR')} <span className="text-xs text-muted-foreground">Btl</span>
                                    </p>
                                </div>
                                <div className="text-center p-3 bg-white/50 rounded-lg border border-primary/20">
                                    <p className="text-xs text-muted-foreground mb-1">Taux de Performance</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {agentStats.productivite.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs text-primary/60">%</span>
                                    </p>
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-primary/20">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Recharges</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {agentStats.recharges.toLocaleString('fr-FR')} <span className="text-xs text-muted-foreground">Btl</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Consignes</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {agentStats.consignes.toLocaleString('fr-FR')} <span className="text-xs text-muted-foreground">Btl</span>
                                    </p>
                                </div>
                                {agentType === 'chef_quart' ? (
                                    <>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Shifts</p>
                                            <p className="text-lg font-bold text-foreground">{agentStats.nombreShifts}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Effectif Moyen</p>
                                            <p className="text-lg font-bold text-foreground">{agentStats.effectifMoyen.toFixed(1)} <span className="text-xs text-muted-foreground">agt</span></p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Lignes</p>
                                            <p className="text-lg font-bold text-foreground">{agentStats.nombreLignes}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-1">Effectif Moyen</p>
                                            <p className="text-lg font-bold text-foreground">{agentStats.effectifMoyen.toFixed(1)} <span className="text-xs text-muted-foreground">agt</span></p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Downtime for Chef de Quart */}
                            {agentType === 'chef_quart' && agentStats.tempsArretMinutes > 0 && (
                                <div className="mt-3 pt-3 border-t border-primary/20 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Temps d'Arrêt Total</p>
                                    <p className="text-lg font-bold text-orange-600">
                                        {Math.floor(agentStats.tempsArretMinutes / 60)}h {Math.round(agentStats.tempsArretMinutes % 60)}min
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedAgentId && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Sélectionnez un agent pour voir ses indicateurs de productivité</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
};

export default CentreEmplisseurView;
