// ============== ENUMS ==============

export type StatutEquipement = 'OPERATIONNEL' | 'DEGRADE' | 'HORS_SERVICE';
export type StatutRonde = 'EN_COURS' | 'EN_ATTENTE_VALIDATION' | 'VALIDEE';

// ============== DB ROW TYPES ==============

export interface InspectionZone {
  id: string;
  nom: string;
  libelle: string;
  ordre: number;
  actif: boolean;
  poids_kpi: number;
  created_at: string;
  updated_at: string;
}

export interface InspectionSousZone {
  id: string;
  zone_id: string;
  nom: string;
  libelle: string;
  ordre: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface InspectionEquipement {
  id: string;
  zone_id: string;
  sous_zone_id: string | null;
  nom: string;
  description: string | null;
  ordre: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface InspectionRonde {
  id: string;
  semaine_iso: string;
  statut: StatutRonde;
  date_debut: string;
  date_soumission: string | null;
  date_validation: string | null;
  soumis_par: string | null;
  valide_par: string | null;
  commentaire_global: string | null;
  nb_points_remplis: number;
  nb_points_total: number;
  disponibilite_globale: number | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionLigneRonde {
  id: string;
  ronde_id: string;
  equipement_id: string;
  statut: StatutEquipement | null;
  commentaire: string | null;
  urgent: boolean;
  rempli_par: string | null;
  rempli_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionDestinataireMail {
  id: string;
  nom: string;
  email: string;
  actif: boolean;
  created_at: string;
}

export type StatutAnomalie = 'OUVERTE' | 'RESOLUE';

export interface InspectionAnomalie {
  id: string;
  equipement_id: string;
  zone_id: string;
  sous_zone_id: string | null;
  ronde_ouverture_id: string;
  semaine_ouverture: string;
  date_ouverture: string;
  statut_equipement_initial: StatutEquipement;
  commentaire_initial: string | null;
  urgent: boolean;
  ronde_cloture_id: string | null;
  semaine_cloture: string | null;
  date_cloture: string | null;
  statut: StatutAnomalie;
  duree_jours: number | null;
  created_at: string;
  updated_at: string;
}

// ============== DERIVED / VIEW TYPES ==============

export interface SousZoneKPI {
  sous_zone_id: string;
  sous_zone_nom: string;
  sous_zone_libelle: string;
  total_points: number;
  points_operationnel: number;
  points_degrade: number;
  points_hors_service: number;
  disponibilite_pct: number;
  couleur: 'green' | 'orange' | 'red';
}

export interface ZoneKPI {
  zone_id: string;
  zone_nom: string;
  zone_libelle: string;
  total_points: number;
  points_remplis: number;
  points_operationnel: number;
  points_degrade: number;
  points_hors_service: number;
  nb_urgences: number;
  disponibilite_pct: number;
  poids_kpi: number;
  couleur: 'green' | 'orange' | 'red';
  sous_zones?: SousZoneKPI[];
}

export interface GlobalKPI {
  disponibilite_globale: number;
  couleur: 'green' | 'orange' | 'red';
  zones: ZoneKPI[];
  nb_anomalies: number;
  nb_urgences: number;
  nb_points_remplis: number;
  nb_points_total: number;
  delta_vs_previous: number | null;
}

export interface WeeklyTrendPoint {
  semaine: string;
  disponibilite_globale: number;
  zones: Record<string, number>;
}

export interface LigneRondeUpdate {
  equipement_id: string;
  statut: StatutEquipement | null;
  commentaire: string | null;
  urgent: boolean;
}
