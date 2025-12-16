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
    // Relation
    vrac_clients?: VracClient;
}

export interface VracDemandeChargement {
    id: string;
    client_id: string;
    user_id?: string;
    date_chargement: string;
    immatriculation_tracteur: string;
    immatriculation_citerne: string;
    numero_bon?: string;
    statut: 'en_attente' | 'charge';
    tonnage_charge?: number;
    validated_by?: string;
    validated_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Relations
    vrac_clients?: VracClient;
    vrac_users?: VracUser;
}

export interface VracDemandeFormData {
    immatriculation_tracteur: string;
    immatriculation_citerne: string;
    numero_bon?: string;
    date_chargement?: string;
}

export interface VracChargementValidation {
    demande_id: string;
    tonnage_charge: number;
    notes?: string;
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
    total_demandes_jour: number;
    demandes_en_attente: number;
    demandes_chargees: number;
    tonnage_total_jour: number;
}
