import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MandatairesImport from "@/components/mandataires/MandatairesImport";
import { toast } from "sonner";

const ImportData = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Import des Données
            </h1>
            <p className="text-muted-foreground">
              Import des ventes conditionnées par mandataire
            </p>
          </div>
        </div>

        {/* Import Component */}
        <MandatairesImport onImportSuccess={() => {
          toast.success("Import réussi ! Consultez l'historique dans le Dashboard.");
        }} />
      </div>
    </div>
  );
};

export default ImportData;
