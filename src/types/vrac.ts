// Types pour le module VRAC Client

export interface VracClient {
    id: string;
    nom: string;
    nom_affichage: string;
    champ_sortie_vrac: string;
    actif: boolean;
    created_at?: string;
}

export interface VracUser {
    id: string;
    client_id: string;
    nom?: string;
    actif: boolean;
    created_by?: string;
    created_at: string;
    last_login?: string;
    vrac_clients?: VracClient;
}

export type DemandeStatut = 'en_attente' | 'charge' | 'refusee';

export interface VracDemandeChargement {
    id: string;
    client_id: string;
    user_id?: string;
    date_chargement: string;
    immatriculation_tracteur: string;
    immatriculation_citerne: string;
    nom_chauffeur?: string;
    numero_bon?: string;
    statut: DemandeStatut;
    tonnage_charge?: number | null;
    validated_by?: string;
    validated_at?: string;
    notes?: string;
    motif_refus?: string;
    refused_by?: string;
    refused_at?: string;
    created_at: string;
    updated_at: string;
    last_modified_by?: string | null;
    last_modified_at?: string | null;
    vrac_clients?: VracClient;
    vrac_users?: VracUser;
}

export interface VracDemandeFormData {
    immatriculation_tracteur: string;
    immatriculation_citerne: string;
    numero_bon?: string;
    date_chargement?: string;
}

export interface VracBatchFormData {
    trucks: Array<{
        immatriculation_tracteur: string;
        immatriculation_citerne: string;
        nom_chauffeur: string;
    }>;
}

export interface VracChargementValidation {
    demande_id: string;
    tonnage_charge: number;
    notes?: string;
}

export interface VracRefusalData {
    demande_id: string;
    motif_refus: string;
}

export interface VracSession {
    user_id: string;
    client_id: string;
    client_nom: string;
    client_nom_affichage: string;
    user_nom?: string;
    authenticated_at: string;
}

export interface VracStats {
    total_demandes: number;
    demandes_en_attente: number;
    demandes_chargees: number;
    demandes_refusees: number;
    tonnage_total: number;
}

export type DemandeWithClient = VracDemandeChargement & {
    vrac_clients: VracClient;
};
