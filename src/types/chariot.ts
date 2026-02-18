export interface Chariot {
  id: string;
  nom: string;
  actif: boolean;
  created_at: string;
}

export interface RapportChariot {
  id: string;
  date_rapport: string;
  created_at: string;
  updated_at: string;
}

export interface AnomalieChariot {
  id?: string;
  description: string;
}

export interface RapportChariotLigne {
  id?: string;
  rapport_id?: string;
  chariot_id: string;
  chariot_nom: string;
  etat: 'marche' | 'arret' | null;
  compteur_horaire: number | null;
  horaire_prochaine_vidange: number | null;
  ecart: number | null;
  anomalies: AnomalieChariot[];
  numero_di: string;
  gasoil: number | null;
  temps_arret: number | null;
  numero_permis: string;
}
