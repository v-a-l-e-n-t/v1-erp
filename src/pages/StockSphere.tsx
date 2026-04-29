import { useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { SphereStockBlock } from '@/components/sphere-stock/SphereStockBlock';
import { GlobalSummaryBar } from '@/components/sphere-stock/GlobalSummaryBar';
import { useSphereStock } from '@/hooks/useSphereStock';
import { computeGlobalSummary } from '@/utils/sphereStockCompute';

export default function StockSphere() {
  const s01 = useSphereStock('S01');
  const s02 = useSphereStock('S02');
  const s03 = useSphereStock('S03');

  const summary = useMemo(
    () => computeGlobalSummary([s01.result, s02.result, s03.result]),
    [s01.result, s02.result, s03.result],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Stock sphères butane
              </h1>
              <p className="text-xs text-muted-foreground">
                Calcul temps réel · S01 · S02 · S03
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Calcul actif
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SphereStockBlock sphereId="S01" sphere={s01} />
          <SphereStockBlock sphereId="S02" sphere={s02} />
          <SphereStockBlock sphereId="S03" sphere={s03} />
        </div>
      </main>

      <GlobalSummaryBar summary={summary} />
    </div>
  );
}
