// Types du module Equipements (cf migration 20260523000004_equipements.sql).

export interface Equipement {
  id: string;
  nom: string;
  code?: string | null;
  actif: boolean;
  created_at?: string;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
}

/**
 * Affectation d'un equipement a une ligne de production.
 * `actif=false` exige un `motif_inactif` (texte libre) cote front.
 */
export interface EquipementLigne {
  id: string;
  equipement_id: string;
  numero_ligne: number; // 1..5
  actif: boolean;
  motif_inactif?: string | null;
  created_at?: string;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
}

/** Composite : un equipement + ses affectations lignes. Utilise par la popup. */
export interface EquipementWithLignes extends Equipement {
  lignes: EquipementLigne[];
}
