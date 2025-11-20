import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Dashboard from '@/components/Dashboard';
import HistoryTable from '@/components/HistoryTable';
import BilanForm from '@/components/BilanForm';
import { BilanEntriesImport } from '@/components/BilanEntriesImport';
import { BilanEntry } from '@/types/balance';
import { loadEntries, deleteEntry, updateEntry, exportToExcel, exportToPDF, exportIndividualToPDF } from '@/utils/storage';
import { calculateBilan } from '@/utils/calculations';
import { toast } from 'sonner';
import { BarChart3, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CentreEmplisseurView from '@/components/dashboard/CentreEmplisseurView';

const DashboardHistorique = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<BilanEntry[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'vrac' | 'emplisseur'>('overview');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<BilanEntry | null>(null);
  const [productionAnnuelle, setProductionAnnuelle] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadData();
    loadProductionAnnuelle();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        setShowImport(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadEntries();
    setEntries(loaded);
    setLoading(false);
  };

  const loadProductionAnnuelle = async () => {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('production_shifts')
      .select('tonnage_total')
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`);

    if (error) {
      console.error('Erreur chargement production annuelle:', error);
      return;
    }

    const total = data?.reduce((sum, shift) => sum + (shift.tonnage_total || 0), 0) || 0;
    setProductionAnnuelle(total);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteEntry(id);

    if (success) {
      await loadData();
      toast.success('Bilan supprimé');
    } else {
      toast.error('Erreur lors de la suppression du bilan');
    }
  };

  const handleEdit = (entry: BilanEntry) => {
    setEditingEntry(entry);
  };

  const handleUpdate = async (calculatedData: ReturnType<typeof calculateBilan>, entryId?: string) => {
    if (!entryId) return;

    const updatedEntry: BilanEntry = {
      ...calculatedData,
      id: entryId,
      user_id: editingEntry?.user_id || null,
      created_at: editingEntry?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const success = await updateEntry(updatedEntry);

    if (success) {
      toast.success('Bilan mis à jour avec succès');
      setEditingEntry(null);
      await loadData();
    } else {
      toast.error('Erreur lors de la mise à jour du bilan');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (entries.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    if (format === 'pdf') {
      exportToPDF(entries);
      toast.success('Export PDF réussi');
    } else {
      exportToExcel(entries);
      toast.success('Export Excel réussi');
    }
  };

  const handlePrint = (entry: BilanEntry) => {
    exportIndividualToPDF(entry);
    toast.success('Impression réussie');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Bilan Matière GPL</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Dashboard & Historique
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg px-6 py-4 shadow-sm">
                <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                  PRODUCTION ANNUELLE CE : <span className="text-foreground font-bold">{new Date().getFullYear()}</span>
                </p>
                <p className="text-4xl font-extrabold text-primary tracking-tight">
                  {productionAnnuelle.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  <span className="text-lg font-semibold text-primary/60 ml-2">Kg</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'overview' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5'}`}
            onClick={() => setActiveView('overview')}
          >
            <BarChart3 className="mr-3 h-6 w-6" />
            Vue d'ensemble
          </Button>

          <Button
            variant={activeView === 'vrac' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'vrac' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5'}`}
            onClick={() => setActiveView('vrac')}
          >
            <FileText className="mr-3 h-6 w-6" />
            Dépôt Vrac
          </Button>

          <Button
            variant={activeView === 'emplisseur' ? 'default' : 'outline'}
            size="lg"
            className={`h-16 text-lg font-bold uppercase tracking-wide ${activeView === 'emplisseur' ? 'shadow-md scale-[1.02]' : 'hover:bg-primary/5'}`}
            onClick={() => setActiveView('emplisseur')}
          >
            <Calculator className="mr-3 h-6 w-6" />
            Centre Emplisseur
          </Button>
        </div>

        {/* Content Views */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeView === 'overview' && (
            <Dashboard entries={entries} />
          )}

          {activeView === 'vrac' && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg p-6 border shadow-sm">
                <h2 className="text-2xl font-bold mb-4">Gestion Dépôt Vrac</h2>
                <p className="text-muted-foreground mb-6">Historique des mouvements de stock et bilans matière.</p>
                <HistoryTable
                  entries={entries}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onExport={handleExport}
                  onPrint={handlePrint}
                />
              </div>
            </div>
          )}

          {activeView === 'emplisseur' && (
            <CentreEmplisseurView />
          )}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bilan Matière GPL</p>
        </div>
      </footer>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le bilan</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <BilanForm
              onSave={handleUpdate}
              editEntry={editingEntry}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardHistorique;
