import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockStoreView } from '@/components/stock/StockStoreView';
import {
  STOCK_CATEGORY_LABELS,
  StockCategory
} from '@/types/stock';

const StockManagement = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('bouteilles_neuves');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Gestion de Stock 2.0</h1>
              <p className="text-sm text-muted-foreground">Saisie et suivi par magasin et client</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Retour Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs
          defaultValue="bouteilles_neuves"
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="space-y-6"
        >
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
              {Object.entries(STOCK_CATEGORY_LABELS)
                .filter(([key]) => key !== 'parc_ce')
                .map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {Object.keys(STOCK_CATEGORY_LABELS)
            .filter((key) => key !== 'parc_ce')
            .map((key) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">
                  {STOCK_CATEGORY_LABELS[key as StockCategory]}
                </h2>
              </div>

              <StockStoreView category={key as StockCategory} />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default StockManagement;

