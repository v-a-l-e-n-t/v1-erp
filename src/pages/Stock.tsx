import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Warehouse } from 'lucide-react';
import {
  WarehouseType,
  StockClientType,
  WAREHOUSE_LABELS,
  CLIENT_LABELS,
  CLIENT_SHORT_LABELS,
  CLIENT_COLORS,
  INTER_WAREHOUSE_LIST,
} from '@/types/stock';
import { SigmaDashboard, StockEntryTable } from '@/components/stock';

const Stock: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType>('sigma');
  const [selectedClient, setSelectedClient] = useState<StockClientType>('petro_ivoire');

  const allWarehouses: WarehouseType[] = ['sigma', ...INTER_WAREHOUSE_LIST];
  const allClients: StockClientType[] = ['petro_ivoire', 'total_energies', 'vivo_energy'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestion des Stocks
                  </h1>
                  <p className="text-sm text-gray-500">
                    Mouvements de bouteilles entre magasins
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Warehouse Tabs */}
        <Tabs
          value={selectedWarehouse}
          onValueChange={(value) => setSelectedWarehouse(value as WarehouseType)}
          className="space-y-6"
        >
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-white p-1 border">
            {allWarehouses.map((warehouse) => (
              <TabsTrigger
                key={warehouse}
                value={warehouse}
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
              >
                <Warehouse className="w-4 h-4 mr-2" />
                {WAREHOUSE_LABELS[warehouse]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* SIGMA Tab Content */}
          <TabsContent value="sigma" className="mt-6">
            <SigmaDashboard />
          </TabsContent>

          {/* Other Warehouse Tabs */}
          {INTER_WAREHOUSE_LIST.map((warehouse) => (
            <TabsContent key={warehouse} value={warehouse} className="mt-6">
              {/* Client Sub-tabs */}
              <Tabs
                value={selectedClient}
                onValueChange={(value) => setSelectedClient(value as StockClientType)}
                className="space-y-4"
              >
                <TabsList className="bg-white border">
                  {allClients.map((client) => {
                    const colors = CLIENT_COLORS[client];
                    const activeClass = client === 'petro_ivoire' 
                      ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white'
                      : client === 'total_energies'
                      ? 'data-[state=active]:bg-red-600 data-[state=active]:text-white'
                      : 'data-[state=active]:bg-emerald-600 data-[state=active]:text-white';
                    return (
                      <TabsTrigger
                        key={client}
                        value={client}
                        className={`px-6 ${activeClass}`}
                      >
                        {CLIENT_SHORT_LABELS[client]}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {allClients.map((client) => (
                  <TabsContent key={client} value={client}>
                    <div className="mb-4">
                      <h2 className={`text-lg font-semibold ${CLIENT_COLORS[client].text}`}>
                        {WAREHOUSE_LABELS[warehouse]} - {CLIENT_LABELS[client]}
                      </h2>
                    </div>
                    <StockEntryTable warehouse={warehouse} client={client} />
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Stock;
