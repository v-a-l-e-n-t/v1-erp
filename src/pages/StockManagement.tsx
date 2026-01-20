import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { StockStoreView } from '@/components/stock/StockStoreView';
import { SigmaStockConfigModal } from '@/components/stock/SigmaStockConfigModal';
import {
  STOCK_CATEGORY_LABELS,
  StockCategory,
  WAREHOUSE_LIST
} from '@/types/stock';

const StockManagement = () => {
  const [activeCategory, setActiveCategory] = useState<string>('bouteilles_neuves');
  const [sigmaConfigOpen, setSigmaConfigOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Saisie stock</h1>
          {activeCategory === 'sigma' && (
            <Button
              variant="outline"
              onClick={() => setSigmaConfigOpen(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Config. SIGMA
            </Button>
          )}
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
              {WAREHOUSE_LIST.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="px-5 py-2.5 font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  {STOCK_CATEGORY_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {WAREHOUSE_LIST.map((key) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">
                  {STOCK_CATEGORY_LABELS[key]}
                </h2>
              </div>

              <StockStoreView category={key} />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Modal de configuration SIGMA */}
      <SigmaStockConfigModal
        open={sigmaConfigOpen}
        onOpenChange={setSigmaConfigOpen}
      />
    </div>
  );
};

export default StockManagement;

