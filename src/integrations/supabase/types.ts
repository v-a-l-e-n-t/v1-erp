export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      arrets_production: {
        Row: {
          action_corrective: string | null
          created_at: string
          description: string | null
          etape_ligne: Database["public"]["Enums"]["etape_ligne"] | null
          heure_debut: string
          heure_fin: string
          id: string
          lignes_concernees: number[] | null
          ordre_intervention: string | null
          shift_id: string
          type_arret: Database["public"]["Enums"]["arret_type"]
          updated_at: string
        }
        Insert: {
          action_corrective?: string | null
          created_at?: string
          description?: string | null
          etape_ligne?: Database["public"]["Enums"]["etape_ligne"] | null
          heure_debut: string
          heure_fin: string
          id?: string
          lignes_concernees?: number[] | null
          ordre_intervention?: string | null
          shift_id: string
          type_arret: Database["public"]["Enums"]["arret_type"]
          updated_at?: string
        }
        Update: {
          action_corrective?: string | null
          created_at?: string
          description?: string | null
          etape_ligne?: Database["public"]["Enums"]["etape_ligne"] | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          lignes_concernees?: number[] | null
          ordre_intervention?: string | null
          shift_id?: string
          type_arret?: Database["public"]["Enums"]["arret_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrets_production_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "production_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      bilan_entries: {
        Row: {
          bilan: number
          bouteilles_final: number
          bouteilles_initial: number
          created_at: string
          cumul_sorties: number
          date: string
          fuyardes: number
          fuyardes_petro_ivoire: number | null
          fuyardes_total_energies: number | null
          fuyardes_vivo_energies: number | null
          id: string
          nature: string
          notes: string | null
          reception_gpl: number
          receptions: Json
          reservoirs_final: number
          reservoirs_initial: number
          sorties_conditionnees: number
          sorties_conditionnees_petro_ivoire: number | null
          sorties_conditionnees_total_energies: number | null
          sorties_conditionnees_vivo_energies: number | null
          sorties_vrac: number
          sorties_vrac_petro_ivoire: number | null
          sorties_vrac_simam: number | null
          sorties_vrac_total_energies: number | null
          sorties_vrac_vivo_energies: number | null
          spheres_final: number
          spheres_initial: number
          stock_final: number
          stock_initial: number
          stock_theorique: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bilan?: number
          bouteilles_final?: number
          bouteilles_initial?: number
          created_at?: string
          cumul_sorties?: number
          date: string
          fuyardes?: number
          fuyardes_petro_ivoire?: number | null
          fuyardes_total_energies?: number | null
          fuyardes_vivo_energies?: number | null
          id?: string
          nature: string
          notes?: string | null
          reception_gpl?: number
          receptions?: Json
          reservoirs_final?: number
          reservoirs_initial?: number
          sorties_conditionnees?: number
          sorties_conditionnees_petro_ivoire?: number | null
          sorties_conditionnees_total_energies?: number | null
          sorties_conditionnees_vivo_energies?: number | null
          sorties_vrac?: number
          sorties_vrac_petro_ivoire?: number | null
          sorties_vrac_simam?: number | null
          sorties_vrac_total_energies?: number | null
          sorties_vrac_vivo_energies?: number | null
          spheres_final?: number
          spheres_initial?: number
          stock_final?: number
          stock_initial?: number
          stock_theorique?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bilan?: number
          bouteilles_final?: number
          bouteilles_initial?: number
          created_at?: string
          cumul_sorties?: number
          date?: string
          fuyardes?: number
          fuyardes_petro_ivoire?: number | null
          fuyardes_total_energies?: number | null
          fuyardes_vivo_energies?: number | null
          id?: string
          nature?: string
          notes?: string | null
          reception_gpl?: number
          receptions?: Json
          reservoirs_final?: number
          reservoirs_initial?: number
          sorties_conditionnees?: number
          sorties_conditionnees_petro_ivoire?: number | null
          sorties_conditionnees_total_energies?: number | null
          sorties_conditionnees_vivo_energies?: number | null
          sorties_vrac?: number
          sorties_vrac_petro_ivoire?: number | null
          sorties_vrac_simam?: number | null
          sorties_vrac_total_energies?: number | null
          sorties_vrac_vivo_energies?: number | null
          spheres_final?: number
          spheres_initial?: number
          stock_final?: number
          stock_initial?: number
          stock_theorique?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chefs_ligne: {
        Row: {
          created_at: string
          id: string
          nom: string
          prenom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          prenom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          updated_at?: string
        }
        Relationships: []
      }
      chefs_quart: {
        Row: {
          created_at: string
          id: string
          nom: string
          prenom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          prenom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          updated_at?: string
        }
        Relationships: []
      }
      lignes_production: {
        Row: {
          chef_ligne_id: string | null
          consignes_petro_b12: number | null
          consignes_petro_b28: number | null
          consignes_petro_b38: number | null
          consignes_petro_b6: number | null
          consignes_total_b12: number | null
          consignes_total_b28: number | null
          consignes_total_b38: number | null
          consignes_total_b6: number | null
          consignes_vivo_b12: number | null
          consignes_vivo_b28: number | null
          consignes_vivo_b38: number | null
          consignes_vivo_b6: number | null
          created_at: string | null
          cumul_consignes_b12: number | null
          cumul_consignes_b28: number | null
          cumul_consignes_b38: number | null
          cumul_consignes_b6: number | null
          cumul_recharges_b12: number | null
          cumul_recharges_b28: number | null
          cumul_recharges_b38: number | null
          cumul_recharges_b6: number | null
          id: string
          nombre_agents: number | null
          numero_ligne: number
          recharges_petro_b12: number | null
          recharges_petro_b28: number | null
          recharges_petro_b38: number | null
          recharges_petro_b6: number | null
          recharges_total_b12: number | null
          recharges_total_b28: number | null
          recharges_total_b38: number | null
          recharges_total_b6: number | null
          recharges_vivo_b12: number | null
          recharges_vivo_b28: number | null
          recharges_vivo_b38: number | null
          recharges_vivo_b6: number | null
          shift_id: string
          tonnage_ligne: number | null
          updated_at: string | null
        }
        Insert: {
          chef_ligne_id?: string | null
          consignes_petro_b12?: number | null
          consignes_petro_b28?: number | null
          consignes_petro_b38?: number | null
          consignes_petro_b6?: number | null
          consignes_total_b12?: number | null
          consignes_total_b28?: number | null
          consignes_total_b38?: number | null
          consignes_total_b6?: number | null
          consignes_vivo_b12?: number | null
          consignes_vivo_b28?: number | null
          consignes_vivo_b38?: number | null
          consignes_vivo_b6?: number | null
          created_at?: string | null
          cumul_consignes_b12?: number | null
          cumul_consignes_b28?: number | null
          cumul_consignes_b38?: number | null
          cumul_consignes_b6?: number | null
          cumul_recharges_b12?: number | null
          cumul_recharges_b28?: number | null
          cumul_recharges_b38?: number | null
          cumul_recharges_b6?: number | null
          id?: string
          nombre_agents?: number | null
          numero_ligne: number
          recharges_petro_b12?: number | null
          recharges_petro_b28?: number | null
          recharges_petro_b38?: number | null
          recharges_petro_b6?: number | null
          recharges_total_b12?: number | null
          recharges_total_b28?: number | null
          recharges_total_b38?: number | null
          recharges_total_b6?: number | null
          recharges_vivo_b12?: number | null
          recharges_vivo_b28?: number | null
          recharges_vivo_b38?: number | null
          recharges_vivo_b6?: number | null
          shift_id: string
          tonnage_ligne?: number | null
          updated_at?: string | null
        }
        Update: {
          chef_ligne_id?: string | null
          consignes_petro_b12?: number | null
          consignes_petro_b28?: number | null
          consignes_petro_b38?: number | null
          consignes_petro_b6?: number | null
          consignes_total_b12?: number | null
          consignes_total_b28?: number | null
          consignes_total_b38?: number | null
          consignes_total_b6?: number | null
          consignes_vivo_b12?: number | null
          consignes_vivo_b28?: number | null
          consignes_vivo_b38?: number | null
          consignes_vivo_b6?: number | null
          created_at?: string | null
          cumul_consignes_b12?: number | null
          cumul_consignes_b28?: number | null
          cumul_consignes_b38?: number | null
          cumul_consignes_b6?: number | null
          cumul_recharges_b12?: number | null
          cumul_recharges_b28?: number | null
          cumul_recharges_b38?: number | null
          cumul_recharges_b6?: number | null
          id?: string
          nombre_agents?: number | null
          numero_ligne?: number
          recharges_petro_b12?: number | null
          recharges_petro_b28?: number | null
          recharges_petro_b38?: number | null
          recharges_petro_b6?: number | null
          recharges_total_b12?: number | null
          recharges_total_b28?: number | null
          recharges_total_b38?: number | null
          recharges_total_b6?: number | null
          recharges_vivo_b12?: number | null
          recharges_vivo_b28?: number | null
          recharges_vivo_b38?: number | null
          recharges_vivo_b6?: number | null
          shift_id?: string
          tonnage_ligne?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lignes_production_chef_ligne_id_fkey"
            columns: ["chef_ligne_id"]
            isOneToOne: false
            referencedRelation: "chefs_ligne"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_production_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "production_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_modifications: {
        Row: {
          changes: Json
          created_at: string | null
          id: string
          modification_type: string
          modified_at: string | null
          modified_by: string | null
          previous_values: Json
          reason: string
          shift_id: string
        }
        Insert: {
          changes: Json
          created_at?: string | null
          id?: string
          modification_type: string
          modified_at?: string | null
          modified_by?: string | null
          previous_values: Json
          reason: string
          shift_id: string
        }
        Update: {
          changes?: Json
          created_at?: string | null
          id?: string
          modification_type?: string
          modified_at?: string | null
          modified_by?: string | null
          previous_values?: Json
          reason?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_modifications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "production_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_shifts: {
        Row: {
          agent_atelier: number | null
          agent_quai: number | null
          agent_saisie: number | null
          bouteilles_produites: number
          chariot: number | null
          chariste: number | null
          chef_ligne_id: string | null
          chef_quart_id: string | null
          created_at: string
          cumul_consignes_total: number | null
          cumul_recharges_total: number | null
          date: string
          heure_debut_reelle: string
          heure_debut_theorique: string
          heure_fin_reelle: string
          heure_fin_theorique: string
          id: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          temps_arret_total_minutes: number | null
          tonnage_total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_atelier?: number | null
          agent_quai?: number | null
          agent_saisie?: number | null
          bouteilles_produites?: number
          chariot?: number | null
          chariste?: number | null
          chef_ligne_id?: string | null
          chef_quart_id?: string | null
          created_at?: string
          cumul_consignes_total?: number | null
          cumul_recharges_total?: number | null
          date: string
          heure_debut_reelle: string
          heure_debut_theorique: string
          heure_fin_reelle: string
          heure_fin_theorique: string
          id?: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          temps_arret_total_minutes?: number | null
          tonnage_total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_atelier?: number | null
          agent_quai?: number | null
          agent_saisie?: number | null
          bouteilles_produites?: number
          chariot?: number | null
          chariste?: number | null
          chef_ligne_id?: string | null
          chef_quart_id?: string | null
          created_at?: string
          cumul_consignes_total?: number | null
          cumul_recharges_total?: number | null
          date?: string
          heure_debut_reelle?: string
          heure_debut_theorique?: string
          heure_fin_reelle?: string
          heure_fin_theorique?: string
          id?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          temps_arret_total_minutes?: number | null
          tonnage_total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_shifts_chef_ligne_id_fkey"
            columns: ["chef_ligne_id"]
            isOneToOne: false
            referencedRelation: "chefs_ligne"
            referencedColumns: ["id"]
          },
        ]
      }
      sphere_calculations: {
        Row: {
          calculation_date: string
          created_at: string
          creux_kg: number
          d_max: number
          d_min: number
          densite_d15: number
          hauteur_mm: number
          id: string
          masse_liquide_gaz_kg: number
          masse_produit_kg: number
          masse_total_gaz_kg: number
          masse_total_liquide_kg: number
          masse_volumique_butane_kgl: number
          pression_sphere_barg: number
          ps_max: number
          ps_min: number
          sphere_number: number
          temperature_gazeuse_c: number
          temperature_liquide_c: number
          tg_max: number
          tg_min: number
          tl_max: number
          tl_min: number
          updated_at: string
          user_id: string | null
          volume_gazeux_l: number
          volume_liquide_l: number
        }
        Insert: {
          calculation_date?: string
          created_at?: string
          creux_kg: number
          d_max: number
          d_min: number
          densite_d15: number
          hauteur_mm: number
          id?: string
          masse_liquide_gaz_kg: number
          masse_produit_kg: number
          masse_total_gaz_kg: number
          masse_total_liquide_kg: number
          masse_volumique_butane_kgl: number
          pression_sphere_barg: number
          ps_max: number
          ps_min: number
          sphere_number: number
          temperature_gazeuse_c: number
          temperature_liquide_c: number
          tg_max: number
          tg_min: number
          tl_max: number
          tl_min: number
          updated_at?: string
          user_id?: string | null
          volume_gazeux_l: number
          volume_liquide_l: number
        }
        Update: {
          calculation_date?: string
          created_at?: string
          creux_kg?: number
          d_max?: number
          d_min?: number
          densite_d15?: number
          hauteur_mm?: number
          id?: string
          masse_liquide_gaz_kg?: number
          masse_produit_kg?: number
          masse_total_gaz_kg?: number
          masse_total_liquide_kg?: number
          masse_volumique_butane_kgl?: number
          pression_sphere_barg?: number
          ps_max?: number
          ps_min?: number
          sphere_number?: number
          temperature_gazeuse_c?: number
          temperature_liquide_c?: number
          tg_max?: number
          tg_min?: number
          tl_max?: number
          tl_min?: number
          updated_at?: string
          user_id?: string | null
          volume_gazeux_l?: number
          volume_liquide_l?: number
        }
        Relationships: []
      }
      sphere_calibration: {
        Row: {
          capacity_l: number
          created_at: string
          height_mm: number
          id: string
          sphere_number: number
        }
        Insert: {
          capacity_l: number
          created_at?: string
          height_mm: number
          id?: string
          sphere_number: number
        }
        Update: {
          capacity_l?: number
          created_at?: string
          height_mm?: number
          id?: string
          sphere_number?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "chef_depot"
      arret_type:
        | "maintenance_corrective"
        | "manque_personnel"
        | "probleme_approvisionnement"
        | "panne_ligne"
        | "autre"
      etape_ligne:
        | "BASCULES"
        | "PURGE"
        | "CONTROLE"
        | "ETANCHEITE"
        | "CAPSULAGE"
        | "VIDANGE"
        | "PALETTISEUR"
        | "TRI"
        | "AUTRE"
      ligne_type: "B6_L1" | "B6_L2" | "B6_L3" | "B6_L4" | "B12"
      shift_type: "10h-19h" | "20h-5h"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "chef_depot"],
      arret_type: [
        "maintenance_corrective",
        "manque_personnel",
        "probleme_approvisionnement",
        "panne_ligne",
        "autre",
      ],
      etape_ligne: [
        "BASCULES",
        "PURGE",
        "CONTROLE",
        "ETANCHEITE",
        "CAPSULAGE",
        "VIDANGE",
        "PALETTISEUR",
        "TRI",
        "AUTRE",
      ],
      ligne_type: ["B6_L1", "B6_L2", "B6_L3", "B6_L4", "B12"],
      shift_type: ["10h-19h", "20h-5h"],
    },
  },
} as const
