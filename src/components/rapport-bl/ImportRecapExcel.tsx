import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeClient,
  parseExcelDate,
  toIsoDate,
} from '@/utils/bonsTransfert';
import type { ImportRow } from '@/types/bons';

interface ImportRecapExcelProps {
  onImported?: () => void;
}

type RawXlsxRow = Record<string, unknown>;

/**
 * Récupère la première valeur dont la clé contient l'un des fragments donnés
 * (case-insensitive, espaces/ponctuation ignorés). Tolère les variantes
 * d'en-têtes du fichier d'export pesée : "D.SORTIE" vs "DATE SORTIE",
 * "CLIENT :" vs "CLIENT", "COMMANDE :" vs "BON", etc.
 */
function pickField(row: RawXlsxRow, ...needles: string[]): unknown {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const needlesNorm = needles.map(norm);
  for (const key of Object.keys(row)) {
    const k = norm(key);
    if (needlesNorm.some((n) => k.includes(n))) return row[key];
  }
  return undefined;
}

export function ImportRecapExcel({ onImported }: ImportRecapExcelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [open, setOpen] = useState(false);

  const pickFile = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<RawXlsxRow>(ws, { defval: null });

      // Mapper en lignes structurées (en-têtes tolérantes aux variantes)
      const mapped = data
        .map((r) => {
          const date = parseExcelDate(pickField(r, 'sortie', 'datesortie', 'dsortie'));
          const client = normalizeClient(pickField(r, 'client'));
          const numero = String(pickField(r, 'commande', 'bon') ?? '').trim();
          const poids = Number(pickField(r, 'poidsnet', 'poids')) || 0;
          const citerne = String(pickField(r, 'citerne') ?? '').trim();
          if (!date || !client || !numero) return null;
          return { date, citerne, client, numero_bon: numero, poids_kg: poids };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (mapped.length === 0) {
        toast.error('Aucune ligne exploitable trouvée dans le fichier.');
        return;
      }

      // Lookup en base : pour chaque (client, numero_bon)
      const couples = mapped.map((m) => `(${m.client},${m.numero_bon})`);
      const uniqueCouples = Array.from(new Set(couples));
      // Supabase n'accepte pas un OR composite simple côté JS — on récupère
      // tous les bons des clients concernés sur les numéros uniques,
      // ensuite on filtre côté JS.
      const distinctClients = Array.from(new Set(mapped.map((m) => m.client)));
      const distinctNumeros = Array.from(new Set(mapped.map((m) => m.numero_bon)));
      const { data: existing, error } = await (supabase as any)
        .from('bons_transfert')
        .select('id, client, numero_bon, statut')
        .in('client', distinctClients)
        .in('numero_bon', distinctNumeros);

      if (error) {
        console.error(error);
        toast.error('Échec du lookup en base.');
        return;
      }

      const index = new Map<string, { id: string; statut: string }>();
      (existing ?? []).forEach((b: any) =>
        index.set(`${b.client}|${b.numero_bon}`, { id: b.id, statut: b.statut }),
      );

      const result: ImportRow[] = mapped.map((m) => {
        const key = `${m.client}|${m.numero_bon}`;
        const found = index.get(key);
        if (!found) {
          return { ...m, status: 'inconnu', create_if_missing: true };
        }
        if (found.statut === 'utilise') {
          return { ...m, status: 'doublon', bon_id: found.id };
        }
        return { ...m, status: 'ok', bon_id: found.id };
      });

      setRows(result);
      setOpen(true);
      // évite que TS se plaigne d'unused
      void uniqueCouples;
    } finally {
      setParsing(false);
    }
  };

  const counts = {
    ok: rows.filter((r) => r.status === 'ok').length,
    doublon: rows.filter((r) => r.status === 'doublon').length,
    inconnu: rows.filter((r) => r.status === 'inconnu').length,
  };

  const toggleCreate = (idx: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, create_if_missing: !r.create_if_missing } : r,
      ),
    );
  };

  // Coche / Décoche en masse tous les Inconnus
  const setAllInconnu = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'inconnu' ? { ...r, create_if_missing: checked } : r,
      ),
    );
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      // 1. UPDATE pour les lignes OK
      const okRows = rows.filter((r) => r.status === 'ok');
      for (const r of okRows) {
        await (supabase as any)
          .from('bons_transfert')
          .update({
            statut: 'utilise',
            date_sortie: toIsoDate(r.date),
            citerne: r.citerne,
            poids_net_kg: r.poids_kg,
          })
          .eq('id', r.bon_id!);
      }

      // 2. INSERT pour les lignes INCONNU cochées create_if_missing
      const toCreate = rows.filter((r) => r.status === 'inconnu' && r.create_if_missing);
      if (toCreate.length > 0) {
        await (supabase as any).from('bons_transfert').insert(
          toCreate.map((r) => ({
            client: r.client,
            numero_bon: r.numero_bon,
            statut: 'utilise',
            date_reception: toIsoDate(r.date), // on ne sait pas, on met date_sortie
            date_sortie: toIsoDate(r.date),
            citerne: r.citerne,
            poids_net_kg: r.poids_kg,
            commentaire: 'Créé via import (plage non saisie).',
          })),
        );
      }

      toast.success(
        `Import terminé : ${okRows.length} bons consommés, ${toCreate.length} créés à la volée.`,
      );
      setOpen(false);
      setRows([]);
      onImported?.();
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importer l'extraction pesée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Importe le fichier Excel exporté du logiciel de pesée. <br />
            Les colonnes doivent être dans l'ordre:	
            <code> DATE SORTIE</code> - <code>CITERNE</code> - <code>CLIENT</code> -
            <code> BON</code> - <code>POIDS NET</code>.
          </p>
          <Button onClick={pickFile} disabled={parsing}>
            {parsing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Choisir un fichier Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation de l'import</DialogTitle>
            <DialogDescription>
              Vérifie les lignes avant de confirmer. Les doublons sont ignorés.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 my-2">
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <Check className="h-3 w-3 mr-1" /> OK : {counts.ok}
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <AlertTriangle className="h-3 w-3 mr-1" /> Doublons : {counts.doublon}
            </Badge>
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              <X className="h-3 w-3 mr-1" /> Inconnus : {counts.inconnu}
            </Badge>
            {counts.inconnu > 0 && (
              <div className="ml-auto flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllInconnu(true)}
                >
                  <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                  Tout cocher
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllInconnu(false)}
                >
                  <X className="h-3.5 w-3.5 mr-1 text-red-600" />
                  Tout décocher
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="max-h-[400px] border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>N° bon</TableHead>
                  <TableHead>Citerne</TableHead>
                  <TableHead className="text-right">Poids (kg)</TableHead>
                  <TableHead className="text-center">Créer si inconnu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow
                    key={i}
                    className={
                      r.status === 'doublon'
                        ? 'bg-yellow-50'
                        : r.status === 'inconnu'
                        ? 'bg-red-50'
                        : ''
                    }
                  >
                    <TableCell>
                      {r.status === 'ok' && (
                        <Badge className="bg-green-100 text-green-800">OK</Badge>
                      )}
                      {r.status === 'doublon' && (
                        <Badge className="bg-yellow-100 text-yellow-800">Doublon</Badge>
                      )}
                      {r.status === 'inconnu' && (
                        <Badge className="bg-red-100 text-red-800">Inconnu</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.date.toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{r.client}</TableCell>
                    <TableCell className="font-mono">{r.numero_bon}</TableCell>
                    <TableCell className="text-xs">{r.citerne}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.poids_kg.toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.status === 'inconnu' ? (
                        <Checkbox
                          checked={!!r.create_if_missing}
                          onCheckedChange={() => toggleCreate(i)}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={importing || counts.ok === 0}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer l'import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
