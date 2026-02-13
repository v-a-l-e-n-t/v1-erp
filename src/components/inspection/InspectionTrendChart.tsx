import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import type { WeeklyTrendPoint } from '@/types/inspection';

interface InspectionTrendChartProps {
  data: WeeklyTrendPoint[];
  height?: number;
}

export default function InspectionTrendChart({ data, height = 300 }: InspectionTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Pas assez de données pour afficher la tendance
      </div>
    );
  }

  // Get all zone names from data
  const allZoneNames = new Set<string>();
  data.forEach(d => Object.keys(d.zones).forEach(z => allZoneNames.add(z)));

  const chartData = data.map(d => ({
    semaine: d.semaine.replace(/^\d{4}-W/, 'S'),
    Global: d.disponibilite_globale,
    ...d.zones,
  }));

  const zoneColors: Record<string, string> = {
    STOCKAGE: '#8B5CF6',
    PONT_BASCULE: '#F59E0B',
    PCC: '#10B981',
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="semaine" fontSize={11} tick={{ fill: '#64748B' }} />
        <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: '#64748B' }} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />

        {/* Threshold lines */}
        <ReferenceLine y={80} stroke="#1E8449" strokeDasharray="5 5" strokeWidth={1} />
        <ReferenceLine y={50} stroke="#E67E22" strokeDasharray="5 5" strokeWidth={1} />

        {/* Global line */}
        <Line
          type="monotone"
          dataKey="Global"
          stroke="#3B82F6"
          strokeWidth={2.5}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />

        {/* Zone lines */}
        {Array.from(allZoneNames).map(zoneName => (
          <Line
            key={zoneName}
            type="monotone"
            dataKey={zoneName}
            stroke={zoneColors[zoneName] || '#94A3B8'}
            strokeWidth={1.5}
            dot={{ r: 3 }}
            strokeDasharray="4 2"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
