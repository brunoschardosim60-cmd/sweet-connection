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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          new_value: string | null
          previous_value: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_value?: string | null
          previous_value?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_value?: string | null
          previous_value?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          event_type: Database["public"]["Enums"]["nexa_event_type"]
          id: number
          minisite_id: string
          occurred_at: string
          session_hash: string | null
          source: string | null
          target: string | null
          visitor_hash: string | null
        }
        Insert: {
          event_type: Database["public"]["Enums"]["nexa_event_type"]
          id?: never
          minisite_id: string
          occurred_at?: string
          session_hash?: string | null
          source?: string | null
          target?: string | null
          visitor_hash?: string | null
        }
        Update: {
          event_type?: Database["public"]["Enums"]["nexa_event_type"]
          id?: never
          minisite_id?: string
          occurred_at?: string
          session_hash?: string | null
          source?: string | null
          target?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_minisite_id_fkey"
            columns: ["minisite_id"]
            isOneToOne: false
            referencedRelation: "minisites"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string
          company: string
          contact_name: string
          created_at: string
          email: string
          id: string
          owner_id: string
          phone: string
          segment: string
          state: string
          updated_at: string
        }
        Insert: {
          city?: string
          company: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          phone?: string
          segment: string
          state?: string
          updated_at?: string
        }
        Update: {
          city?: string
          company?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          phone?: string
          segment?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          fingerprint_hash: string | null
          id: string
          minisite_id: string
          origin: string
          payload: Json
          status: Database["public"]["Enums"]["nexa_submission_status"]
        }
        Insert: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          minisite_id: string
          origin?: string
          payload: Json
          status?: Database["public"]["Enums"]["nexa_submission_status"]
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          minisite_id?: string
          origin?: string
          payload?: Json
          status?: Database["public"]["Enums"]["nexa_submission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_minisite_id_fkey"
            columns: ["minisite_id"]
            isOneToOne: false
            referencedRelation: "minisites"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          bucket: string
          created_at: string
          id: string
          mime_type: string
          object_path: string
          original_name: string
          owner_id: string
          size_bytes: number
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          mime_type: string
          object_path: string
          original_name?: string
          owner_id?: string
          size_bytes: number
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          mime_type?: string
          object_path?: string
          original_name?: string
          owner_id?: string
          size_bytes?: number
        }
        Relationships: []
      }
      minisite_versions: {
        Row: {
          content: Json
          created_at: string
          id: string
          label: string
          minisite_id: string
          origin: string
          owner_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          label: string
          minisite_id: string
          origin: string
          owner_id?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          label?: string
          minisite_id?: string
          origin?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "versions_minisite_owner_fk"
            columns: ["minisite_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "minisites"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      minisites: {
        Row: {
          client_id: string
          created_at: string
          draft_content: Json
          id: string
          owner_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["nexa_site_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          draft_content: Json
          id?: string
          owner_id?: string
          published_at?: string | null
          published_content?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["nexa_site_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          draft_content?: Json
          id?: string
          owner_id?: string
          published_at?: string | null
          published_content?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["nexa_site_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minisites_client_owner_fk"
            columns: ["client_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          owner_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          owner_id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cleanup_claimed_at: string | null
          created_at: string
          deletion_scheduled_at: string | null
          display_name: string
          id: string
          last_active_at: string
          plan: Database["public"]["Enums"]["nexa_plan"]
          plan_changed_by: string | null
          plan_updated_at: string
          role: string
          updated_at: string
        }
        Insert: {
          cleanup_claimed_at?: string | null
          created_at?: string
          deletion_scheduled_at?: string | null
          display_name?: string
          id: string
          last_active_at?: string
          plan?: Database["public"]["Enums"]["nexa_plan"]
          plan_changed_by?: string | null
          plan_updated_at?: string
          role?: string
          updated_at?: string
        }
        Update: {
          cleanup_claimed_at?: string | null
          created_at?: string
          deletion_scheduled_at?: string | null
          display_name?: string
          id?: string
          last_active_at?: string
          plan?: Database["public"]["Enums"]["nexa_plan"]
          plan_changed_by?: string | null
          plan_updated_at?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_nexa_accounts_for_cleanup: {
        Args: { requested_secret: string }
        Returns: {
          user_id: string
        }[]
      }
      clear_nexa_account: { Args: never; Returns: undefined }
      confirm_nexa_account_cleanup: {
        Args: { requested_secret: string; requested_user_id: string }
        Returns: boolean
      }
      delete_minisite: { Args: { requested_id: string }; Returns: undefined }
      delete_nexa_account: { Args: never; Returns: undefined }
      get_published_minisite: {
        Args: { requested_slug: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nexa_admin_audit: {
        Args: { requested_limit?: number }
        Returns: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          id: number
          new_value: string
          previous_value: string
          target_email: string
          target_user_id: string
        }[]
      }
      nexa_admin_overview: { Args: never; Returns: Json }
      nexa_admin_series: {
        Args: { requested_days?: number }
        Returns: {
          dia: string
          sites: number
          solicitacoes: number
          usuarios: number
          visitas: number
        }[]
      }
      nexa_admin_set_plan: {
        Args: { requested_plan: string; requested_user_id: string }
        Returns: undefined
      }
      nexa_admin_users: {
        Args: never
        Returns: {
          created_at: string
          deletion_scheduled_at: string
          display_name: string
          email: string
          is_admin: boolean
          last_active_at: string
          papeis: Json
          plan_changed_by: string
          plan_updated_at: string
          plano: string
          sites: number
          sites_publicados: number
          solicitacoes: number
          user_id: string
        }[]
      }
      publish_minisite: {
        Args: { requested_id: string }
        Returns: {
          client_id: string
          created_at: string
          draft_content: Json
          id: string
          owner_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["nexa_site_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "minisites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_minisite_event: {
        Args: {
          request_source?: string
          requested_event: Database["public"]["Enums"]["nexa_event_type"]
          requested_slug: string
          requested_target?: string
          session_fingerprint?: string
        }
        Returns: undefined
      }
      save_minisite_draft: {
        Args: {
          client_content: Json
          requested_id?: string
          requested_slug: string
          site_content: Json
        }
        Returns: {
          client_id: string
          created_at: string
          draft_content: Json
          id: string
          owner_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["nexa_site_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "minisites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_minisite_version: {
        Args: {
          requested_content: Json
          requested_label: string
          requested_origin: string
          requested_site_id: string
        }
        Returns: {
          content: Json
          created_at: string
          id: string
          label: string
          minisite_id: string
          origin: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "minisite_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_minisite_status: {
        Args: {
          requested_id: string
          requested_status: Database["public"]["Enums"]["nexa_site_status"]
        }
        Returns: {
          client_id: string
          created_at: string
          draft_content: Json
          id: string
          owner_id: string
          published_at: string | null
          published_content: Json | null
          slug: string
          status: Database["public"]["Enums"]["nexa_site_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "minisites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_minisite_form: {
        Args: {
          fingerprint?: string
          request_origin?: string
          requested_slug: string
          submitted_payload: Json
        }
        Returns: string
      }
      touch_nexa_activity: {
        Args: never
        Returns: {
          cleanup_claimed_at: string | null
          created_at: string
          deletion_scheduled_at: string | null
          display_name: string
          id: string
          last_active_at: string
          plan: Database["public"]["Enums"]["nexa_plan"]
          plan_changed_by: string | null
          plan_updated_at: string
          role: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_nexa_profile: {
        Args: { requested_display_name: string }
        Returns: {
          cleanup_claimed_at: string | null
          created_at: string
          deletion_scheduled_at: string | null
          display_name: string
          id: string
          last_active_at: string
          plan: Database["public"]["Enums"]["nexa_plan"]
          plan_changed_by: string | null
          plan_updated_at: string
          role: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "pro" | "free"
      nexa_event_type: "visita" | "clique" | "whatsapp" | "formulario"
      nexa_plan: "free" | "pro"
      nexa_site_status: "rascunho" | "publicado" | "pausado"
      nexa_submission_status: "novo" | "lido" | "arquivado"
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
      app_role: ["admin", "pro", "free"],
      nexa_event_type: ["visita", "clique", "whatsapp", "formulario"],
      nexa_plan: ["free", "pro"],
      nexa_site_status: ["rascunho", "publicado", "pausado"],
      nexa_submission_status: ["novo", "lido", "arquivado"],
    },
  },
} as const
