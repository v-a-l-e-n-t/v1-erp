import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BilanEntry } from '@/types/balance';
import { formatNumber, getNatureBadgeVariant, getNatureColor } from '@/utils/calculations';
import { Download, Trash2, Pencil, CalendarIcon, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface HistoryTableProps {
  entries: BilanEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: BilanEntry) => void;
  onExport: (format: 'excel' | 'pdf') => void;
  onPrint: (entry: BilanEntry) => void;
}

const HistoryTable = ({ entries, onDelete, onEdit, onExport, onPrint }: HistoryTableProps) => {
  const [filterNature, setFilterNature] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'year' | 'month' | 'period' | 'day'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryDateStr = entry.date; // Format: YYYY-MM-DD

      // Date filter
      if (filterType === 'all') {
        // Pas de filtre de date
      } else if (filterType === 'year') {
        if (!entryDateStr.startsWith(selectedYear.toString())) return false;
      } else if (filterType === 'month') {
        const entryMonth = entryDateStr.substring(0, 7); // YYYY-MM
        if (entryMonth !== selectedMonth) return false;
      } else if (filterType === 'day' && selectedDate) {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        if (entryDateStr !== selectedDateStr) return false;
      } else if (filterType === 'period' && dateRange?.from) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
        if (entryDateStr < fromStr || entryDateStr > toStr) return false;
      }

      // Nature filter
      if (filterNature !== 'all' && entry.nature !== filterNature) return false;

      return true;
    });
  }, [entries, filterType, selectedYear, selectedMonth, selectedDate, dateRange, filterNature]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
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

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nature du bilan</label>
            <Select value={filterNature} onValueChange={setFilterNature}>
              <SelectTrigger>
                <SelectValue placeholder="Nature du bilan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes natures</SelectItem>
                <SelectItem value="Positif">Positif</SelectItem>
                <SelectItem value="Négatif">Négatif</SelectItem>
                <SelectItem value="Neutre">Neutre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Export</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('excel')}
                className="flex-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredEntries.length} résultat{filteredEntries.length > 1 ? 's' : ''} sur {entries.length}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Stock initial</TableHead>
                  <TableHead className="text-right">Réception</TableHead>
                  <TableHead>Réceptions (détail)</TableHead>
                  <TableHead className="text-right">Sorties</TableHead>
                  <TableHead className="text-right">Théorique</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="text-right">Bilan</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Aucun résultat trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(entry.stock_initial)}</TableCell>
                      <TableCell className="text-right">{formatNumber(entry.reception_gpl)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="space-y-1 text-sm">
                          {entry.receptions.map((r, i) => (
                            <div key={i} className="truncate">
                              {formatNumber(r.quantity)}kg - {r.reception_no ? `${r.reception_no} - ` : ''}{r.navire}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(entry.cumul_sorties)}</TableCell>
                      <TableCell className="text-right">{formatNumber(entry.stock_theorique)}</TableCell>
                      <TableCell className="text-right">{formatNumber(entry.stock_final)}</TableCell>
                      <TableCell className={`text-right font-semibold ${getNatureColor(entry.nature)}`}>
                        {formatNumber(entry.bilan)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getNatureBadgeVariant(entry.nature)}>
                          {entry.nature}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrint(entry)}
                            title="Imprimer"
                          >
                            <Printer className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(entry)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Voulez-vous vraiment supprimer ce bilan ?')) {
                                onDelete(entry.id);
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryTable;
