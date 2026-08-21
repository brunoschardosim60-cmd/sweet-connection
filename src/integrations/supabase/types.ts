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
      agendamentos: {
        Row: {
          chave_idempotencia: string | null
          created_at: string
          data: string
          data_original: string | null
          hora: string
          hora_original: string | null
          id: string
          minisite_id: string
          nome: string
          observacao: string
          reagendado_em: string | null
          reagendamentos: number
          servico: string
          status: string
          telefone: string
          token: string
          updated_at: string
        }
        Insert: {
          chave_idempotencia?: string | null
          created_at?: string
          data: string
          data_original?: string | null
          hora: string
          hora_original?: string | null
          id?: string
          minisite_id: string
          nome?: string
          observacao?: string
          reagendado_em?: string | null
          reagendamentos?: number
          servico?: string
          status?: string
          telefone?: string
          token?: string
          updated_at?: string
        }
        Update: {
          chave_idempotencia?: string | null
          created_at?: string
          data?: string
          data_original?: string | null
          hora?: string
          hora_original?: string | null
          id?: string
          minisite_id?: string
          nome?: string
          observacao?: string
          reagendado_em?: string | null
          reagendamentos?: number
          servico?: string
          status?: string
          telefone?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_minisite_id_fkey"
            columns: ["minisite_id"]
            isOneToOne: false
            referencedRelation: "minisites"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          owner_id: string
          plan: Json
          request_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          plan: Json
          request_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          plan?: Json
          request_hash?: string
        }
        Relationships: []
      }
      ai_generation_daily_usage: {
        Row: {
          generations: number
          owner_id: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          generations?: number
          owner_id: string
          updated_at?: string
          usage_date?: string
        }
        Update: {
          generations?: number
          owner_id?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      ai_generation_weekly_usage: {
        Row: {
          generations: number
          owner_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          generations?: number
          owner_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          generations?: number
          owner_id?: string
          updated_at?: string
          week_start?: string
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
      billing_checkout_sessions: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          paid_at: string | null
          provider: string
          provider_checkout_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          paid_at?: string | null
          provider: string
          provider_checkout_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          paid_at?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_invoices: {
        Row: {
          amount: number | null
          created_at: string
          due_date: string | null
          id: string
          invoice_url: string | null
          owner_id: string
          paid_at: string | null
          provider: string
          provider_payment_id: string
          provider_subscription_id: string | null
          status: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          owner_id: string
          paid_at?: string | null
          provider: string
          provider_payment_id: string
          provider_subscription_id?: string | null
          status: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          owner_id?: string
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string
          provider_subscription_id?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
      mesas_cardapio: {
        Row: { ativa: boolean; created_at: string; estado: string; id: string; minisite_id: string; nome: string | null; numero: number; updated_at: string }
        Insert: { ativa?: boolean; created_at?: string; estado?: string; id?: string; minisite_id: string; nome?: string | null; numero: number; updated_at?: string }
        Update: { ativa?: boolean; created_at?: string; estado?: string; id?: string; minisite_id?: string; nome?: string | null; numero?: number; updated_at?: string }
        Relationships: [{ foreignKeyName: "mesas_cardapio_minisite_id_fkey"; columns: ["minisite_id"]; isOneToOne: false; referencedRelation: "minisites"; referencedColumns: ["id"] }]
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          id: string
          last_error: string | null
          sent_at: string | null
          source_id: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedidos_cardapio: {
        Row: { bairro: string | null; chave_idempotencia: string | null; codigo: number; complemento: string | null; created_at: string; endereco: string | null; horario_preferido: string | null; id: string; itens: Json; mesa_id: string | null; minisite_id: string; modalidade: string; nome: string; observacao: string | null; pagamento: string | null; pessoas: number | null; referencia: string | null; status: string; subtotal: number; taxa_entrega: number; telefone: string; total: number; troco: string | null; updated_at: string }
        Insert: { bairro?: string | null; chave_idempotencia?: string | null; codigo?: never; complemento?: string | null; created_at?: string; endereco?: string | null; horario_preferido?: string | null; id?: string; itens: Json; mesa_id?: string | null; minisite_id: string; modalidade: string; nome: string; observacao?: string | null; pagamento?: string | null; pessoas?: number | null; referencia?: string | null; status?: string; subtotal: number; taxa_entrega?: number; telefone: string; total: number; troco?: string | null; updated_at?: string }
        Update: { bairro?: string | null; chave_idempotencia?: string | null; codigo?: never; complemento?: string | null; created_at?: string; endereco?: string | null; horario_preferido?: string | null; id?: string; itens?: Json; mesa_id?: string | null; minisite_id?: string; modalidade?: string; nome?: string; observacao?: string | null; pagamento?: string | null; pessoas?: number | null; referencia?: string | null; status?: string; subtotal?: number; taxa_entrega?: number; telefone?: string; total?: number; troco?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "pedidos_cardapio_mesa_id_fkey"; columns: ["mesa_id"]; isOneToOne: false; referencedRelation: "mesas_cardapio"; referencedColumns: ["id"] }, { foreignKeyName: "pedidos_cardapio_minisite_id_fkey"; columns: ["minisite_id"]; isOneToOne: false; referencedRelation: "minisites"; referencedColumns: ["id"] }]
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
          billing_cancel_at_period_end: boolean
          billing_current_period_end: string | null
          billing_customer_id: string | null
          billing_provider: string | null
          billing_subscription_id: string | null
          billing_updated_at: string | null
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
          subscription_status: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          billing_cancel_at_period_end?: boolean
          billing_current_period_end?: string | null
          billing_customer_id?: string | null
          billing_provider?: string | null
          billing_subscription_id?: string | null
          billing_updated_at?: string | null
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
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          billing_cancel_at_period_end?: boolean
          billing_current_period_end?: string | null
          billing_customer_id?: string | null
          billing_provider?: string | null
          billing_subscription_id?: string | null
          billing_updated_at?: string | null
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
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservas_hospedagem: {
        Row: {
          acomodacao: string
          chave_idempotencia: string | null
          check_in: string
          check_out: string
          created_at: string
          email: string
          hospedes: number
          id: string
          minisite_id: string
          nome: string
          notification_sent_at: string | null
          observacao: string
          status: string
          telefone: string
          token: string
          updated_at: string
        }
        Insert: {
          acomodacao?: string
          chave_idempotencia?: string | null
          check_in: string
          check_out: string
          created_at?: string
          email?: string
          hospedes: number
          id?: string
          minisite_id: string
          nome: string
          notification_sent_at?: string | null
          observacao?: string
          status?: string
          telefone?: string
          token?: string
          updated_at?: string
        }
        Update: {
          acomodacao?: string
          chave_idempotencia?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          email?: string
          hospedes?: number
          id?: string
          minisite_id?: string
          nome?: string
          notification_sent_at?: string | null
          observacao?: string
          status?: string
          telefone?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_hospedagem_minisite_id_fkey"
            columns: ["minisite_id"]
            isOneToOne: false
            referencedRelation: "minisites"
            referencedColumns: ["id"]
          },
        ]
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
      nexa_admin_ai_usage: {
        Args: { requested_days?: number }
        Returns: {
          email: string
          generations_30d: number
          generations_7d: number
          last_generation_at: string
          subscription_status: string
          tier: string
          user_id: string
        }[]
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
      nexa_admin_set_subscription: {
        Args: {
          requested_status: string
          requested_tier: string
          requested_user_id: string
        }
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
      nexa_agenda_ocupados: {
        Args: { requested_data: string; requested_slug: string }
        Returns: {
          hora: string
        }[]
      }
      nexa_agendamento_por_token: {
        Args: { requested_token: string }
        Returns: Json
      }
      nexa_agendar: {
        Args: {
          requested_chave?: string
          requested_data: string
          requested_hora: string
          requested_nome: string
          requested_observacao?: string
          requested_servico?: string
          requested_slug: string
          requested_telefone: string
        }
        Returns: Json
      }
      nexa_cancelar_agendamento: {
        Args: { requested_token: string }
        Returns: boolean
      }
      nexa_consume_ai_generation: {
        Args: { requested_user_id: string }
        Returns: {
          allowed: boolean
          daily_limit: number
          used: number
        }[]
      }
      nexa_criar_pedido_cardapio: {
        Args: { requested_chave?: string; requested_dados?: Json; requested_items: Json; requested_modalidade: string; requested_slug: string }
        Returns: Json
      }
      nexa_atualizar_status_pedido: {
        Args: { requested_id: string; requested_status: string }
        Returns: Json
      }
      nexa_ranking_produtos_cardapio: {
        Args: { requested_slug: string }
        Returns: { produto_id: string; pedidos: number }[]
      }
      nexa_plan_allows_publish: {
        Args: { requested_user_id: string }
        Returns: boolean
      }
      nexa_refund_ai_generation: {
        Args: { requested_user_id: string }
        Returns: undefined
      }
      nexa_reservar_hospedagem: {
        Args: {
          requested_acomodacao: string
          requested_chave?: string
          requested_check_in: string
          requested_check_out: string
          requested_email?: string
          requested_hospedes: number
          requested_nome: string
          requested_observacao?: string
          requested_slug: string
          requested_telefone?: string
        }
        Returns: Json
      }
      publish_minisite: {
        Args: { requested_id: string }
        Returns: {
          client_id: string
          created_at: string
          draft_content: Json
          expires_at: string | null
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
          expires_at: string | null
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
          expires_at: string | null
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
          billing_cancel_at_period_end: boolean
          billing_current_period_end: string | null
          billing_customer_id: string | null
          billing_provider: string | null
          billing_subscription_id: string | null
          billing_updated_at: string | null
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
          subscription_status: string
          subscription_tier: string
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
          billing_cancel_at_period_end: boolean
          billing_current_period_end: string | null
          billing_customer_id: string | null
          billing_provider: string | null
          billing_subscription_id: string | null
          billing_updated_at: string | null
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
          subscription_status: string
          subscription_tier: string
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
