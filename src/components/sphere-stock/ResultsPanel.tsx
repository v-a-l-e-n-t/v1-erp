import { formatFr, RATIO_GAZ_AIR, type SphereResult } from '@/utils/sphereStockCompute';

interface Row {
  label: string;
  value: number | null;
  decimals: number;
  unit: string;
  emphasis?: boolean;
}

interface ResultsPanelProps {
  result: SphereResult;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const rows: Row[] = [
    { label: 'Volume liquide', value: result.volumeLiquide, decimals: 0, unit: 'L' },
    { label: 'Volume gazeux', value: result.volumeGazeux, decimals: 0, unit: 'L' },
    {
      label: 'Densité butane liquide',
      value: result.densiteButaneLiq,
      decimals: 4,
      unit: 'kg/L',
    },
    {
      label: 'Masse vol. air sec',
      value: result.masseVolAirGaz,
      decimals: 7,
      unit: 'kg/L',
    },
    {
      label: 'Constante gaz / air',
      value: RATIO_GAZ_AIR,
      decimals: 3,
      unit: '',
    },
    { label: 'Pression absolue', value: result.pAbs, decimals: 5, unit: 'bar' },
    { label: 'Masse liquide', value: result.masseLiq, decimals: 0, unit: 'kg' },
    { label: 'Masse gazeuse', value: result.masseGaz, decimals: 0, unit: 'kg' },
    {
      label: 'Masse totale sphère',
      value: result.masseTotale,
      decimals: 0,
      unit: 'kg',
      emphasis: true,
    },
    { label: 'Creux sphère', value: result.creux, decimals: 0, unit: 'kg', emphasis: true },
  ];

  return (
    <div className="bg-muted/40 border-l-4 border-primary rounded-sm">
      <div className="px-3 py-2 border-b border-border/60">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Résultats
        </span>
      </div>
      <dl className="divide-y divide-border/40">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`grid grid-cols-[1fr_auto] items-baseline gap-3 px-3 py-1.5 ${
              r.emphasis ? 'bg-background/60' : ''
            }`}
          >
            <dt
              className={`text-xs ${
                r.emphasis
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {r.label}
            </dt>
            <dd
              className={`font-mono tabular-nums text-right ${
                r.emphasis ? 'text-base font-bold text-primary' : 'text-sm'
              }`}
            >
              {formatFr(r.value, r.decimals)}
              <span className="ml-1 text-[10px] text-muted-foreground font-sans">
                {r.unit}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
