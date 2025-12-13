import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BilanEntry } from '@/types/balance';
import { formatNumber, getNatureColor, getWorkingDaysInMonth, getWorkingDaysPassed } from '@/utils/calculations';
import { TrendingUp, TrendingDown, TrendingUpDown, Calendar as CalendarIcon, Weight, Package, Factory, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { DayContentProps, DateRange } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  entries: BilanEntry[];
}

const Dashboard = ({ entries }: DashboardProps) => {
  const [filterType, setFilterType] = useState<'month' | 'date' | 'range' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    return { from: yesterday, to: today };
  });

  // Production stats state - MUST be before any early returns
  const [productionStats, setProductionStats] = useState({
    tonnage: 0,
    bouteilles: 0,
    bottlesByType: { b6: 0, b12: 0, b28: 0, b38: 0 },
    bottlesByClient: { petro: 0, vivo: 0, total: 0 },
    loading: false
  });

  // Top performers state
  const [topPerformers, setTopPerformers] = useState<{
    topLine: { name: string; tonnage: number; percentage: number } | null;
    topChefByTonnage: { name: string; tonnage: number; percentage: number } | null;
    topChefByProductivity: { name: string; tonnage: number; productivity: number } | null;
    topAgentByTonnage: { name: string; tonnage: number; percentage: number } | null;
    topAgentByProductivity: { name: string; tonnage: number; productivity: number } | null;
  }>({
    topLine: null,
    topChefByTonnage: null,
    topChefByProductivity: null,
    topAgentByTonnage: null,
    topAgentByProductivity: null
  });

  // Monthly objective state
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);
  const [objectiveValue, setObjectiveValue] = useState('');
  const [currentObjective, setCurrentObjective] = useState<number | null>(null);

  useEffect(() => {
    const fetchProductionStats = async () => {
      setProductionStats(prev => ({ ...prev, loading: true }));
      try {
        let shiftsQuery = supabase.from('production_shifts').select('id, tonnage_total, bouteilles_produites, date');
        let lignesQuery = supabase.from('lignes_production').select(`
          cumul_recharges_b6, cumul_recharges_b12, cumul_recharges_b28, cumul_recharges_b38,
          cumul_consignes_b6, cumul_consignes_b12, cumul_consignes_b28, cumul_consignes_b38,
          recharges_petro_b6, recharges_petro_b12, recharges_petro_b28, recharges_petro_b38,
          recharges_vivo_b6, recharges_vivo_b12, recharges_vivo_b28, recharges_vivo_b38,
          recharges_total_b6, recharges_total_b12, recharges_total_b28, recharges_total_b38,
          consignes_petro_b6, consignes_petro_b12, consignes_petro_b28, consignes_petro_b38,
          consignes_vivo_b6, consignes_vivo_b12, consignes_vivo_b28, consignes_vivo_b38,
          consignes_total_b6, consignes_total_b12, consignes_total_b28, consignes_total_b38,
          production_shifts!inner(date)
        `);

        if (filterType === 'month') {
          const startDate = `${selectedMonth}-01`;
          const [y, m] = selectedMonth.split('-').map(Number);
          const endDate = new Date(y, m, 0).toISOString().split('T')[0];
          shiftsQuery = shiftsQuery.gte('date', startDate).lte('date', endDate);
          lignesQuery = lignesQuery.gte('production_shifts.date', startDate).lte('production_shifts.date', endDate);
        } else if (filterType === 'year') {
          const startDate = `${selectedYear}-01-01`;
          const endDate = `${selectedYear}-12-31`;
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

        if (shiftsResult.error) throw shiftsResult.error;
        if (lignesResult.error) throw lignesResult.error;

        const totalTonnage = (shiftsResult.data?.reduce((sum, row) => sum + (Number(row.tonnage_total) || 0), 0) || 0) * 1000;
        const totalBouteilles = shiftsResult.data?.reduce((sum, row) => sum + (row.bouteilles_produites || 0), 0) || 0;

        // Calculate bottles by type
        let b6 = 0, b12 = 0, b28 = 0, b38 = 0;
        lignesResult.data?.forEach(ligne => {
          b6 += (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_consignes_b6 || 0);
          b12 += (ligne.cumul_recharges_b12 || 0) + (ligne.cumul_consignes_b12 || 0);
          b28 += (ligne.cumul_recharges_b28 || 0) + (ligne.cumul_consignes_b28 || 0);
          b38 += (ligne.cumul_recharges_b38 || 0) + (ligne.cumul_consignes_b38 || 0);
        });

        // Calculate bottles by client
        let petro = 0, vivo = 0, total = 0;
        lignesResult.data?.forEach(ligne => {
          petro += (ligne.recharges_petro_b6 || 0) + (ligne.recharges_petro_b12 || 0) + (ligne.recharges_petro_b28 || 0) + (ligne.recharges_petro_b38 || 0)
            + (ligne.consignes_petro_b6 || 0) + (ligne.consignes_petro_b12 || 0) + (ligne.consignes_petro_b28 || 0) + (ligne.consignes_petro_b38 || 0);
          vivo += (ligne.recharges_vivo_b6 || 0) + (ligne.recharges_vivo_b12 || 0) + (ligne.recharges_vivo_b28 || 0) + (ligne.recharges_vivo_b38 || 0)
            + (ligne.consignes_vivo_b6 || 0) + (ligne.consignes_vivo_b12 || 0) + (ligne.consignes_vivo_b28 || 0) + (ligne.consignes_vivo_b38 || 0);
          total += (ligne.recharges_total_b6 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_total_b38 || 0)
            + (ligne.consignes_total_b6 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_total_b38 || 0);
        });

        setProductionStats({
          tonnage: totalTonnage,
          bouteilles: totalBouteilles,
          bottlesByType: { b6, b12, b28, b38 },
          bottlesByClient: { petro, vivo, total },
          loading: false
        });

        // Calculate top performers using independent queries (robust method)
        const calculateTopPerformers = async () => {
          try {
            // 1. Fetch Agents Directories
            const [chefsQuartResult, chefsLigneResult] = await Promise.all([
              supabase.from('chefs_quart').select('id, nom, prenom'),
              supabase.from('chefs_ligne').select('id, nom, prenom')
            ]);

            const chefsQuartMap = new Map(chefsQuartResult.data?.map(c => [c.id, `${c.nom} ${c.prenom || ''}`.trim()]) || []);
            const chefsLigneMap = new Map(chefsLigneResult.data?.map(c => [c.id, `${c.nom} ${c.prenom || ''}`.trim()]) || []);

            // 2. Build Range Filters
            let dateFilter: any = {};
            if (filterType === 'month') {
              const startDate = `${selectedMonth}-01`;
              const [y, m] = selectedMonth.split('-').map(Number);
              const endDate = new Date(y, m, 0).toISOString().split('T')[0];
              dateFilter = { gte: startDate, lte: endDate };
            } else if (filterType === 'year') {
              dateFilter = { gte: `${selectedYear}-01-01`, lte: `${selectedYear}-12-31` };
            } else if (filterType === 'date' && selectedDate) {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              dateFilter = { eq: dateStr };
            } else if (filterType === 'range' && dateRange?.from) {
              const fromStr = format(dateRange.from, 'yyyy-MM-dd');
              const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
              dateFilter = { gte: fromStr, lte: toStr };
            }

            // 3. Fetch Production Data (with more details for productivity calc)
            let shiftsQuery = supabase
              .from('production_shifts')
              .select('id, chef_quart_id, tonnage_total, lignes_production(numero_ligne, tonnage_ligne), arrets_production(duree_minutes, heure_debut, heure_fin, lignes_concernees)');

            let linesQuery = supabase
              .from('lignes_production')
              .select('numero_ligne, tonnage_ligne, chef_ligne_id, production_shifts!inner(id, date, arrets_production(duree_minutes, heure_debut, heure_fin, lignes_concernees))');

            if (dateFilter.gte && dateFilter.lte) {
              shiftsQuery = shiftsQuery.gte('date', dateFilter.gte).lte('date', dateFilter.lte);
              linesQuery = linesQuery.gte('production_shifts.date', dateFilter.gte).lte('production_shifts.date', dateFilter.lte);
            } else if (dateFilter.eq) {
              shiftsQuery = shiftsQuery.eq('date', dateFilter.eq);
              linesQuery = linesQuery.eq('production_shifts.date', dateFilter.eq);
            }

            const [shiftsResult, linesResult] = await Promise.all([shiftsQuery, linesQuery]);

            if (shiftsResult.error) throw shiftsResult.error;
            if (linesResult.error) throw linesResult.error;

            const shifts = shiftsResult.data || [];
            const lines = linesResult.data || [];

            // 4. Aggregate Data for Tonnage-based ranking

            // Chef de Quart stats (tonnage and productivity)
            const agentQuartTonnage = new Map<string, number>();
            const agentQuartProductivity = new Map<string, { tonnage: number; theorique: number }>();

            shifts.forEach((shift: any) => {
              if (shift.chef_quart_id && chefsQuartMap.has(shift.chef_quart_id)) {
                const name = chefsQuartMap.get(shift.chef_quart_id)!;
                const tonnage = (Number(shift.tonnage_total) || 0) * 1000;

                // Tonnage cumul
                const currentTonnage = agentQuartTonnage.get(name) || 0;
                agentQuartTonnage.set(name, currentTonnage + tonnage);

                // Productivity calc: sum theoretical production per line
                const shiftLines = shift.lignes_production || [];
                const shiftArrets = shift.arrets_production || [];

                let shiftTheorique = 0;
                shiftLines.forEach((l: any) => {
                  // Find downtime for this line
                  const lineArrets = shiftArrets.filter((a: any) =>
                    a.lignes_concernees && a.lignes_concernees.includes(l.numero_ligne)
                  );
                  let downtime = 0;
                  lineArrets.forEach((a: any) => {
                    if (a.duree_minutes && a.duree_minutes > 0) {
                      downtime += a.duree_minutes;
                    } else if (a.heure_debut && a.heure_fin) {
                      const [hD, mD] = a.heure_debut.split(':').map(Number);
                      const [hF, mF] = a.heure_fin.split(':').map(Number);
                      let diff = (hF * 60 + mF) - (hD * 60 + mD);
                      if (diff < 0) diff += 24 * 60;
                      downtime += diff;
                    }
                  });
                  const productiveHours = 9 - Math.min(downtime, 540) / 60;
                  const rate = (l.numero_ligne >= 1 && l.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                  shiftTheorique += (rate * productiveHours) / 1000 * 1000; // in Kg
                });

                const currentProd = agentQuartProductivity.get(name) || { tonnage: 0, theorique: 0 };
                agentQuartProductivity.set(name, {
                  tonnage: currentProd.tonnage + tonnage,
                  theorique: currentProd.theorique + shiftTheorique
                });
              }
            });

            // Chef de Ligne stats
            const agentLigneTonnage = new Map<string, number>();
            const agentLigneProductivity = new Map<string, { tonnage: number; theorique: number }>();

            lines.forEach((ligne: any) => {
              if (ligne.chef_ligne_id && chefsLigneMap.has(ligne.chef_ligne_id)) {
                const name = chefsLigneMap.get(ligne.chef_ligne_id)!;
                const tonnage = (Number(ligne.tonnage_ligne) || 0) * 1000;

                // Tonnage cumul
                const currentTonnage = agentLigneTonnage.get(name) || 0;
                agentLigneTonnage.set(name, currentTonnage + tonnage);

                // Productivity: calculate theoretical for this line
                const shiftArrets = ligne.production_shifts?.arrets_production || [];
                const lineArrets = shiftArrets.filter((a: any) =>
                  a.lignes_concernees && a.lignes_concernees.includes(ligne.numero_ligne)
                );
                let downtime = 0;
                lineArrets.forEach((a: any) => {
                  if (a.duree_minutes && a.duree_minutes > 0) {
                    downtime += a.duree_minutes;
                  } else if (a.heure_debut && a.heure_fin) {
                    const [hD, mD] = a.heure_debut.split(':').map(Number);
                    const [hF, mF] = a.heure_fin.split(':').map(Number);
                    let diff = (hF * 60 + mF) - (hD * 60 + mD);
                    if (diff < 0) diff += 24 * 60;
                    downtime += diff;
                  }
                });
                const productiveHours = 9 - Math.min(downtime, 540) / 60;
                const rate = (ligne.numero_ligne >= 1 && ligne.numero_ligne <= 4) ? (1600 * 6) : (900 * 12.5);
                const theorique = (rate * productiveHours) / 1000 * 1000; // in Kg

                const currentProd = agentLigneProductivity.get(name) || { tonnage: 0, theorique: 0 };
                agentLigneProductivity.set(name, {
                  tonnage: currentProd.tonnage + tonnage,
                  theorique: currentProd.theorique + theorique
                });
              }
            });

            // Top Ligne (by tonnage only)
            const lineStats = new Map<number, number>();
            lines.forEach((ligne: any) => {
              if (ligne.numero_ligne) {
                const current = lineStats.get(ligne.numero_ligne) || 0;
                lineStats.set(ligne.numero_ligne, current + (Number(ligne.tonnage_ligne) || 0) * 1000);
              }
            });


            // Calculate Total Period Tonnage for percentages
            const totalPeriodTonnage = shifts.reduce((sum: number, s: any) => sum + (Number(s.tonnage_total) || 0), 0) * 1000;

            // 5. Determine Winners

            // Top Chef de Quart by Tonnage
            let topChefByTonnage: { name: string; tonnage: number; percentage: number } | null = null;
            let maxChefTonnage = 0;
            agentQuartTonnage.forEach((tonnage, name) => {
              if (tonnage > maxChefTonnage) {
                maxChefTonnage = tonnage;
                topChefByTonnage = { name, tonnage, percentage: totalPeriodTonnage > 0 ? (tonnage / totalPeriodTonnage) * 100 : 0 };
              }
            });

            // Top Chef de Quart by Productivity
            let topChefByProductivity: { name: string; tonnage: number; productivity: number } | null = null;
            let maxChefProd = 0;
            agentQuartProductivity.forEach((stats, name) => {
              const prod = stats.theorique > 0 ? (stats.tonnage / stats.theorique) * 100 : 0;
              if (prod > maxChefProd && stats.tonnage > 0) {
                maxChefProd = prod;
                topChefByProductivity = { name, tonnage: stats.tonnage, productivity: prod };
              }
            });

            // Top Chef de Ligne by Tonnage
            let topAgentByTonnage: { name: string; tonnage: number; percentage: number } | null = null;
            let maxAgentTonnage = 0;
            agentLigneTonnage.forEach((tonnage, name) => {
              if (tonnage > maxAgentTonnage) {
                maxAgentTonnage = tonnage;
                topAgentByTonnage = { name, tonnage, percentage: totalPeriodTonnage > 0 ? (tonnage / totalPeriodTonnage) * 100 : 0 };
              }
            });

            // Top Chef de Ligne by Productivity
            let topAgentByProductivity: { name: string; tonnage: number; productivity: number } | null = null;
            let maxAgentProd = 0;
            agentLigneProductivity.forEach((stats, name) => {
              const prod = stats.theorique > 0 ? (stats.tonnage / stats.theorique) * 100 : 0;
              if (prod > maxAgentProd && stats.tonnage > 0) {
                maxAgentProd = prod;
                topAgentByProductivity = { name, tonnage: stats.tonnage, productivity: prod };
              }
            });

            // Top Ligne
            let topLine: { name: string; tonnage: number; percentage: number } | null = null;
            let maxLineTonnage = 0;
            lineStats.forEach((tonnage, num) => {
              if (tonnage > maxLineTonnage) {
                maxLineTonnage = tonnage;
                topLine = { name: `Ligne ${num}`, tonnage, percentage: totalPeriodTonnage > 0 ? (tonnage / totalPeriodTonnage) * 100 : 0 };
              }
            });

            setTopPerformers({ topLine, topChefByTonnage, topChefByProductivity, topAgentByTonnage, topAgentByProductivity });
          } catch (error) {
            console.error('Error calculating top performers:', error);
          }
        };

        calculateTopPerformers();
      } catch (error) {
        console.error('Error fetching production stats:', error);
        setProductionStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchProductionStats();
  }, [filterType, selectedMonth, selectedYear, selectedDate, dateRange]);



  // Filter entries based on selected filter type
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);

    if (filterType === 'month') {
      const entryMonth = entry.date.substring(0, 7);
      return entryMonth === selectedMonth;
    } else if (filterType === 'year') {
      return entry.date.startsWith(selectedYear);
    } else if (filterType === 'date' && selectedDate) {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      return entry.date === selectedDateStr;
    } else if (filterType === 'range' && dateRange?.from) {
      const fromDate = dateRange.from;
      const toDate = dateRange.to || dateRange.from;
      return entryDate >= fromDate && entryDate <= toDate;
    }
    return false;
  });

  // Get available months from entries
  const availableMonths = Array.from(new Set(entries.map(e => e.date.substring(0, 7)))).sort().reverse();
  const availableYears = Array.from(new Set(entries.map(e => e.date.substring(0, 4)))).sort().reverse();

  // Check for current month objective
  // Check for monthly objective based on selection
  useEffect(() => {
    const checkMonthlyObjective = async () => {
      // Only check if we are in month view
      if (filterType !== 'month' || !selectedMonth) {
        setCurrentObjective(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('objectifs_mensuels' as any)
          .select('objectif_receptions')
          .eq('mois', selectedMonth)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching objective:', error);
          return;
        }

        if (data) {
          setCurrentObjective((data as any).objectif_receptions);
        } else {
          setCurrentObjective(null);
          // Show dialog automatically if no objective exists for the selected month
          setShowObjectiveDialog(true);
        }
      } catch (error) {
        console.error('Error checking objective:', error);
      }
    };

    checkMonthlyObjective();
  }, [selectedMonth, filterType]);

  // Save monthly objective
  const saveMonthlyObjective = async () => {
    // Use selectedMonth if available, otherwise fallback to current month
    const targetMonth = selectedMonth || new Date().toISOString().substring(0, 7);
    const objective = parseFloat(objectiveValue);

    if (isNaN(objective) || objective <= 0) {
      alert('Veuillez entrer un objectif valide');
      return;
    }

    try {
      const { error } = await supabase
        .from('objectifs_mensuels' as any)
        .upsert({
          mois: targetMonth,
          objectif_receptions: objective
        }, {
          onConflict: 'mois'
        });

      if (error) throw error;

      setCurrentObjective(objective);
      setShowObjectiveDialog(false);
      setObjectiveValue('');
    } catch (error) {
      console.error('Error saving objective:', error);
      alert('Erreur lors de l\'enregistrement de l\'objectif');
    }
  };



  // Get last entry (most recent) or default
  const lastEntry = filteredEntries[0] || { date: new Date().toISOString(), bilan: 0, nature: '-' } as unknown as BilanEntry;

  // Calculate totals
  const totalReceptions = filteredEntries.reduce((sum, e) => sum + e.reception_gpl, 0);
  const nombreReceptions = filteredEntries.filter(e => e.reception_gpl > 0).length;

  // Get stock_initial from first entry of the period (sorted by date ascending)
  const sortedEntriesByDate = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
  const firstEntryOfPeriod = sortedEntriesByDate[0];
  const stockInitial1st = firstEntryOfPeriod?.stock_initial || 0;

  // Total disponible = Stock initial au 1er + Réceptions de la période
  const totalDisponible = stockInitial1st + totalReceptions;

  // Generate period text for display
  const getPeriodText = () => {
    if (filterType === 'month') {
      const monthDate = new Date(selectedMonth + '-01');
      return `en ${monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else if (filterType === 'year') {
      return `en ${selectedYear}`;
    } else if (filterType === 'date' && selectedDate) {
      return `le ${format(selectedDate, 'dd/MM/yyyy', { locale: fr })}`;
    } else if (filterType === 'range' && dateRange?.from) {
      if (dateRange.to) {
        return `du ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })} au ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}`;
      } else {
        return `le ${format(dateRange.from, 'dd/MM/yyyy', { locale: fr })}`;
      }
    }
    return '';
  };
  const totalSorties = filteredEntries.reduce((sum, e) => sum + e.cumul_sorties, 0);
  const totalBilan = filteredEntries.reduce((sum, e) => sum + e.bilan, 0);

  // Sorties breakdown (totals)
  const totalVrac = filteredEntries.reduce((sum, e) => sum + e.sorties_vrac, 0);
  const totalConditionne = filteredEntries.reduce((sum, e) => sum + e.sorties_conditionnees, 0);
  const totalFuyardes = filteredEntries.reduce((sum, e) => sum + e.fuyardes, 0);

  // Percentages
  const pourcentageVrac = totalSorties > 0 ? (totalVrac / totalSorties) * 100 : 0;
  const pourcentageConditionne = totalSorties > 0 ? (totalConditionne / totalSorties) * 100 : 0;

  // Bilan positif et négatif
  const bilansPositifs = filteredEntries.filter(e => e.nature === 'Positif');
  const bilansNegatifs = filteredEntries.filter(e => e.nature === 'Négatif');
  const totalBilanPositif = bilansPositifs.reduce((sum, e) => sum + e.bilan, 0);
  const totalBilanNegatif = bilansNegatifs.reduce((sum, e) => sum + e.bilan, 0);

  // Count by nature
  const positifCount = bilansPositifs.length;
  const negatifCount = bilansNegatifs.length;
  const neutreCount = filteredEntries.filter(e => e.nature === 'Neutre').length;

  // Client breakdown for sorties (Bilan Matière)
  const sortiesPetro = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_petro_ivoire || 0) + (e.sorties_conditionnees_petro_ivoire || 0), 0);
  const sortiesVivo = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_vivo_energies || 0) + (e.sorties_conditionnees_vivo_energies || 0), 0);
  const sortiesTotal = filteredEntries.reduce((sum, e) =>
    sum + (e.sorties_vrac_total_energies || 0) + (e.sorties_conditionnees_total_energies || 0), 0);

  const totalSortiesClients = sortiesPetro + sortiesVivo + sortiesTotal;
  const pctSortiesPetro = totalSortiesClients > 0 ? (sortiesPetro / totalSortiesClients) * 100 : 0;
  const pctSortiesVivo = totalSortiesClients > 0 ? (sortiesVivo / totalSortiesClients) * 100 : 0;
  const pctSortiesTotal = totalSortiesClients > 0 ? (sortiesTotal / totalSortiesClients) * 100 : 0;

  // VRAC by client (Simam, Petro, Vivo, Total)
  const vracSimam = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_simam || 0), 0);
  const vracPetro = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_petro_ivoire || 0), 0);
  const vracVivo = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_vivo_energies || 0), 0);
  const vracTotalE = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_total_energies || 0), 0);
  const totalVracAll = vracSimam + vracPetro + vracVivo + vracTotalE;
  const pctVracSimam = totalVracAll > 0 ? (vracSimam / totalVracAll) * 100 : 0;
  const pctVracPetro = totalVracAll > 0 ? (vracPetro / totalVracAll) * 100 : 0;
  const pctVracVivo = totalVracAll > 0 ? (vracVivo / totalVracAll) * 100 : 0;
  const pctVracTotalE = totalVracAll > 0 ? (vracTotalE / totalVracAll) * 100 : 0;

  // CONDITIONNÉ (CE) by client (Petro, Vivo, Total)
  const cePetro = filteredEntries.reduce((sum, e) => sum + (e.sorties_conditionnees_petro_ivoire || 0), 0);
  const ceVivo = filteredEntries.reduce((sum, e) => sum + (e.sorties_conditionnees_vivo_energies || 0), 0);
  const ceTotalE = filteredEntries.reduce((sum, e) => sum + (e.sorties_conditionnees_total_energies || 0), 0);
  const totalCeAll = cePetro + ceVivo + ceTotalE;
  const pctCePetro = totalCeAll > 0 ? (cePetro / totalCeAll) * 100 : 0;
  const pctCeVivo = totalCeAll > 0 ? (ceVivo / totalCeAll) * 100 : 0;
  const pctCeTotalE = totalCeAll > 0 ? (ceTotalE / totalCeAll) * 100 : 0;

  // GLOBAL SALES by client (VRAC + CE combined)
  const globalSimam = vracSimam; // SIMAM is only VRAC
  const globalPetro = vracPetro + cePetro;
  const globalVivo = vracVivo + ceVivo;
  const globalTotalE = vracTotalE + ceTotalE;
  const totalGlobalSales = globalSimam + globalPetro + globalVivo + globalTotalE;
  const pctGlobalSimam = totalGlobalSales > 0 ? (globalSimam / totalGlobalSales) * 100 : 0;
  const pctGlobalPetro = totalGlobalSales > 0 ? (globalPetro / totalGlobalSales) * 100 : 0;
  const pctGlobalVivo = totalGlobalSales > 0 ? (globalVivo / totalGlobalSales) * 100 : 0;
  const pctGlobalTotalE = totalGlobalSales > 0 ? (globalTotalE / totalGlobalSales) * 100 : 0;

  // Calculate production percentages
  const totalBottles = productionStats.bottlesByType.b6 + productionStats.bottlesByType.b12 +
    productionStats.bottlesByType.b28 + productionStats.bottlesByType.b38;
  const pctB6 = totalBottles > 0 ? (productionStats.bottlesByType.b6 / totalBottles) * 100 : 0;
  const pctB12 = totalBottles > 0 ? (productionStats.bottlesByType.b12 / totalBottles) * 100 : 0;
  const pctB28 = totalBottles > 0 ? (productionStats.bottlesByType.b28 / totalBottles) * 100 : 0;
  const pctB38 = totalBottles > 0 ? (productionStats.bottlesByType.b38 / totalBottles) * 100 : 0;

  const totalProdClients = productionStats.bottlesByClient.petro + productionStats.bottlesByClient.vivo +
    productionStats.bottlesByClient.total;
  const pctProdPetro = totalProdClients > 0 ? (productionStats.bottlesByClient.petro / totalProdClients) * 100 : 0;
  const pctProdVivo = totalProdClients > 0 ? (productionStats.bottlesByClient.vivo / totalProdClients) * 100 : 0;
  const pctProdTotal = totalProdClients > 0 ? (productionStats.bottlesByClient.total / totalProdClients) * 100 : 0;

  // Correlation Production vs Sorties Conditionnées
  // Correlation Ventes Conditionnées vs Production
  const correlation = productionStats.tonnage > 0 ? (totalCeAll / productionStats.tonnage) * 100 : 0;

  // Create a map of dates to entries for the heatmap
  const entriesByDate = new Map<string, BilanEntry>();
  filteredEntries.forEach(entry => {
    entriesByDate.set(entry.date, entry);
  });

  const sortiesData = [
    { name: 'Vrac', value: totalVrac, color: 'hsl(var(--chart-1))' },
    { name: 'Conditionné', value: totalConditionne, color: 'hsl(var(--chart-2))' },
    { name: 'Retour marché', value: totalFuyardes, color: 'hsl(var(--chart-3))' },
  ].filter(item => item.value > 0);

  const natureData = [
    { name: 'Positif', value: positifCount, color: 'hsl(var(--success))' },
    { name: 'Négatif', value: negatifCount, color: 'hsl(var(--destructive))' },
    { name: 'Neutre', value: neutreCount, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  // Custom day content for calendar heatmap
  const getDayColor = (date: Date): string => {
    const dateStr = date.toISOString().split('T')[0];
    const entry = entriesByDate.get(dateStr);

    if (!entry) return 'bg-muted/20';

    if (entry.nature === 'Positif') return 'bg-success/70 hover:bg-success';
    if (entry.nature === 'Négatif') return 'bg-destructive/70 hover:bg-destructive';
    return 'bg-muted hover:bg-muted/80';
  };

  const modifiers = {
    positif: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Positif';
    },
    negatif: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Négatif';
    },
    neutre: (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const entry = entriesByDate.get(dateStr);
      return entry?.nature === 'Neutre';
    },
  };



  // Calculate total sales per client
  const totalSimam = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_simam || 0), 0);
  const totalPetro = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_petro_ivoire || 0) + (e.sorties_conditionnees_petro_ivoire || 0), 0);
  const totalVivo = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_vivo_energies || 0) + (e.sorties_conditionnees_vivo_energies || 0), 0);
  const totalTotalEnergies = filteredEntries.reduce((sum, e) => sum + (e.sorties_vrac_total_energies || 0) + (e.sorties_conditionnees_total_energies || 0), 0);

  const totalSalesAll = totalSimam + totalPetro + totalVivo + totalTotalEnergies;

  const pctSimam = totalSalesAll > 0 ? (totalSimam / totalSalesAll) * 100 : 0;
  const pctPetro = totalSalesAll > 0 ? (totalPetro / totalSalesAll) * 100 : 0;
  const pctVivo = totalSalesAll > 0 ? (totalVivo / totalSalesAll) * 100 : 0;
  const pctTotalEnergies = totalSalesAll > 0 ? (totalTotalEnergies / totalSalesAll) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Filter Selector */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Synthèse des activités</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={(value: 'month' | 'date' | 'range' | 'year') => setFilterType(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Par année</SelectItem>
                <SelectItem value="month">Par mois</SelectItem>
                <SelectItem value="date">Par date</SelectItem>
                <SelectItem value="range">Par période</SelectItem>
              </SelectContent>
            </Select>

            {filterType === 'year' && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
      </div>



      {/* ========== ROW 1: BUTANES SPHERES + VENTES ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BUTANES SPHERES */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔵 BUTANES SPHÈRES</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col">
            <div className="space-y-3">
              <div className="text-xl font-bold text-blue-700">{formatNumber(totalDisponible)} Kg</div>
              <p className="text-sm text-muted-foreground">Stock disponible (Stock 1er + Réceptions)</p>
              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stock au 1er</span>
                  <span className="text-xl font-bold">{formatNumber(stockInitial1st)} Kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Réceptions {getPeriodText()}</span>
                  <span className="text-xl font-bold">{formatNumber(totalReceptions)} Kg</span>
                </div>
                {nombreReceptions > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nb réceptions</span>
                    <span className="text-sm font-bold">{nombreReceptions}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-blue-100/50 rounded-md p-3 border border-blue-200 text-center mt-auto">
              <span className="text-sm text-muted-foreground">Ventes = </span>
              <span className="text-xl font-bold text-orange-600">
                {totalDisponible > 0 ? ((totalSorties / totalDisponible) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-sm text-muted-foreground"> des réceptions</span>
            </div>
          </CardContent>
        </Card>

        {/* VENTES GLOBALES */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">📊 VENTES</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col">
            <div className="space-y-3">
              <div className="text-xl font-bold">{formatNumber(totalGlobalSales)} Kg</div>
              <p className="text-xs text-muted-foreground">Cumul des ventes (VRAC + Conditionné)</p>
              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-simam.png" alt="Simam" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold">{formatNumber(globalSimam)} Kg <span className="text-orange-600">({pctGlobalSimam.toFixed(0)}%)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-petro.png" alt="Petro" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold">{formatNumber(globalPetro)} Kg <span className="text-orange-600">({pctGlobalPetro.toFixed(0)}%)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-vivo.png" alt="Vivo" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold">{formatNumber(globalVivo)} Kg <span className="text-orange-600">({pctGlobalVivo.toFixed(0)}%)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-total.png" alt="Total" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold">{formatNumber(globalTotalE)} Kg <span className="text-orange-600">({pctGlobalTotalE.toFixed(0)}%)</span></span>
                </div>
              </div>
            </div>
            <div className="bg-orange-100/50 rounded-md p-3 border border-orange-200 text-center mt-auto">
              <span className="text-sm text-muted-foreground">Ventes CE = </span>
              <span className="text-xl font-bold text-orange-600">{correlation.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground"> de la production CE</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== ROW 2: VRAC + CONDITIONNÉ ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* VRAC */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🛢️ VRAC</CardTitle>
            <span className="text-xs font-bold">{formatNumber(totalVracAll)} Kg</span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Simam */}
              <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-simam.png" alt="Simam" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold mt-1">{formatNumber(vracSimam)}</span>
                <span className="text-sm text-amber-600 font-semibold">{pctVracSimam.toFixed(0)}%</span>
              </div>
              {/* Petro */}
              <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-petro.png" alt="Petro" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold mt-1">{formatNumber(vracPetro)}</span>
                <span className="text-sm text-amber-600 font-semibold">{pctVracPetro.toFixed(0)}%</span>
              </div>
              {/* Vivo */}
              <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-vivo.png" alt="Vivo" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold mt-1">{formatNumber(vracVivo)}</span>
                <span className="text-sm text-amber-600 font-semibold">{pctVracVivo.toFixed(0)}%</span>
              </div>
              {/* Total */}
              <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-total.png" alt="Total" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold mt-1">{formatNumber(vracTotalE)}</span>
                <span className="text-sm text-amber-600 font-semibold">{pctVracTotalE.toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONDITIONNÉ */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📦 CONDITIONNÉ</CardTitle>
            <span className="text-xs font-bold">{formatNumber(totalCeAll)} Kg</span>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {/* Petro */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-petro.png" alt="Petro" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold flex-1 text-center">{formatNumber(cePetro)} Kg</span>
                <span className="text-base font-bold text-green-600 bg-green-100 px-3 py-1 rounded">{pctCePetro.toFixed(0)}%</span>
              </div>
              {/* Vivo */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-vivo.png" alt="Vivo" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold flex-1 text-center">{formatNumber(ceVivo)} Kg</span>
                <span className="text-base font-bold text-green-600 bg-green-100 px-3 py-1 rounded">{pctCeVivo.toFixed(0)}%</span>
              </div>
              {/* Total E */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-total.png" alt="Total" className="h-full w-full object-contain" />
                </div>
                <span className="text-xl font-bold flex-1 text-center">{formatNumber(ceTotalE)} Kg</span>
                <span className="text-base font-bold text-green-600 bg-green-100 px-3 py-1 rounded">{pctCeTotalE.toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== ROW 3: TOP PERFORMERS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Top Performers - Tonnage */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📊 Top Performers - Tonnage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-3 gap-3">
              {/* Meilleure Ligne */}
              <div className="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Meilleure Ligne</p>
                {topPerformers.topLine ? (
                  <>
                    <p className="text-lg font-bold text-blue-700">{topPerformers.topLine.name}</p>
                    <p className="text-xl font-bold text-foreground">{formatNumber(topPerformers.topLine.tonnage)} Kg</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
              {/* Chef de Quart */}
              <div className="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Chef de Quart</p>
                {topPerformers.topChefByTonnage ? (
                  <>
                    <p className="text-lg font-bold text-blue-700 truncate">{topPerformers.topChefByTonnage.name}</p>
                    <p className="text-xl font-bold text-foreground">{formatNumber(topPerformers.topChefByTonnage.tonnage)} Kg</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
              {/* Chef de Ligne */}
              <div className="bg-white p-3 rounded-lg border border-blue-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Chef de Ligne</p>
                {topPerformers.topAgentByTonnage ? (
                  <>
                    <p className="text-lg font-bold text-blue-700 truncate">{topPerformers.topAgentByTonnage.name}</p>
                    <p className="text-xl font-bold text-foreground">{formatNumber(topPerformers.topAgentByTonnage.tonnage)} Kg</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers - Productivité */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🎯 Top Performers - Productivité</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-3 gap-3">
              {/* Meilleure Ligne */}
              <div className="bg-white p-3 rounded-lg border border-green-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Meilleure Ligne</p>
                {topPerformers.topLine ? (
                  <>
                    <p className="text-lg font-bold text-green-700">{topPerformers.topLine.name}</p>
                    <p className="text-sm text-muted-foreground">{topPerformers.topLine.percentage.toFixed(1)}%</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
              {/* Chef de Quart */}
              <div className="bg-white p-3 rounded-lg border border-green-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Chef de Quart</p>
                {topPerformers.topChefByProductivity ? (
                  <>
                    <p className="text-lg font-bold text-green-700 truncate">{topPerformers.topChefByProductivity.name}</p>
                    <p className="text-xl font-bold text-green-600">{topPerformers.topChefByProductivity.productivity.toFixed(1)}%</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
              {/* Chef de Ligne */}
              <div className="bg-white p-3 rounded-lg border border-green-100 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Chef de Ligne</p>
                {topPerformers.topAgentByProductivity ? (
                  <>
                    <p className="text-lg font-bold text-green-700 truncate">{topPerformers.topAgentByProductivity.name}</p>
                    <p className="text-xl font-bold text-green-600">{topPerformers.topAgentByProductivity.productivity.toFixed(1)}%</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== ROW 4: PRODUCTION CE ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Tonnage Production CE */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tonnage Production CE</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl font-bold">
              {productionStats.loading ? '...' : `${formatNumber(productionStats.tonnage)} Kg`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{getPeriodText()}</p>
            <div className="mt-3 space-y-1 border-t pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B6</span>
                <span className="text-xl font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b6 * 6)} Kg</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B12</span>
                <span className="text-xl font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b12 * 12)} Kg</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B28</span>
                <span className="text-xl font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b28 * 28)} Kg</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B38</span>
                <span className="text-xl font-bold text-foreground">{formatNumber(productionStats.bottlesByType.b38 * 38)} Kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouteilles Produites */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bouteilles Produites</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">
              {productionStats.loading ? '...' : productionStats.bouteilles.toLocaleString('fr-FR')}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B6: <span className="font-bold text-foreground">{productionStats.bottlesByType.b6.toLocaleString('fr-FR')}</span></span>
                <span className="font-bold text-foreground">{pctB6.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B12: <span className="font-bold text-foreground">{productionStats.bottlesByType.b12.toLocaleString('fr-FR')}</span></span>
                <span className="font-bold text-foreground">{pctB12.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B28: <span className="font-bold text-foreground">{productionStats.bottlesByType.b28.toLocaleString('fr-FR')}</span></span>
                <span className="font-bold text-foreground">{pctB28.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">B38: <span className="font-bold text-foreground">{productionStats.bottlesByType.b38.toLocaleString('fr-FR')}</span></span>
                <span className="font-bold text-foreground">{pctB38.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production par Client */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production par Client</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-petro.png" alt="Petro" className="h-full w-full object-contain" />
                </div>
                <span className="text-base font-bold">{pctProdPetro.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-vivo.png" alt="Vivo" className="h-full w-full object-contain" />
                </div>
                <span className="text-base font-bold">{pctProdVivo.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                  <img src="/images/logo-total.png" alt="Total" className="h-full w-full object-contain" />
                </div>
                <span className="text-base font-bold">{pctProdTotal.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retour marché */}
        <Card className="bg-orange-50/50 border-orange-200 flex flex-col justify-between h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retour marché</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cumul</span>
                <span className="text-xl font-bold text-destructive">{formatNumber(totalFuyardes)} Kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">% des sorties</span>
                <span className="text-sm font-semibold text-destructive">
                  {totalSorties > 0 ? ((totalFuyardes / totalSorties) * 100).toFixed(2) : 0}%
                </span>
              </div>
              <div className="border-t pt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-petro.png" alt="Petro" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(filteredEntries.reduce((sum, e) => sum + (e.fuyardes_petro_ivoire || 0), 0))} Kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-vivo.png" alt="Vivo" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(filteredEntries.reduce((sum, e) => sum + (e.fuyardes_vivo_energies || 0), 0))} Kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm overflow-hidden p-0.5">
                    <img src="/images/logo-total.png" alt="Total" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(filteredEntries.reduce((sum, e) => sum + (e.fuyardes_total_energies || 0), 0))} Kg</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Monthly Objective Dialog */}
      <Dialog open={showObjectiveDialog} onOpenChange={setShowObjectiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Objectif mensuel de ventes</DialogTitle>
            <DialogDescription>
              Définissez l'objectif de ventes pour le mois de {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="objective" className="text-right">
                Objectif (Kg)
              </Label>
              <Input
                id="objective"
                type="number"
                value={objectiveValue}
                onChange={(e) => setObjectiveValue(e.target.value)}
                className="col-span-3"
                placeholder="Ex: 500000"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveMonthlyObjective}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Dashboard;
