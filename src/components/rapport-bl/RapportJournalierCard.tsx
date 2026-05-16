import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, Copy, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';
import {
  BON_CLIENT_LABELS,
  BON_CLIENTS,
  type BonClient,
  type BonTransfert,
} from '@/types/bons';
import { toIsoDate } from '@/utils/bonsTransfert';
import { DatePickerField } from './DatePickerField';

interface RapportJournalierCardProps {
  refreshKey?: number;
}

type FilterMode = 'all' | 'year' | 'month' | 'period' | 'day';

const today = new Date();
const todayIso = toIsoDate(today);
const currentYear = today.getFullYear();
const currentMonthIso = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR');
}

export function RapportJournalierCard({ refreshKey }: RapportJournalierCardProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [day, setDay] = useState<string>(todayIso);
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<string>(currentMonthIso); // YYYY-MM
  const [periodFrom, setPeriodFrom] = useState<string>(todayIso);
  const [periodTo, setPeriodTo] = useState<string>(todayIso);

  const [client, setClient] = useState<BonClient | 'ALL'>('ALL');
  const [rows, setRows] = useState<BonTransfert[]>([]);
  const [loading, setLoading] = useState(false);

  // Calcule la fenêtre de dates selon le mode
  const range = useMemo<{ from: string | null; to: string | null }>(() => {
    if (filterMode === 'all') return { from: null, to: null };
    if (filterMode === 'day') return { from: day, to: day };
    if (filterMode === 'period') return { from: periodFrom, to: periodTo };
    if (filterMode === 'year') {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    if (filterMode === 'month') {
      const [y, m] = month.split('-').map(Number);
      const last = new Date(y, m, 0); // jour 0 du mois suivant = dernier du mois
      return { from: `${month}-01`, to: toIsoDate(last) };
    }
    return { from: null, to: null };
  }, [filterMode, day, periodFrom, periodTo, year, month]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('bons_transfert')
        .select(
          'id, client, numero_bon, statut, date_sortie, date_edition, citerne, poids_net_kg, quantite_bon',
        )
        .eq('statut', 'utilise')
        .order('date_sortie')
        .order('client')
        .order('numero_bon');
      if (range.from) query = query.gte('date_sortie', range.from);
      if (range.to) query = query.lte('date_sortie', range.to);
      if (client !== 'ALL') query = query.eq('client', client);
      const { data, error } = await query;
      if (error) {
        console.error(error);
        toast.error('Échec du chargement du rapport.');
        return;
      }
      setRows((data ?? []) as BonTransfert[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, day, periodFrom, periodTo, year, month, client, refreshKey]);

  // Regroupé par client
  const byClient = useMemo(() => {
    const m = new Map<BonClient, BonTransfert[]>();
    for (const r of rows) {
      const list = m.get(r.client) ?? [];
      list.push(r);
      m.set(r.client, list);
    }
    return m;
  }, [rows]);

  // Libellé période pour l'export
  const periodLabel = useMemo(() => {
    if (filterMode === 'all') return 'Tous';
    if (filterMode === 'day') return formatDateFr(day);
    if (filterMode === 'period') return `${formatDateFr(periodFrom)} → ${formatDateFr(periodTo)}`;
    if (filterMode === 'year') return `Année ${year}`;
    if (filterMode === 'month') {
      const [y, m] = month.split('-');
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
    }
    return '';
  }, [filterMode, day, periodFrom, periodTo, year, month]);

  const fileSuffix = (() => {
    if (filterMode === 'all') return 'tous';
    if (filterMode === 'day') return day;
    if (filterMode === 'period') return `${periodFrom}_${periodTo}`;
    if (filterMode === 'year') return String(year);
    if (filterMode === 'month') return month;
    return '';
  })();

  // ----- Helpers d'export -----
  const EXPORT_HEADERS = [
    'N°',
    'Date sur bon',
    'Date de sortie',
    'Citerne',
    'Numéro du bon',
    'Quantité sur bon (kg)',
    'Poids NET (kg)',
  ];

  const exportRow = (r: BonTransfert, i: number) => [
    i + 1,
    formatDateFr(r.date_edition),
    formatDateFr(r.date_sortie),
    r.citerne ?? '—',
    r.numero_bon,
    r.quantite_bon ?? '',
    r.poids_net_kg ?? '',
  ];

  const exportExcel = (c: BonClient, list: BonTransfert[]) => {
    const wb = XLSX.utils.book_new();
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'E07020' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: {
        top: { style: 'thin' as const, color: { rgb: '000000' } },
        bottom: { style: 'thin' as const, color: { rgb: '000000' } },
        left: { style: 'thin' as const, color: { rgb: '000000' } },
        right: { style: 'thin' as const, color: { rgb: '000000' } },
      },
    };
    const data = list.map(exportRow);
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...data]);
    EXPORT_HEADERS.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[cell]) ws[cell].s = headerStyle;
    });
    ws['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, BON_CLIENT_LABELS[c]);
    const fileName = `rapport_bl_${c}_${fileSuffix}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const copyTable = async (c: BonClient, list: BonTransfert[]) => {
    const head = `<thead><tr>${EXPORT_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
    const body = list
      .map((r, i) => `<tr>${exportRow(r, i).map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');
    const html = `<table border="1" cellpadding="4" cellspacing="0"><caption>Rapport ${BON_CLIENT_LABELS[c]} — ${periodLabel}</caption>${head}<tbody>${body}</tbody></table>`;
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([item]);
      toast.success(`Tableau ${BON_CLIENT_LABELS[c]} copié.`);
    } catch {
      const text = list
        .map((r, i) => exportRow(r, i).join('\t'))
        .join('\n');
      await navigator.clipboard.writeText(text);
      toast.success('Tableau copié en texte brut.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Rapport journalier par client
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="space-y-1">
            <Label>Filtre</Label>
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="year">Année</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="period">Période</SelectItem>
                <SelectItem value="day">Jour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode === 'day' && (
            <div className="space-y-1">
              <Label>Jour</Label>
              <DatePickerField value={day} onChange={setDay} className="w-[180px]" />
            </div>
          )}

          {filterMode === 'period' && (
            <>
              <div className="space-y-1">
                <Label>Du</Label>
                <DatePickerField value={periodFrom} onChange={setPeriodFrom} className="w-[180px]" />
              </div>
              <div className="space-y-1">
                <Label>Au</Label>
                <DatePickerField value={periodTo} onChange={setPeriodTo} className="w-[180px]" />
              </div>
            </>
          )}

          {filterMode === 'month' && (
            <div className="space-y-1">
              <Label>Mois</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[170px]"
              />
            </div>
          )}

          {filterMode === 'year' && (
            <div className="space-y-1">
              <Label>Année</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || currentYear)}
                className="w-[110px]"
                min={2020}
                max={2100}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Client</Label>
            <Select value={client} onValueChange={(v) => setClient(v as BonClient | 'ALL')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les clients</SelectItem>
                {BON_CLIENTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {BON_CLIENT_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {rows.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground italic">
            Aucun bon consommé pour ce filtre.
          </p>
        )}

        {Array.from(byClient.entries()).map(([c, list]) => (
          <div key={c} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-primary">
                {BON_CLIENT_LABELS[c]}{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  ({list.length} bons · {periodLabel})
                </span>
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyTable(c, list)}>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copier
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportExcel(c, list)}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                  Excel
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">N°</TableHead>
                  <TableHead>Date sur bon</TableHead>
                  <TableHead>Date de sortie</TableHead>
                  <TableHead>Citerne</TableHead>
                  <TableHead>Numéro du bon</TableHead>
                  <TableHead className="text-right">Qté sur bon (kg)</TableHead>
                  <TableHead className="text-right">Poids NET (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{i + 1}</TableCell>
                    <TableCell>{formatDateFr(r.date_edition)}</TableCell>
                    <TableCell>{formatDateFr(r.date_sortie)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.citerne ?? '—'}</TableCell>
                    <TableCell className="font-mono">{r.numero_bon}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.quantite_bon != null ? r.quantite_bon.toLocaleString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(r.poids_net_kg ?? 0).toLocaleString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
