import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Wrench, Mail } from 'lucide-react';
import { useInspectionReferentiel } from '@/hooks/useInspection';
import { ZoneEditor, EquipementEditor, DestinatairesEditor } from '@/components/inspection';

export default function InspectionConfiguration() {
  const { zones, sousZones, equipements, loading, refresh } = useInspectionReferentiel();

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <Tabs defaultValue="zones" className="space-y-4">
            <TabsList>
              <TabsTrigger value="zones" className="gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Zones & Sous-zones
              </TabsTrigger>
              <TabsTrigger value="equipements" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Équipements
              </TabsTrigger>
              <TabsTrigger value="destinataires" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Destinataires
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zones">
              <ZoneEditor zones={zones} sousZones={sousZones} onRefresh={refresh} />
            </TabsContent>

            <TabsContent value="equipements">
              <EquipementEditor zones={zones} sousZones={sousZones} equipements={equipements} onRefresh={refresh} />
            </TabsContent>

            <TabsContent value="destinataires">
              <DestinatairesEditor />
            </TabsContent>
          </Tabs>
        )}
    </div>
  );
}
