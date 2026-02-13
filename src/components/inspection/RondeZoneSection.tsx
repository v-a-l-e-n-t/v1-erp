import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getKPIColor, getKPIColorHex, calculateDisponibilite } from '@/utils/inspection';
import RondeEquipementRow from './RondeEquipementRow';
import type {
  InspectionZone,
  InspectionSousZone,
  InspectionEquipement,
  InspectionLigneRonde,
  LigneRondeUpdate,
} from '@/types/inspection';

interface RondeZoneSectionProps {
  zone: InspectionZone;
  sousZones: InspectionSousZone[];
  equipements: InspectionEquipement[];
  lignes: InspectionLigneRonde[];
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (update: LigneRondeUpdate) => void;
}

const COLOR_MAP = {
  green: 'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
};

export default function RondeZoneSection({
  zone, sousZones, equipements, lignes, disabled, isOpen, onToggle, onChange,
}: RondeZoneSectionProps) {
  const zoneEquipements = equipements.filter(e => e.zone_id === zone.id && e.actif);
  const zoneStatuts = zoneEquipements.map(e => lignes.find(l => l.equipement_id === e.id)?.statut ?? null);
  const filled = zoneStatuts.filter(s => s !== null).length;
  const disp = calculateDisponibilite(zoneStatuts);
  const color = getKPIColor(disp);

  const activeSousZones = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);
  const directEquipements = zoneEquipements.filter(e => !e.sous_zone_id).sort((a, b) => a.ordre - b.ordre);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 sm:p-4 bg-slate-100 hover:bg-slate-200 transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-semibold text-sm sm:text-base">{zone.libelle}</span>
            <span className="text-xs text-muted-foreground">({zoneEquipements.length} pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{filled}/{zoneEquipements.length}</span>
            {filled > 0 && (
              <Badge variant="secondary" className={COLOR_MAP[color]}>
                {disp.toFixed(0)}%
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-2 sm:p-3 space-y-3">
            {/* Sous-zones (ex: Spheres for STOCKAGE) */}
            {activeSousZones.map(sz => {
              const szEquipements = zoneEquipements.filter(e => e.sous_zone_id === sz.id).sort((a, b) => a.ordre - b.ordre);
              const szStatuts = szEquipements.map(e => lignes.find(l => l.equipement_id === e.id)?.statut ?? null);
              const szDisp = calculateDisponibilite(szStatuts);
              const szColor = getKPIColor(szDisp);
              const szFilled = szStatuts.filter(s => s !== null).length;

              return (
                <div key={sz.id} className="border rounded-md">
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50/60">
                    <span className="font-medium text-sm text-blue-900">{sz.libelle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{szFilled}/{szEquipements.length}</span>
                      {szFilled > 0 && (
                        <Badge variant="secondary" className={COLOR_MAP[szColor]}>
                          {szDisp.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {szEquipements.map(eq => {
                      const ligne = lignes.find(l => l.equipement_id === eq.id);
                      if (!ligne) return null;
                      return (
                        <RondeEquipementRow
                          key={eq.id}
                          equipement={eq}
                          ligne={ligne}
                          disabled={disabled}
                          onChange={onChange}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Direct equipements (no sous-zone) */}
            {directEquipements.length > 0 && (
              <div className="space-y-2">
                {directEquipements.map(eq => {
                  const ligne = lignes.find(l => l.equipement_id === eq.id);
                  if (!ligne) return null;
                  return (
                    <RondeEquipementRow
                      key={eq.id}
                      equipement={eq}
                      ligne={ligne}
                      disabled={disabled}
                      onChange={onChange}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
