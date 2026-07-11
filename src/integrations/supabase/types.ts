export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agent_ignored_numbers: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          phone_e164: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          phone_e164: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          phone_e164?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          active: boolean;
          created_at: string;
          debounce_seconds: number | null;
          description: string | null;
          humanization: Json;
          id: string;
          max_tokens: number | null;
          max_tool_rounds: number | null;
          model: string;
          name: string;
          system_prompt: string;
          temperature: number;
          tools: Json;
          updated_at: string;
          voice_id: string | null;
          workspace_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          debounce_seconds?: number | null;
          description?: string | null;
          humanization?: Json;
          id?: string;
          max_tokens?: number | null;
          max_tool_rounds?: number | null;
          model?: string;
          name: string;
          system_prompt?: string;
          temperature?: number;
          tools?: Json;
          updated_at?: string;
          voice_id?: string | null;
          workspace_id?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          debounce_seconds?: number | null;
          description?: string | null;
          humanization?: Json;
          id?: string;
          max_tokens?: number | null;
          max_tool_rounds?: number | null;
          model?: string;
          name?: string;
          system_prompt?: string;
          temperature?: number;
          tools?: Json;
          updated_at?: string;
          voice_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_connections: {
        Row: {
          campaign_id: string;
          connection_id: string;
          created_at: string;
          id: string;
          position: number;
          workspace_id: string;
        };
        Insert: {
          campaign_id: string;
          connection_id: string;
          created_at?: string;
          id?: string;
          position?: number;
          workspace_id: string;
        };
        Update: {
          campaign_id?: string;
          connection_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_connections_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_connections_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_recipients: {
        Row: {
          attempt_count: number;
          campaign_id: string;
          contact_name: string | null;
          contact_phone: string;
          created_at: string;
          error: string | null;
          id: string;
          last_connection_id: string | null;
          next_send_at: string | null;
          sent_at: string | null;
          status: string;
          updated_at: string;
          variables: Json;
          workspace_id: string;
        };
        Insert: {
          attempt_count?: number;
          campaign_id: string;
          contact_name?: string | null;
          contact_phone: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          last_connection_id?: string | null;
          next_send_at?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          variables?: Json;
          workspace_id?: string;
        };
        Update: {
          attempt_count?: number;
          campaign_id?: string;
          contact_name?: string | null;
          contact_phone?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          last_connection_id?: string | null;
          next_send_at?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          variables?: Json;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_last_connection_id_fkey";
            columns: ["last_connection_id"];
            isOneToOne: false;
            referencedRelation: "connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          connection_id: string | null;
          cooldown_enabled: boolean;
          cooldown_unit: string | null;
          cooldown_value: number | null;
          created_at: string;
          daily_cap: number;
          dispatch_mode: string;
          finished_at: string | null;
          hourly_limit: number;
          id: string;
          max_ms: number;
          metadata: Json;
          min_ms: number;
          name: string;
          schedule_at: string | null;
          sent_this_hour: number;
          sent_this_hour_at: string | null;
          sent_today: number;
          sent_today_date: string | null;
          spreadsheet_id: string | null;
          started_at: string | null;
          status: string;
          template_id: string | null;
          throttle_ms: number;
          updated_at: string;
          warmup_per_day: number | null;
          window_end: string;
          window_start: string;
          workspace_id: string;
        };
        Insert: {
          connection_id?: string | null;
          cooldown_enabled?: boolean;
          cooldown_unit?: string | null;
          cooldown_value?: number | null;
          created_at?: string;
          daily_cap?: number;
          dispatch_mode?: string;
          finished_at?: string | null;
          hourly_limit?: number;
          id?: string;
          max_ms?: number;
          metadata?: Json;
          min_ms?: number;
          name: string;
          schedule_at?: string | null;
          sent_this_hour?: number;
          sent_this_hour_at?: string | null;
          sent_today?: number;
          sent_today_date?: string | null;
          spreadsheet_id?: string | null;
          started_at?: string | null;
          status?: string;
          template_id?: string | null;
          throttle_ms?: number;
          updated_at?: string;
          warmup_per_day?: number | null;
          window_end?: string;
          window_start?: string;
          workspace_id?: string;
        };
        Update: {
          connection_id?: string | null;
          cooldown_enabled?: boolean;
          cooldown_unit?: string | null;
          cooldown_value?: number | null;
          created_at?: string;
          daily_cap?: number;
          dispatch_mode?: string;
          finished_at?: string | null;
          hourly_limit?: number;
          id?: string;
          max_ms?: number;
          metadata?: Json;
          min_ms?: number;
          name?: string;
          schedule_at?: string | null;
          sent_this_hour?: number;
          sent_this_hour_at?: string | null;
          sent_today?: number;
          sent_today_date?: string | null;
          spreadsheet_id?: string | null;
          started_at?: string | null;
          status?: string;
          template_id?: string | null;
          throttle_ms?: number;
          updated_at?: string;
          warmup_per_day?: number | null;
          window_end?: string;
          window_start?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_spreadsheet_id_fkey";
            columns: ["spreadsheet_id"];
            isOneToOne: false;
            referencedRelation: "spreadsheets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      connections: {
        Row: {
          created_at: string;
          default_agent_id: string | null;
          dispatch_daily_limit: number;
          dispatch_hourly_limit: number;
          dispatch_sent_this_hour: number;
          dispatch_sent_this_hour_at: string | null;
          dispatch_sent_today: number;
          dispatch_sent_today_date: string | null;
          id: string;
          ignore_groups: boolean;
          instance_name: string | null;
          metadata: Json;
          name: string;
          provider: string;
          qr_code: string | null;
          status: string;
          updated_at: string;
          webhook_url: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          default_agent_id?: string | null;
          dispatch_daily_limit?: number;
          dispatch_hourly_limit?: number;
          dispatch_sent_this_hour?: number;
          dispatch_sent_this_hour_at?: string | null;
          dispatch_sent_today?: number;
          dispatch_sent_today_date?: string | null;
          id?: string;
          ignore_groups?: boolean;
          instance_name?: string | null;
          metadata?: Json;
          name: string;
          provider?: string;
          qr_code?: string | null;
          status?: string;
          updated_at?: string;
          webhook_url?: string | null;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          default_agent_id?: string | null;
          dispatch_daily_limit?: number;
          dispatch_hourly_limit?: number;
          dispatch_sent_this_hour?: number;
          dispatch_sent_this_hour_at?: string | null;
          dispatch_sent_today?: number;
          dispatch_sent_today_date?: string | null;
          id?: string;
          ignore_groups?: boolean;
          instance_name?: string | null;
          metadata?: Json;
          name?: string;
          provider?: string;
          qr_code?: string | null;
          status?: string;
          updated_at?: string;
          webhook_url?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connections_default_agent_id_fkey";
            columns: ["default_agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          metadata: Json;
          name: string | null;
          opt_out: boolean;
          phone: string;
          tags: string[];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          metadata?: Json;
          name?: string | null;
          opt_out?: boolean;
          phone: string;
          tags?: string[];
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          metadata?: Json;
          name?: string | null;
          opt_out?: boolean;
          phone?: string;
          tags?: string[];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_markers: {
        Row: {
          conversation_id: string;
          created_at: string;
          id: string;
          kind: string;
          workspace_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          workspace_id?: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_markers_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          agent_id: string | null;
          agent_latest_message_id: string | null;
          agent_run_at: string | null;
          agent_run_started_at: string | null;
          agent_run_token: string | null;
          agent_running_since: string | null;
          assigned_to: string | null;
          connection_id: string | null;
          contact_id: string | null;
          created_at: string;
          crm_updated_at: string | null;
          id: string;
          last_message_at: string | null;
          lead_outcome: string | null;
          lead_value_cents: number | null;
          lead_value_currency: string;
          lead_value_note: string | null;
          status: string;
          tags: string[];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          agent_id?: string | null;
          agent_latest_message_id?: string | null;
          agent_run_at?: string | null;
          agent_run_started_at?: string | null;
          agent_run_token?: string | null;
          agent_running_since?: string | null;
          assigned_to?: string | null;
          connection_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          crm_updated_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          lead_outcome?: string | null;
          lead_value_cents?: number | null;
          lead_value_currency?: string;
          lead_value_note?: string | null;
          status?: string;
          tags?: string[];
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          agent_id?: string | null;
          agent_latest_message_id?: string | null;
          agent_run_at?: string | null;
          agent_run_started_at?: string | null;
          agent_run_token?: string | null;
          agent_running_since?: string | null;
          assigned_to?: string | null;
          connection_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          crm_updated_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          lead_outcome?: string | null;
          lead_value_cents?: number | null;
          lead_value_currency?: string;
          lead_value_note?: string | null;
          status?: string;
          tags?: string[];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_agent_latest_message_id_fkey";
            columns: ["agent_latest_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          direction: string;
          external_id: string | null;
          id: string;
          media_type: string | null;
          media_url: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          direction: string;
          external_id?: string | null;
          id?: string;
          media_type?: string | null;
          media_url?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          direction?: string;
          external_id?: string | null;
          id?: string;
          media_type?: string | null;
          media_url?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spreadsheet_rows: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          row_index: number;
          spreadsheet_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          id?: string;
          row_index: number;
          spreadsheet_id: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          row_index?: number;
          spreadsheet_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spreadsheet_rows_spreadsheet_id_fkey";
            columns: ["spreadsheet_id"];
            isOneToOne: false;
            referencedRelation: "spreadsheets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spreadsheet_rows_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spreadsheets: {
        Row: {
          created_at: string;
          headers: string[];
          id: string;
          name: string;
          row_count: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          headers?: string[];
          id?: string;
          name: string;
          row_count?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          headers?: string[];
          id?: string;
          name?: string;
          row_count?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spreadsheets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          variables: string[];
          workspace_id: string;
        };
        Insert: {
          category?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          variables?: string[];
          workspace_id?: string;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          variables?: string[];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          created_at: string;
          error: string | null;
          event_type: string | null;
          id: string;
          payload: Json;
          processed: boolean;
          provider: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          event_type?: string | null;
          id?: string;
          payload: Json;
          processed?: boolean;
          provider: string;
          workspace_id?: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          event_type?: string | null;
          id?: string;
          payload?: Json;
          processed?: boolean;
          provider?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspace_secrets: {
        Row: {
          id: string;
          name: string;
          updated_at: string;
          value: string;
          workspace_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          updated_at?: string;
          value: string;
          workspace_id?: string;
        };
        Update: {
          id?: string;
          name?: string;
          updated_at?: string;
          value?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_secrets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          cooldown_default_hours: number;
          created_at: string;
          dispatch_paused: boolean;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          cooldown_default_hours?: number;
          created_at?: string;
          dispatch_paused?: boolean;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          cooldown_default_hours?: number;
          created_at?: string;
          dispatch_paused?: boolean;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_due_agent_runs: {
        Args: { _limit?: number };
        Returns: {
          conversation_id: string;
          message_id: string;
          run_token: string;
        }[];
      };
      default_workspace_id: { Args: never; Returns: string };
      release_agent_lock: {
        Args: { _conversation_id: string };
        Returns: boolean;
      };
      release_agent_run: {
        Args: { _conversation_id: string; _run_token: string };
        Returns: boolean;
      };
      release_campaign_slot: {
        Args: {
          _campaign_id: string;
          _reservation_day: string;
          _reservation_hour: string;
        };
        Returns: boolean;
      };
      release_connection_slot: {
        Args: { _connection_id: string };
        Returns: undefined;
      };
      schedule_agent_run: {
        Args: {
          _conversation_id: string;
          _delay_ms: number;
          _message_id: string;
        };
        Returns: undefined;
      };
      try_agent_lock: { Args: { _conversation_id: string }; Returns: boolean };
      try_reserve_campaign_slot: {
        Args: {
          _campaign_id: string;
          _daily_limit: number;
          _now?: string;
        };
        Returns: {
          day_full: boolean;
          hour_full: boolean;
          reservation_day: string;
          reservation_hour: string;
          reserved: boolean;
        }[];
      };
      try_reserve_connection_slot: {
        Args: { _connection_id: string };
        Returns: {
          day_full: boolean;
          hour_full: boolean;
          reserved: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
