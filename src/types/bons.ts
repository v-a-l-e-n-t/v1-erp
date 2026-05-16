// Types du module /rapport-bl — bons de transfert papier.

export type BonClient = 'SIMAM' | 'PETROIVOIRE' | 'VIVO' | 'TOTAL';
export type BonStatut = 'disponible' | 'utilise' | 'annule';

export const BON_CLIENTS: BonClient[] = ['SIMAM', 'PETROIVOIRE', 'VIVO', 'TOTAL'];

export const BON_CLIENT_LABELS: Record<BonClient, string> = {
  SIMAM: 'SIMAM',
  PETROIVOIRE: 'Petro Ivoire',
  VIVO: 'Vivo Energy',
  TOTAL: 'Total Energies',
};

export interface BonTransfert {
  id: string;
  client: BonClient;
  numero_bon: string;
  statut: BonStatut;
  date_reception: string; // YYYY-MM-DD
  date_edition?: string | null; // YYYY-MM-DD, défaut = date_reception
  quantite_bon?: number | null; // kg prévus sur le bon
  batch_id?: string | null;
  date_sortie?: string | null;
  citerne?: string | null;
  poids_net_kg?: number | null;
  commentaire?: string | null;
  user_id?: string | null;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
  created_at?: string | null;
}

// Ligne brute issue de l'extraction pesée (recap_pic.xlsx)
export interface ExtractionRow {
  date: Date;            // D.SORTIE
  citerne: string;       // CITERNE
  client: BonClient;     // CLIENT normalisé
  numero_bon: string;    // COMMANDE
  poids_kg: number;      // POIDS NET
}

// Statut d'une ligne d'import après comparaison avec la base
export type ImportRowStatus = 'ok' | 'doublon' | 'inconnu';

export interface ImportRow extends ExtractionRow {
  status: ImportRowStatus;
  // si statut ok / doublon : id du bon en base
  bon_id?: string;
  // pour les lignes inconnu : si l'utilisateur souhaite les créer
  create_if_missing?: boolean;
}
