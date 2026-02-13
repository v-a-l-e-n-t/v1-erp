import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  StatutEquipement,
  InspectionZone,
  InspectionSousZone,
  InspectionEquipement,
  InspectionLigneRonde,
  ZoneKPI,
  SousZoneKPI,
  GlobalKPI,
} from '@/types/inspection';

// ============== ISO WEEK UTILITIES ==============

export function getCurrentISOWeek(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function parseISOWeekToDate(semaineIso: string): { start: Date; end: Date } {
  const match = semaineIso.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const now = new Date();
    return { start: startOfISOWeek(now), end: endOfISOWeek(now) };
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // January 4th is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  const start = addDays(startOfWeek1, (week - 1) * 7);
  const end = addDays(start, 6);
  return { start, end };
}

export function formatSemaineISO(semaineIso: string): string {
  const match = semaineIso.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return semaineIso;
  const weekNum = parseInt(match[2], 10);
  const { start, end } = parseISOWeekToDate(semaineIso);
  const startStr = format(start, 'd MMM', { locale: fr });
  const endStr = format(end, 'd MMM yyyy', { locale: fr });
  return `Semaine ${weekNum} — ${startStr} au ${endStr}`;
}

export function getWeekNumber(semaineIso: string): number {
  const match = semaineIso.match(/^(\d{4})-W(\d{2})$/);
  return match ? parseInt(match[2], 10) : 0;
}

// ============== KPI CALCULATION ==============

const STATUT_SCORES: Record<StatutEquipement, number> = {
  OPERATIONNEL: 100,
  DEGRADE: 50,
  HORS_SERVICE: 0,
};

export function getKPIColor(pct: number): 'green' | 'orange' | 'red' {
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'orange';
  return 'red';
}

export function getKPIColorHex(couleur: 'green' | 'orange' | 'red'): string {
  switch (couleur) {
    case 'green': return '#1E8449';
    case 'orange': return '#E67E22';
    case 'red': return '#C0392B';
  }
}

export function calculateDisponibilite(statuts: (StatutEquipement | null)[]): number {
  const filled = statuts.filter((s): s is StatutEquipement => s !== null);
  if (filled.length === 0) return 0;
  const totalScore = filled.reduce((sum, s) => sum + STATUT_SCORES[s], 0);
  return Math.round((totalScore / (filled.length * 100)) * 100 * 10) / 10;
}

export function calculateGlobalKPI(
  lignes: InspectionLigneRonde[],
  equipements: InspectionEquipement[],
  zones: InspectionZone[],
  sousZones: InspectionSousZone[],
  previousDisponibilite?: number | null
): GlobalKPI {
  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);
  const activeEquipements = equipements.filter(e => e.actif);

  const lignesByEquipement = new Map<string, InspectionLigneRonde>();
  for (const l of lignes) {
    lignesByEquipement.set(l.equipement_id, l);
  }

  let totalAnomalies = 0;
  let totalUrgences = 0;
  let totalPointsRemplis = 0;
  const totalPointsTotal = activeEquipements.length;

  const zoneKPIs: ZoneKPI[] = activeZones.map(zone => {
    const zoneEquipements = activeEquipements.filter(e => e.zone_id === zone.id);
    const zoneSousZones = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);

    let zonePointsOper = 0;
    let zonePointsDegrade = 0;
    let zonePointsHS = 0;
    let zonePointsRemplis = 0;
    let zoneUrgences = 0;

    const sousZoneKPIs: SousZoneKPI[] = zoneSousZones.map(sz => {
      const szEquipements = zoneEquipements.filter(e => e.sous_zone_id === sz.id);
      const szStatuts = szEquipements.map(e => lignesByEquipement.get(e.id)?.statut ?? null);
      const szFilled = szStatuts.filter(s => s !== null) as StatutEquipement[];

      const oper = szFilled.filter(s => s === 'OPERATIONNEL').length;
      const deg = szFilled.filter(s => s === 'DEGRADE').length;
      const hs = szFilled.filter(s => s === 'HORS_SERVICE').length;

      zonePointsOper += oper;
      zonePointsDegrade += deg;
      zonePointsHS += hs;
      zonePointsRemplis += szFilled.length;

      const szUrgences = szEquipements.filter(e => lignesByEquipement.get(e.id)?.urgent).length;
      zoneUrgences += szUrgences;

      const disp = calculateDisponibilite(szStatuts);
      return {
        sous_zone_id: sz.id,
        sous_zone_nom: sz.nom,
        sous_zone_libelle: sz.libelle,
        total_points: szEquipements.length,
        points_operationnel: oper,
        points_degrade: deg,
        points_hors_service: hs,
        disponibilite_pct: disp,
        couleur: getKPIColor(disp),
      };
    });

    // Equipements sans sous-zone (PONT_BASCULE, PCC)
    const directEquipements = zoneEquipements.filter(e => !e.sous_zone_id);
    if (directEquipements.length > 0) {
      const directStatuts = directEquipements.map(e => lignesByEquipement.get(e.id)?.statut ?? null);
      const directFilled = directStatuts.filter(s => s !== null) as StatutEquipement[];

      zonePointsOper += directFilled.filter(s => s === 'OPERATIONNEL').length;
      zonePointsDegrade += directFilled.filter(s => s === 'DEGRADE').length;
      zonePointsHS += directFilled.filter(s => s === 'HORS_SERVICE').length;
      zonePointsRemplis += directFilled.length;
      zoneUrgences += directEquipements.filter(e => lignesByEquipement.get(e.id)?.urgent).length;
    }

    totalPointsRemplis += zonePointsRemplis;
    totalAnomalies += zonePointsDegrade + zonePointsHS;
    totalUrgences += zoneUrgences;

    const allZoneStatuts = zoneEquipements.map(e => lignesByEquipement.get(e.id)?.statut ?? null);
    const zoneDisp = calculateDisponibilite(allZoneStatuts);

    return {
      zone_id: zone.id,
      zone_nom: zone.nom,
      zone_libelle: zone.libelle,
      total_points: zoneEquipements.length,
      points_remplis: zonePointsRemplis,
      points_operationnel: zonePointsOper,
      points_degrade: zonePointsDegrade,
      points_hors_service: zonePointsHS,
      nb_urgences: zoneUrgences,
      disponibilite_pct: zoneDisp,
      poids_kpi: zone.poids_kpi,
      couleur: getKPIColor(zoneDisp),
      sous_zones: sousZoneKPIs.length > 0 ? sousZoneKPIs : undefined,
    };
  });

  // Global availability = weighted average
  const totalWeight = zoneKPIs.reduce((sum, z) => sum + z.poids_kpi, 0);
  const weightedSum = zoneKPIs.reduce((sum, z) => sum + z.disponibilite_pct * z.poids_kpi, 0);
  const globalDisp = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  const delta = previousDisponibilite != null
    ? Math.round((globalDisp - previousDisponibilite) * 10) / 10
    : null;

  return {
    disponibilite_globale: globalDisp,
    couleur: getKPIColor(globalDisp),
    zones: zoneKPIs,
    nb_anomalies: totalAnomalies,
    nb_urgences: totalUrgences,
    nb_points_remplis: totalPointsRemplis,
    nb_points_total: totalPointsTotal,
    delta_vs_previous: delta,
  };
}

// ============== DEBOUNCE ==============

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
