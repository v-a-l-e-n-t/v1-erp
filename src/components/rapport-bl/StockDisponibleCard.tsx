import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Loader2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  BON_CLIENT_LABELS,
  BON_CLIENTS,
  type BonClient,
  type BonTransfert,
} from '@/types/bons';
import { compactNumbers, daysLeft, expiryLevel } from '@/utils/bonsTransfert';

interface StockDisponibleCardProps {
  refreshKey?: number;
}

export function StockDisponibleCard({ refreshKey }: StockDisponibleCardProps) {
  const [byClient, setByClient] = useState<Record<BonClient, BonTransfert[]>>({
    SIMAM: [],
    PETROIVOIRE: [],
    VIVO: [],
    TOTAL: [],
  });
  const [loading, setLoading] = useState(false);
  const [openClient, setOpenClient] = useState<BonClient | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('bons_transfert')
        .select('id, client, numero_bon, date_reception, date_edition, quantite_bon')
        .eq('statut', 'disponible')
        .order('numero_bon');
      if (error) {
        console.error(error);
        return;
      }
      const grouped: Record<BonClient, BonTransfert[]> = {
        SIMAM: [], PETROIVOIRE: [], VIVO: [], TOTAL: [],
      };
      (data ?? []).forEach((r: any) => grouped[r.client as BonClient]?.push(r));
      setByClient(grouped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Liste filtrée pour le client ouvert
  const detailRows = useMemo(() => {
    if (!openClient) return [];
    const all = byClient[openClient];
    if (!filter.trim()) return all;
    const q = filter.toLowerCase();
    return all.filter(
      (b) =>
        b.numero_bon.toLowerCase().includes(q) ||
        (b.date_reception ?? '').toLowerCase().includes(q),
    );
  }, [openClient, byClient, filter]);

  const allSelected = detailRows.length > 0 && detailRows.every((r) => selected.has(r.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        detailRows.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      detailRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const openDetail = (c: BonClient) => {
    setOpenClient(c);
    setFilter('');
    setSelected(new Set());
  };

  // Mise à jour inline de la date d'édition d'un bon
  const updateDateEdition = async (id: string, newDate: string) => {
    if (!newDate) return;
    const { error } = await (supabase as any)
      .from('bons_transfert')
      .update({ date_edition: newDate })
      .eq('id', id);
    if (error) {
      console.error(error);
      toast.error("Échec de la mise à jour de la date d'édition.");
      return;
    }
    // Mise à jour optimiste du state local
    setByClient((prev) => {
      const next = { ...prev };
      for (const c of BON_CLIENTS) {
        next[c] = next[c].map((b) =>
          b.id === id ? { ...b, date_edition: newDate } : b,
        );
      }
      return next;
    });
    toast.success("Date d'édition mise à jour.");
  };

  // Mise à jour inline de la quantité prévue sur un bon
  const updateQuantiteBon = async (id: string, value: string) => {
    const num = value.trim() === '' ? null : Number(value);
    if (num != null && isNaN(num)) return;
    const { error } = await (supabase as any)
      .from('bons_transfert')
      .update({ quantite_bon: num })
      .eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Échec de la mise à jour de la quantité.');
      return;
    }
    setByClient((prev) => {
      const next = { ...prev };
      for (const c of BON_CLIENTS) {
        next[c] = next[c].map((b) =>
          b.id === id ? { ...b, quantite_bon: num } : b,
        );
      }
      return next;
    });
    toast.success('Quantité mise à jour.');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await (supabase as any)
        .from('bons_transfert')
        .delete()
        .in('id', ids);
      if (error) {
        console.error(error);
        toast.error('Échec de la suppression.');
        return;
      }
      toast.success(`${ids.length} bon(s) supprimé(s).`);
      setSelected(new Set());
      setConfirmOpen(false);
      await fetch();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" />
          Stock disponible
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {BON_CLIENTS.map((c) => {
            const list = byClient[c];
            const numeros = list.map((b) => b.numero_bon);
            const ranges = compactNumbers(numeros);
            return (
              <button
                key={c}
                type="button"
                onClick={() => openDetail(c)}
                className="border rounded-lg p-3 bg-muted/20 text-left hover:bg-muted/40 hover:border-primary/40 transition-colors"
                title="Cliquer pour voir et gérer les bons en stock"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm">{BON_CLIENT_LABELS[c]}</h4>
                  <Badge variant="outline" className="font-mono">
                    {list.length}
                  </Badge>
                </div>
                {ranges.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Aucun bon en stock.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs font-mono">
                    {ranges.slice(0, 6).map((r, i) => (
                      <li key={i} className="flex justify-between">
                        <span>
                          {r.from === r.to ? r.from : `${r.from} → ${r.to}`}
                        </span>
                        <span className="text-muted-foreground">
                          ({r.count})
                        </span>
                      </li>
                    ))}
                    {ranges.length > 6 && (
                      <li className="text-muted-foreground italic">
                        … et {ranges.length - 6} autre(s) plage(s)
                      </li>
                    )}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>

      {/* Dialog : historique détaillé d'un client avec suppression */}
      <Dialog open={!!openClient} onOpenChange={(o) => !o && setOpenClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle>
              Bons en stock — {openClient ? BON_CLIENT_LABELS[openClient] : ''}
            </DialogTitle>
            <DialogDescription>
              Liste de tous les bons <strong>disponibles</strong>. Coche ceux qui
              ne sont pas physiquement présents pour les retirer du système.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer par numéro ou date…"
                className="pl-8"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Supprimer ({selected.size})
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>Numéro du bon</TableHead>
                  <TableHead>Date de réception</TableHead>
                  <TableHead>Date sur bon</TableHead>
                  <TableHead className="text-right">Qté bon (kg)</TableHead>
                  <TableHead className="text-right">Jours restants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      Aucun bon ne correspond.
                    </TableCell>
                  </TableRow>
                ) : (
                  detailRows.map((b) => {
                    const jours = daysLeft(b.date_edition);
                    const level = expiryLevel(jours);
                    const rowClass =
                      level === 'expired'
                        ? 'bg-red-100 hover:bg-red-200'
                        : level === 'danger'
                        ? 'bg-red-50 hover:bg-red-100'
                        : level === 'warning'
                        ? 'bg-orange-50 hover:bg-orange-100'
                        : '';
                    const txtClass =
                      level === 'expired'
                        ? 'text-red-700 font-bold'
                        : level === 'danger'
                        ? 'text-red-600 font-bold'
                        : level === 'warning'
                        ? 'text-orange-600 font-semibold'
                        : 'text-muted-foreground';
                    return (
                    <TableRow key={b.id} className={rowClass}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(b.id)}
                          onCheckedChange={() => toggleOne(b.id)}
                          aria-label={`Sélectionner ${b.numero_bon}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{b.numero_bon}</TableCell>
                      <TableCell className="text-xs">
                        {b.date_reception
                          ? new Date(b.date_reception + 'T00:00:00').toLocaleDateString('fr-FR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={b.date_edition ?? ''}
                          onChange={(e) => {
                            // Mise à jour visuelle immédiate (sans persistance)
                            const v = e.target.value;
                            setByClient((prev) => {
                              const next = { ...prev };
                              for (const c of BON_CLIENTS) {
                                next[c] = next[c].map((x) =>
                                  x.id === b.id ? { ...x, date_edition: v } : x,
                                );
                              }
                              return next;
                            });
                          }}
                          onBlur={(e) => {
                            if (e.target.value && e.target.value !== b.date_reception) {
                              // on persiste seulement si valeur différente du dernier save
                              updateDateEdition(b.id, e.target.value);
                            } else if (e.target.value) {
                              updateDateEdition(b.id, e.target.value);
                            }
                          }}
                          className="h-7 text-xs w-[130px]"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          inputMode="numeric"
                          defaultValue={b.quantite_bon ?? ''}
                          onBlur={(e) => {
                            if (
                              (e.target.value === '' && b.quantite_bon != null) ||
                              (e.target.value !== '' &&
                                Number(e.target.value) !== b.quantite_bon)
                            ) {
                              updateQuantiteBon(b.id, e.target.value);
                            }
                          }}
                          placeholder="30000"
                          className="h-7 text-xs w-[100px] text-right font-mono"
                        />
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${txtClass}`}>
                        {jours == null
                          ? '—'
                          : jours <= 0
                          ? `Expiré (${-jours}j)`
                          : `J-${jours}`}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <p className="text-xs text-muted-foreground mr-auto self-center">
              {detailRows.length} bon{detailRows.length > 1 ? 's' : ''} affiché
              {detailRows.length > 1 ? 's' : ''}
              {selected.size > 0 && ` · ${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`}
            </p>
            <Button variant="outline" onClick={() => setOpenClient(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {selected.size} bon{selected.size > 1 ? 's' : ''} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les bons sélectionnés seront retirés
              du système. À utiliser pour les bons qui ne sont pas physiquement
              présents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
