export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SiteStatus = "rascunho" | "publicado" | "pausado";
type SubmissionStatus = "novo" | "lido" | "arquivado";
type EventType = "visita" | "clique" | "whatsapp" | "formulario";

type Tabela<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  display_name: string;
  role: string;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  owner_id: string;
  company: string;
  segment: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  created_at: string;
  updated_at: string;
};

export type MinisiteRow = {
  id: string;
  owner_id: string;
  client_id: string;
  slug: string;
  status: SiteStatus;
  draft_content: Json;
  published_content: Json | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type SettingsRow = {
  owner_id: string;
  settings: Json;
  created_at: string;
  updated_at: string;
};

type SubmissionRow = {
  id: string;
  minisite_id: string;
  payload: Json;
  origin: string;
  status: SubmissionStatus;
  fingerprint_hash: string | null;
  created_at: string;
};

type MediaRow = {
  id: string;
  owner_id: string;
  bucket: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
  original_name: string;
  created_at: string;
};

type VersionRow = {
  id: string;
  minisite_id: string;
  owner_id: string;
  origin: "manual" | "salvamento" | "publicacao" | "importacao";
  label: string;
  content: Json;
  created_at: string;
};

type AnalyticsRow = {
  id: number;
  minisite_id: string;
  event_type: EventType;
  target: string | null;
  source: string | null;
  visitor_hash: string | null;
  session_hash: string | null;
  occurred_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      profiles: Tabela<
        ProfileRow,
        {
          id: string;
          display_name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      clients: Tabela<
        ClientRow,
        {
          id?: string;
          owner_id?: string;
          company: string;
          segment: string;
          contact_name?: string;
          phone?: string;
          email?: string;
          city?: string;
          state?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      minisites: Tabela<
        MinisiteRow,
        {
          id?: string;
          owner_id?: string;
          client_id: string;
          slug: string;
          status?: SiteStatus;
          draft_content: Json;
          published_content?: Json | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      platform_settings: Tabela<
        SettingsRow,
        {
          owner_id?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      form_submissions: Tabela<
        SubmissionRow,
        {
          id?: string;
          minisite_id: string;
          payload: Json;
          origin?: string;
          status?: SubmissionStatus;
          fingerprint_hash?: string | null;
          created_at?: string;
        }
      >;
      media: Tabela<
        MediaRow,
        {
          id?: string;
          owner_id?: string;
          bucket?: string;
          object_path: string;
          mime_type: string;
          size_bytes: number;
          original_name?: string;
          created_at?: string;
        }
      >;
      minisite_versions: Tabela<
        VersionRow,
        {
          id?: string;
          minisite_id: string;
          owner_id?: string;
          origin: VersionRow["origin"];
          label: string;
          content: Json;
          created_at?: string;
        }
      >;
      analytics_events: Tabela<
        AnalyticsRow,
        {
          id?: never;
          minisite_id: string;
          event_type: EventType;
          target?: string | null;
          source?: string | null;
          visitor_hash?: string | null;
          session_hash?: string | null;
          occurred_at?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      clear_nexa_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      delete_minisite: { Args: { requested_id: string }; Returns: undefined };
      get_published_minisite: { Args: { requested_slug: string }; Returns: Json };
      publish_minisite: { Args: { requested_id: string }; Returns: MinisiteRow };
      record_minisite_event: {
        Args: {
          requested_slug: string;
          requested_event: EventType;
          requested_target?: string;
          request_source?: string;
          session_fingerprint?: string;
        };
        Returns: undefined;
      };
      save_minisite_draft: {
        Args: {
          requested_slug: string;
          site_content: Json;
          client_content: Json;
          requested_id?: string;
        };
        Returns: MinisiteRow;
      };
      save_minisite_version: {
        Args: {
          requested_site_id: string;
          requested_origin: string;
          requested_label: string;
          requested_content: Json;
        };
        Returns: VersionRow;
      };
      set_minisite_status: {
        Args: { requested_id: string; requested_status: SiteStatus };
        Returns: MinisiteRow;
      };
      submit_minisite_form: {
        Args: {
          requested_slug: string;
          submitted_payload: Json;
          request_origin?: string;
          fingerprint?: string;
        };
        Returns: string;
      };
      update_nexa_profile: {
        Args: { requested_display_name: string };
        Returns: ProfileRow;
      };
    };
    Enums: {
      nexa_site_status: SiteStatus;
      nexa_submission_status: SubmissionStatus;
      nexa_event_type: EventType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export const Constants = {
  public: {
    Enums: {
      nexa_site_status: ["rascunho", "publicado", "pausado"],
      nexa_submission_status: ["novo", "lido", "arquivado"],
      nexa_event_type: ["visita", "clique", "whatsapp", "formulario"],
    },
  },
} as const;
