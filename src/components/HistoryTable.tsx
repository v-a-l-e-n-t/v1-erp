import { useState, useMemo } from 'react';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      
      // Date range filter
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      
      // Nature filter
      if (filterNature !== 'all' && entry.nature !== filterNature) return false;
      
      return true;
    });
  }, [entries, startDate, endDate, filterNature]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des bilans</CardTitle>
        <CardDescription>Consultez et filtrez l'historique complet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date début</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: fr }) : <span>Sélectionner</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: fr }) : <span>Sélectionner</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
