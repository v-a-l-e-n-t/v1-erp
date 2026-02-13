import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { getKPIColorHex } from '@/utils/inspection';
import type { GlobalKPI } from '@/types/inspection';

interface InspectionKPICardsProps {
  kpi: GlobalKPI;
}

const COLOR_TEXT: Record<string, string> = {
  green: 'text-green-700',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

const COLOR_BG: Record<string, string> = {
  green: 'bg-green-50 border-green-200',
  orange: 'bg-orange-50 border-orange-200',
  red: 'bg-red-50 border-red-200',
};

export default function InspectionKPICards({ kpi }: InspectionKPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Global availability */}
      <Card className={`${COLOR_BG[kpi.couleur]} border`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className={`h-4 w-4 ${COLOR_TEXT[kpi.couleur]}`} />
            <span className="text-xs font-medium text-muted-foreground">Disponibilité globale</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${COLOR_TEXT[kpi.couleur]}`}>
            {kpi.disponibilite_globale.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      {/* Points filled */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Points renseignés</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800">
            {kpi.nb_points_remplis}<span className="text-base font-normal text-muted-foreground">/{kpi.nb_points_total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Urgencies */}
      <Card className={kpi.nb_urgences > 0 ? 'bg-red-50 border-red-200' : ''}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`h-4 w-4 ${kpi.nb_urgences > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            <span className="text-xs font-medium text-muted-foreground">Urgences</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${kpi.nb_urgences > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {kpi.nb_urgences}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {kpi.nb_anomalies} anomalie{kpi.nb_anomalies > 1 ? 's' : ''} totale{kpi.nb_anomalies > 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Delta vs previous */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            {kpi.delta_vs_previous !== null && kpi.delta_vs_previous >= 0
              ? <TrendingUp className="h-4 w-4 text-green-600" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
            }
            <span className="text-xs font-medium text-muted-foreground">vs semaine précédente</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${
            kpi.delta_vs_previous === null ? 'text-slate-400' :
            kpi.delta_vs_previous >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {kpi.delta_vs_previous !== null
              ? `${kpi.delta_vs_previous > 0 ? '+' : ''}${kpi.delta_vs_previous.toFixed(1)} pts`
              : '—'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
