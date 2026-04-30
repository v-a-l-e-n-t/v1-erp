import { formatFr } from '@/utils/sphereStockCompute';
import {
  computeMarketerKg,
  DENSITE_BUTANE_GAZ_AIR,
  type MarketerSplit,
  type ReceptionResult,
  type ReceptionStateInputs,
  type SphereId,
} from '@/utils/receptionCompute';
import { parseFr as parseFrR } from '@/utils/receptionCompute';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  sphereId: SphereId;
  avantInputs: ReceptionStateInputs;
  apresInputs: ReceptionStateInputs;
  result: ReceptionResult;
  marketer: MarketerSplit;
  onMarketerChange: (next: MarketerSplit) => void;
}

interface RowProps {
  label: string;
  values: (number | string | null)[];
  decimals?: number;
  unit?: string;
  emphasis?: boolean;
  onlyGaz?: boolean;
}

function Row({ label, values, decimals = 0, unit, emphasis, onlyGaz }: RowProps) {
  return (
    <tr
      className={emphasis ? 'bg-primary/5 font-bold' : 'odd:bg-muted/20'}
    >
      <td className="px-2 py-1 text-xs text-left font-medium border-r border-border/40">
        {label}
        {unit && <span className="ml-1 text-[10px] text-muted-foreground">({unit})</span>}
      </td>
      {values.map((v, i) => {
        const isLiquide = i % 2 === 0;
        if (onlyGaz && isLiquide) {
          return <td key={i} className="border-r border-border/40 bg-muted/30" />;
        }
        const display =
          typeof v === 'number'
            ? formatFr(v, decimals)
            : v === null || v === undefined
              ? '—'
              : v;
        return (
          <td
            key={i}
            className="px-2 py-1 text-right tabular-nums font-mono text-xs border-r border-border/40 last:border-r-0"
          >
            {display}
          </td>
        );
      })}
    </tr>
  );
}

export function ReceptionResults({
  sphereId,
  avantInputs,
  apresInputs,
  result,
  marketer,
  onMarketerChange,
}: Props) {
  const { avant, apres, masse_transferee } = result;
  const transferred = masse_transferee;
  const negative = transferred !== null && transferred < 0;

  const mk = computeMarketerKg(marketer, transferred);

  const tempLiqAv = parseFrR(avantInputs.temperature_liquide_C);
  const tempLiqAp = parseFrR(apresInputs.temperature_liquide_C);
  const tempGazAv = parseFrR(avantInputs.temperature_gaz_C);
  const tempGazAp = parseFrR(apresInputs.temperature_gaz_C);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold text-orange-500 tracking-tight">
            Résultats — Sphère {sphereId}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left text-[10px] uppercase font-bold border-r border-border/40 w-[28%]">
                  Grandeur
                </th>
                <th colSpan={2} className="px-2 py-1 text-center border-r border-border/40 bg-muted/40 font-semibold">
                  AVANT transfert
                </th>
                <th colSpan={2} className="px-2 py-1 text-center bg-primary/10 text-primary font-semibold">
                  APRÈS transfert
                </th>
              </tr>
              <tr>
                <th />
                <th className="px-2 py-0.5 text-[10px] italic font-normal border-r border-border/40">Liquide</th>
                <th className="px-2 py-0.5 text-[10px] italic font-normal border-r border-border/40">Gaz</th>
                <th className="px-2 py-0.5 text-[10px] italic font-normal border-r border-border/40">Liquide</th>
                <th className="px-2 py-0.5 text-[10px] italic font-normal">Gaz</th>
              </tr>
            </thead>
            <tbody>
              <Row
                label="Volume"
                unit="L"
                values={[avant.volume_liquide, avant.volume_gazeux, apres.volume_liquide, apres.volume_gazeux]}
              />
              <Row
                label="Température"
                unit="°C"
                decimals={2}
                values={[
                  Number.isFinite(tempLiqAv) ? tempLiqAv : null,
                  Number.isFinite(tempGazAv) ? tempGazAv : null,
                  Number.isFinite(tempLiqAp) ? tempLiqAp : null,
                  Number.isFinite(tempGazAp) ? tempGazAp : null,
                ]}
              />
              <Row
                label="Masse volumique butane liquide"
                unit="kg/L"
                decimals={4}
                values={[avant.rho_butane_liq, null, apres.rho_butane_liq, null]}
                onlyGaz={false}
              />
              <Row
                label="Masse volumique air sec"
                unit="kg/L"
                decimals={7}
                values={[null, avant.rho_air, null, apres.rho_air]}
                onlyGaz
              />
              <Row
                label="Densité butane gazeux / air sec"
                decimals={3}
                values={[null, DENSITE_BUTANE_GAZ_AIR, null, DENSITE_BUTANE_GAZ_AIR]}
                onlyGaz
              />
              <Row
                label="Pression absolue"
                unit="bar"
                decimals={5}
                values={[null, avant.pression_absolue, null, apres.pression_absolue]}
                onlyGaz
              />
              <Row
                label="Masse"
                unit="kg"
                values={[avant.masse_liquide, avant.masse_gazeuse, apres.masse_liquide, apres.masse_gazeuse]}
              />
              <Row
                label="Masse liquide + gaz"
                unit="kg"
                emphasis
                values={[avant.masse_totale, avant.masse_totale, apres.masse_totale, apres.masse_totale]}
              />
            </tbody>
          </table>
        </div>

        <div
          className={`px-4 py-3 border-t flex items-center justify-between ${
            negative ? 'bg-red-50' : 'bg-primary/10'
          }`}
        >
          <span className="text-xs uppercase tracking-widest font-bold">
            Masse transférée — Sphère {sphereId}
          </span>
          <span
            className={`font-mono tabular-nums text-2xl font-bold ${
              negative ? 'text-red-600' : 'text-primary'
            }`}
          >
            {formatFr(transferred, 0)}
            <span className="ml-1 text-xs text-muted-foreground font-sans">kg</span>
          </span>
        </div>
      </div>

      {/* Répartition par marketer */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <h3 className="font-bold text-orange-500 text-sm">Répartition par marketer</h3>
          <p className="text-[11px] text-muted-foreground">
            Saisis les % par société (somme à 100). Les kg correspondants sont calculés sur la masse transférée.
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['PETROIVOIRE', 'TOTAL_CI', 'VIVO'] as const).map((m) => (
            <div key={m} className="space-y-1">
              <Label className="text-[11px] font-semibold">
                {m.replace('_', ' ')}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={marketer[m]}
                  onChange={(e) => onMarketerChange({ ...marketer, [m]: e.target.value })}
                  placeholder="0"
                  className="h-8 text-sm font-mono tabular-nums"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-right">
                {formatFr(mk[m], 0)} <span className="text-muted-foreground text-[10px]">kg</span>
              </div>
            </div>
          ))}
        </div>
        {mk.total !== 0 && Math.abs(mk.total - 100) > 0.001 && (
          <div className="px-4 py-2 text-[11px] text-orange-600 bg-orange-50 border-t">
            ⚠ Somme = {formatFr(mk.total, 2)} % (≠ 100 %)
          </div>
        )}
      </div>
    </div>
  );
}
