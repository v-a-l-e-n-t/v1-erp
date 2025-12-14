import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import MandatairesVentesHistory from "@/components/dashboard/MandatairesVentesHistory";

const MandatairesHistory = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des Ventes Mandataires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MandatairesVentesHistory />
      </CardContent>
    </Card>
  );
};

export default MandatairesHistory;
