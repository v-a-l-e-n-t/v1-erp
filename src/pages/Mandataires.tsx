import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, History, BarChart3 } from "lucide-react";
import MandatairesImport from "@/components/mandataires/MandatairesImport";
import MandatairesHistory from "@/components/mandataires/MandatairesHistory";
import MandatairesStats from "@/components/mandataires/MandatairesStats";

const Mandataires = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("import");

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
              Ventes Conditionnées par Mandataire
            </h1>
            <p className="text-muted-foreground">
              Import, historique et statistiques des ventes
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <MandatairesImport onImportSuccess={() => setActiveTab("historique")} />
          </TabsContent>

          <TabsContent value="historique">
            <MandatairesHistory />
          </TabsContent>

          <TabsContent value="stats">
            <MandatairesStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Mandataires;
