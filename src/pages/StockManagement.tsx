import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockStoreView } from '@/components/stock/StockStoreView';
import {
  STOCK_CATEGORY_LABELS,
  StockCategory
} from '@/types/stock';

const StockManagement = () => {
  const [activeCategory, setActiveCategory] = useState<string>('bouteilles_neuves');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Saisie stock</h1>
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
            <TabsList className="w-full justify-start h-12 p-1 bg-muted gap-1">
              {Object.entries(STOCK_CATEGORY_LABELS)
                .filter(([key]) => key !== 'parc_ce')
                .map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="px-5 py-2.5 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
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

