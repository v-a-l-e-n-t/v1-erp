import { formatFr, type GlobalSummary } from '@/utils/sphereStockCompute';

interface GlobalSummaryBarProps {
  summary: GlobalSummary;
}

interface KpiProps {
  label: string;
  value: number | null;
  hint?: string;
  tone?: 'default' | 'positive' | 'warning';
}

function Kpi({ label, value, hint, tone = 'default' }: KpiProps) {
  const toneClass =
    tone === 'positive'
      ? 'text-green-600'
      : tone === 'warning'
        ? 'text-orange-500'
        : 'text-foreground';
  return (
    <div className="flex flex-col gap-0.5 px-3 sm:px-6 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r last:border-b-0 sm:last:border-r-0 border-border/60 flex-1 min-w-0">
      <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </span>
      <span
        className={`font-mono tabular-nums text-lg sm:text-2xl font-bold ${toneClass} truncate`}
      >
        {formatFr(value, 0)}
        <span className="ml-1 text-[10px] sm:text-xs text-muted-foreground font-sans">kg</span>
      </span>
      {hint && (
        <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 truncate">{hint}</span>
      )}
    </div>
  );
}

export function GlobalSummaryBar({ summary }: GlobalSummaryBarProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t-2 border-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch">
        <Kpi label="Stock du jour" value={summary.stockJour} />
        <Kpi
          label="Stock exploitable"
          value={summary.stockExploitable}
          tone="positive"
        />
        <Kpi
          label="Niveau de creux total"
          value={summary.creuxTotal}
          tone="warning"
        />
      </div>
    </div>
  );
}
