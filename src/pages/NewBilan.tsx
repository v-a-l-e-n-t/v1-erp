import { useState, useEffect } from 'react';
import BilanForm from '@/components/BilanForm';
import { BilanEntry } from '@/types/balance';
import { loadEntries, saveEntry } from '@/utils/storage';
import { calculateBilan, formatNumberValue } from '@/utils/calculations';
import { toast } from 'sonner';
import logoSaepp from '@/assets/logo-saepp.jpg';

const NewBilan = () => {
  const [entries, setEntries] = useState<BilanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const loaded = await loadEntries();
    setEntries(loaded);
    setLoading(false);
  };

  const handleSave = async (calculatedData: ReturnType<typeof calculateBilan>) => {
    const newEntry: Omit<BilanEntry, 'user_id'> = {
      id: crypto.randomUUID(),
      ...calculatedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const success = await saveEntry(newEntry);
    
    if (success) {
      toast.success('Bilan enregistré avec succès', {
        description: `Bilan ${calculatedData.nature} de ${formatNumberValue(calculatedData.bilan)} Kg`,
      });
      await loadData();
    } else {
      toast.error('Erreur lors de l\'enregistrement du bilan');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <img src={logoSaepp} alt="SAEPP Logo" className="h-14 w-14 object-contain" />
            <h1 className="text-3xl font-bold text-primary">Bilan Matière GPL</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Saisie du bilan journalier</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BilanForm 
          onSave={handleSave} 
          previousEntry={entries[0]}
        />
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bilan Matière GPL</p>
        </div>
      </footer>
    </div>
  );
};

export default NewBilan;
