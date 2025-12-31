import MandatairesImport from "@/components/mandataires/MandatairesImport";
import { ReceptionsClientsImport } from "@/components/receptions/ReceptionsClientsImport";
import { toast } from "sonner";

const ImportData = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Import des Données
          </h1>
        </div>

        {/* Import Component */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Importation Mandataire
          </h2>
          <MandatairesImport onImportSuccess={() => {
            toast.success("Import réussi ! Consultez l'historique dans le Dashboard.");
          }} />
        </div>

        {/* Import Réceptions par Client */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Importation Répartition Réceptions par Client
          </h2>
          <ReceptionsClientsImport onImportComplete={() => {
            toast.success("Import des réceptions réussi ! Consultez l'historique dans le Dashboard.");
          }} />
        </div>
      </div>
    </div>
  );
};

export default ImportData;
