import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CalendarIcon, FilePlus, FileDown, ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LigneRaw {
  id: string;
  rapport_id: string;
  chariot_id: string;
  chariot_nom: string; // résolu depuis la jointure chariots(nom)
  gasoil: number | null;
  temps_arret: number | null;
  compteur_horaire: number | null;
  numero_di: string | null;
  etat: string | null;
  date_rapport: string;
}

interface ChariotStats {
  nom: string;
  prestataire: Prestataire;
  nbre_cumule: number;
  gasoil: number;
  temps_arret: number;
  taux_lh: number;
}

type Prestataire = 'COMATEC' | 'DSA' | 'ITB' | 'AUTRE';
type FilterType = 'all' | 'year' | 'month' | 'period';

const PRESTATAIRES = ['COMATEC', 'DSA', 'ITB'] as const;

interface ChariotDashboardProps {
  onNavigateToForm: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrestataire(chariotNom: string): Prestataire {
  const upper = chariotNom.toUpperCase();
  if (upper.includes('COMATEC')) return 'COMATEC';
  if (upper.includes('DSA')) return 'DSA';
  if (upper.includes('ITB')) return 'ITB';
  return 'AUTRE';
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChariotDashboard({ onNavigateToForm }: ChariotDashboardProps) {
  const [lignes, setLignes] = useState<LigneRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const availableYears = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentYear - i),
    [currentYear]
  );

  // ── Data fetch ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);

      // Step 1: build rapports query with optional date filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      let rapportsData: any[] | null = null;
      let rapportsError: any = null;

      if (filterType === 'year') {
        ({ data: rapportsData, error: rapportsError } = await sb
          .from('rapports_chariots')
          .select('id, date_rapport')
          .gte('date_rapport', `${selectedYear}-01-01`)
          .lte('date_rapport', `${selectedYear}-12-31`)
          .order('date_rapport', { ascending: false }));
      } else if (filterType === 'month') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        ({ data: rapportsData, error: rapportsError } = await sb
          .from('rapports_chariots')
          .select('id, date_rapport')
          .gte('date_rapport', `${selectedMonth}-01`)
          .lte('date_rapport', `${selectedMonth}-${String(lastDay).padStart(2, '0')}`)
          .order('date_rapport', { ascending: false }));
      } else if (filterType === 'period' && dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        ({ data: rapportsData, error: rapportsError } = await sb
          .from('rapports_chariots')
          .select('id, date_rapport')
          .gte('date_rapport', fromStr)
          .lte('date_rapport', toStr)
          .order('date_rapport', { ascending: false }));
      } else {
        ({ data: rapportsData, error: rapportsError } = await sb
          .from('rapports_chariots')
          .select('id, date_rapport')
          .order('date_rapport', { ascending: false }));
      }

      if (rapportsError) {
        console.error('[ChariotDashboard] Erreur rapports_chariots:', rapportsError);
        setFetchError(`Erreur: ${rapportsError.message}`);
        setLignes([]);
        setLoading(false);
        return;
      }

      console.log('[ChariotDashboard] rapports trouvés:', rapportsData?.length ?? 0);

      if (!rapportsData?.length) {
        setLignes([]);
        setLoading(false);
        return;
      }

      const rapportIds = rapportsData.map((r: any) => r.id);
      const dateByRapportId = new Map<string, string>(
        rapportsData.map((r: any) => [r.id, r.date_rapport])
      );

      // Step 2: batch fetch lignes + nom du chariot via jointure
      const { data: lignesData, error: lignesError } = await sb
        .from('rapport_chariot_lignes')
        .select('id, rapport_id, chariot_id, gasoil, temps_arret, compteur_horaire, numero_di, etat, chariots(nom)')
        .in('rapport_id', rapportIds);

      if (lignesError) {
        console.error('[ChariotDashboard] Erreur rapport_chariot_lignes:', lignesError);
        setFetchError(`Erreur lignes: ${lignesError.message}`);
        setLignes([]);
        setLoading(false);
        return;
      }

      console.log('[ChariotDashboard] lignes trouvées:', lignesData?.length ?? 0);

      const enriched: LigneRaw[] = (lignesData || []).map((l: any) => ({
        ...l,
        chariot_nom: l.chariots?.nom ?? l.chariot_id ?? 'Inconnu',
        date_rapport: dateByRapportId.get(l.rapport_id) || '',
      }));

      setLignes(enriched);
      setLoading(false);
    };

    fetchData();
  }, [filterType, selectedYear, selectedMonth, dateRange]);

  // ── Aggregation ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!lignes.length) return null;

    const gasoilParPrestataire: Record<string, number> = { COMATEC: 0, DSA: 0, ITB: 0, AUTRE: 0 };
    const diParPrestataire: Record<string, Set<string>> = {
      COMATEC: new Set(), DSA: new Set(), ITB: new Set(), AUTRE: new Set(),
    };
    const gasoilParChariot = new Map<string, number>();
    const maxCompteurParChariot = new Map<string, number>();

    let totalGasoil = 0;
    let totalArret = 0;
    const allDI = new Set<string>();
    const arretParPrestataire: Record<string, number> = { COMATEC: 0, DSA: 0, ITB: 0, AUTRE: 0 };
    const arretParChariot = new Map<string, number>();

    lignes.forEach(l => {
      const p = getPrestataire(l.chariot_nom);
      const g = l.gasoil ?? 0;
      const t = l.temps_arret ?? 0;
      const c = l.compteur_horaire ?? 0;
      const nom = l.chariot_nom;

      totalGasoil += g;
      totalArret += t;
      gasoilParPrestataire[p] += g;
      arretParPrestataire[p] += t;

      if (l.numero_di && l.numero_di.trim() !== '') {
        allDI.add(l.numero_di.trim());
        diParPrestataire[p].add(l.numero_di.trim());
      }

      gasoilParChariot.set(nom, (gasoilParChariot.get(nom) ?? 0) + g);
      arretParChariot.set(nom, (arretParChariot.get(nom) ?? 0) + t);
      if (c > (maxCompteurParChariot.get(nom) ?? 0)) {
        maxCompteurParChariot.set(nom, c);
      }
    });

    // Per-chariot table rows
    const chariotRows: ChariotStats[] = [];
    gasoilParChariot.forEach((gasoil, nom) => {
      const maxC = maxCompteurParChariot.get(nom) ?? 0;
      const arret = parseFloat((arretParChariot.get(nom) ?? 0).toFixed(2));
      chariotRows.push({
        nom,
        prestataire: getPrestataire(nom),
        nbre_cumule: maxC,
        gasoil,
        temps_arret: arret,
        taux_lh: maxC > 0 ? gasoil / maxC : 0,
      });
    });
    chariotRows.sort((a, b) => {
      if (a.prestataire !== b.prestataire) return a.prestataire.localeCompare(b.prestataire);
      return a.nom.localeCompare(b.nom);
    });

    // DI counts
    const diCountParPrestataire: Record<string, number> = {
      COMATEC: diParPrestataire.COMATEC.size,
      DSA: diParPrestataire.DSA.size,
      ITB: diParPrestataire.ITB.size,
    };

    // Top performers: lowest taux L/H per prestataire (exclude compteur=0)
    const topPerformers: Record<string, string> = {};
    PRESTATAIRES.forEach(p => {
      const group = chariotRows.filter(r => r.prestataire === p && r.nbre_cumule > 0);
      if (!group.length) { topPerformers[p] = '—'; return; }
      const best = group.reduce((a, b) => a.taux_lh <= b.taux_lh ? a : b);
      topPerformers[p] = best.nom;
    });

    return {
      totalGasoil,
      totalArret: parseFloat(totalArret.toFixed(2)),
      gasoilParPrestataire,
      arretParPrestataire,
      diCountParPrestataire,
      totalDI: allDI.size,
      chariotRows,
      topPerformers,
    };
  }, [lignes]);

  // ── Period label ────────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (filterType === 'all') return 'Toutes les données';
    if (filterType === 'year') return `Année ${selectedYear}`;
    if (filterType === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      return format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: fr });
    }
    if (filterType === 'period' && dateRange?.from) {
      const from = format(dateRange.from, 'dd/MM/yyyy');
      const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : from;
      return `${from} → ${to}`;
    }
    return '';
  }, [filterType, selectedYear, selectedMonth, dateRange]);

  // ── Export ──────────────────────────────────────────────────────────────────

  const captureCanvas = () => {
    const el = dashboardRef.current;
    if (!el) return Promise.reject('no ref');
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      height: el.scrollHeight + 40,
      windowHeight: el.scrollHeight + 40,
      y: 0,
      scrollY: 0,
    });
  };

  const exportImage = async () => {
    const canvas = await captureCanvas();
    const link = document.createElement('a');
    link.download = `dashboard-chariots-${format(new Date(), 'yyyy-MM-dd')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportPDF = async () => {
    const canvas = await captureCanvas();
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`dashboard-chariots-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-6" ref={dashboardRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Chariots Élévateurs</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter type */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les données</SelectItem>
              <SelectItem value="year">Par année</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="period">Période libre</SelectItem>
            </SelectContent>
          </Select>

          {/* Year selector */}
          {(filterType === 'year' || filterType === 'month') && (
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month selector */}
          {filterType === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  const val = `${selectedYear}-${String(m).padStart(2, '0')}`;
                  const label = format(new Date(selectedYear, i, 1), 'MMMM', { locale: fr });
                  return (
                    <SelectItem key={val} value={val}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Date range picker */}
          {filterType === 'period' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 text-xs', !dateRange?.from && 'text-muted-foreground')}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, 'dd/MM/yy')} → ${format(dateRange.to, 'dd/MM/yy')}`
                      : format(dateRange.from, 'dd/MM/yy')
                    : 'Choisir dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) setCalendarOpen(false);
                  }}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Export buttons */}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportImage}>
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            PNG
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportPDF}>
            <FileDown className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>

          {/* Link to form */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold"
            onClick={onNavigateToForm}
          >
            <FilePlus className="h-3.5 w-3.5 mr-1" />
            Saisie
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Chargement des données...
        </p>
      )}

      {/* Error state */}
      {!loading && fetchError && (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm font-semibold text-destructive">{fetchError}</p>
          <p className="text-xs text-muted-foreground">Ouvre la console du navigateur (F12) pour plus de détails.</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && !stats && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Aucune donnée chariot pour la période sélectionnée.<br />
          <span className="text-xs">Vérifie qu'il existe des rapports enregistrés depuis la page Saisie.</span>
        </p>
      )}

      {/* Dashboard content */}
      {!loading && !fetchError && stats && (
        <>
          {/* ── ROW 1: 4 stat cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Gasoil total */}
            <Card className="border border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Service Gasoil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-primary">
                  {fmt(stats.totalGasoil)}
                  <span className="text-sm font-normal text-primary/60 ml-1">Litres</span>
                </p>
              </CardContent>
            </Card>

            {/* Répartition gasoil par prestataire */}
            <Card className="border border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Répartition gasoil par prestataires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {PRESTATAIRES.map(p => (
                  <div key={p} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p}</span>
                    <span className="font-bold text-primary">
                      {fmt(stats.gasoilParPrestataire[p] ?? 0)} L
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cumul arrêts total */}
            <Card className="border border-orange-500/20 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cumul Arrêts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-orange-600">
                  {fmt(stats.totalArret)}
                  <span className="text-sm font-normal text-orange-600/60 ml-1">H</span>
                </p>
              </CardContent>
            </Card>

            {/* Répartition arrêts par prestataire */}
            <Card className="border border-orange-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Répartition arrêt par prestataires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {PRESTATAIRES.map(p => (
                  <div key={p} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p}</span>
                    <span className="font-bold text-orange-600">
                      {fmt(stats.arretParPrestataire[p] ?? 0)} H
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── ROW 2: Chariot table ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Infos chariots élévateurs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chariot</TableHead>
                    <TableHead className="text-right">Nbre cumulé (H)</TableHead>
                    <TableHead className="text-right">Gasoil (L)</TableHead>
                    <TableHead className="text-right">Tps d'arrêt cumulé (H)</TableHead>
                    <TableHead className="text-right">Taux L/H</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.chariotRows.map(row => (
                    <TableRow key={row.nom}>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="text-right">{fmt(row.nbre_cumule)}</TableCell>
                      <TableCell className="text-right">{fmt(row.gasoil)}</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {fmt(row.temps_arret)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.nbre_cumule > 0
                          ? row.taux_lh.toLocaleString('fr-FR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }) + ' L/H'
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.chariotRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Aucune donnée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── ROW 3: 3 stat cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Nombre DI */}
            <Card className="border border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre de DI traités
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold text-blue-600">{stats.totalDI}</p>
              </CardContent>
            </Card>

            {/* Répartition DI par prestataire */}
            <Card className="border border-blue-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Répartition DI par prestataires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {PRESTATAIRES.map(p => (
                  <div key={p} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p}</span>
                    <span className="font-bold text-blue-600">
                      {stats.diCountParPrestataire[p] ?? 0}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="border border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Top Performers chariot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PRESTATAIRES.map(p => (
                  <div key={p}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">{p}</p>
                    <p className="text-sm font-bold text-green-700 leading-relaxed">
                      {stats.topPerformers[p]}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
