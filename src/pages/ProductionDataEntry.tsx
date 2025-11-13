import { ProductionShiftForm } from "@/components/ProductionShiftForm";

const ProductionDataEntry = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Saisie des Données de Production</h1>
            <p className="text-sm text-muted-foreground">
              Enregistrement des shifts et arrêts de production
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <ProductionShiftForm />
      </main>
    </div>
  );
};

export default ProductionDataEntry;
