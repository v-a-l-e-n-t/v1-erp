import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { useAppAuth } from '@/hooks/useAppAuth';
import PasswordGate from '@/components/PasswordGate';
import { PlageSaisieCard } from '@/components/rapport-bl/PlageSaisieCard';
import { ImportRecapExcel } from '@/components/rapport-bl/ImportRecapExcel';
import { RapportJournalierCard } from '@/components/rapport-bl/RapportJournalierCard';
import { StockDisponibleCard } from '@/components/rapport-bl/StockDisponibleCard';

export default function RapportBL() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppAuth();
  const [, setAuthTick] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setAuthTick((t) => t + 1)} />;
  }

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Retour
          </Button>
          <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Rapport BL</h1>
            <p className="text-xs text-muted-foreground">
              Bons de transfert : saisie, import pesée, rapports journaliers
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PlageSaisieCard onSaved={bumpRefresh} />
          <ImportRecapExcel onImported={bumpRefresh} />
        </div>
        <RapportJournalierCard refreshKey={refreshKey} />
        <StockDisponibleCard refreshKey={refreshKey} />
      </main>
    </div>
  );
}
