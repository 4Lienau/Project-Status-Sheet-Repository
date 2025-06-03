export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accomplishments: {
        Row: {
          accomplishment: string
          created_at: string | null
          description: string
          id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          accomplishment?: string
          created_at?: string | null
          description: string
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accomplishment?: string
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accomplishments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          sync_completed_at: string | null
          sync_started_at: string | null
          sync_status: string | null
          users_created: number | null
          users_deactivated: number | null
          users_processed: number | null
          users_updated: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          sync_completed_at?: string | null
          sync_started_at?: string | null
          sync_status?: string | null
          users_created?: number | null
          users_deactivated?: number | null
          users_processed?: number | null
          users_updated?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          sync_completed_at?: string | null
          sync_started_at?: string | null
          sync_status?: string | null
          users_created?: number | null
          users_deactivated?: number | null
          users_processed?: number | null
          users_updated?: number | null
        }
        Relationships: []
      }
      changes: {
        Row: {
          change: string
          created_at: string | null
          disposition: string | null
          id: string
          impact: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          change: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          change?: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      considerations: {
        Row: {
          created_at: string | null
          description: string
          id: string
          impact: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "considerations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      directory_users: {
        Row: {
          account_enabled: boolean | null
          azure_user_id: string
          created_at: string | null
          created_date_time: string | null
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          job_title: string | null
          last_synced: string | null
          sync_status: string | null
          updated_at: string | null
          user_principal_name: string | null
        }
        Insert: {
          account_enabled?: boolean | null
          azure_user_id: string
          created_at?: string | null
          created_date_time?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          last_synced?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_principal_name?: string | null
        }
        Update: {
          account_enabled?: boolean | null
          azure_user_id?: string
          created_at?: string | null
          created_date_time?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          last_synced?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_principal_name?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          completion: number
          created_at: string | null
          date: string
          id: string
          milestone: string
          owner: string
          project_id: string | null
          status: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          completion: number
          created_at?: string | null
          date: string
          id?: string
          milestone: string
          owner: string
          project_id?: string | null
          status?: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          completion?: number
          created_at?: string | null
          date?: string
          id?: string
          milestone?: string
          owner?: string
          project_id?: string | null
          status?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      next_period_activities: {
        Row: {
          assignee: string | null
          completion: number | null
          created_at: string | null
          date: string | null
          description: string
          id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completion?: number | null
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completion?: number | null
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "next_period_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_summaries: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_current: boolean | null
          project_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          project_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          project_id: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id?: string
          project_id?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          project_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_actuals: number
          budget_forecast: number
          budget_total: number | null
          business_leads: string
          calculated_end_date: string | null
          calculated_start_date: string | null
          charter_link: string
          created_at: string | null
          department: string | null
          description: string | null
          health_calculation_type: string | null
          id: string
          manual_health_percentage: number | null
          manual_status_color: string | null
          project_analysis: string | null
          project_manager: string
          sponsors: string
          status: string | null
          title: string
          total_days: number | null
          total_days_remaining: number | null
          updated_at: string | null
          value_statement: string | null
          working_days: number | null
          working_days_remaining: number | null
        }
        Insert: {
          budget_actuals: number
          budget_forecast: number
          budget_total?: number | null
          business_leads: string
          calculated_end_date?: string | null
          calculated_start_date?: string | null
          charter_link: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          health_calculation_type?: string | null
          id?: string
          manual_health_percentage?: number | null
          manual_status_color?: string | null
          project_analysis?: string | null
          project_manager: string
          sponsors: string
          status?: string | null
          title: string
          total_days?: number | null
          total_days_remaining?: number | null
          updated_at?: string | null
          value_statement?: string | null
          working_days?: number | null
          working_days_remaining?: number | null
        }
        Update: {
          budget_actuals?: number
          budget_forecast?: number
          budget_total?: number | null
          business_leads?: string
          calculated_end_date?: string | null
          calculated_start_date?: string | null
          charter_link?: string
          created_at?: string | null
          department?: string | null
          description?: string | null
          health_calculation_type?: string | null
          id?: string
          manual_health_percentage?: number | null
          manual_status_color?: string | null
          project_analysis?: string | null
          project_manager?: string
          sponsors?: string
          status?: string | null
          title?: string
          total_days?: number | null
          total_days_remaining?: number | null
          updated_at?: string | null
          value_statement?: string | null
          working_days?: number | null
          working_days_remaining?: number | null
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          impact: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          impact?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_configurations: {
        Row: {
          created_at: string | null
          frequency_hours: number
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frequency_hours?: number
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frequency_hours?: number
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          completion: number | null
          created_at: string | null
          date: string | null
          description: string
          id: string
          milestone_id: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          completion?: number | null
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          completion?: number | null
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          last_login: string | null
          login_count: number | null
          milestones_created: number | null
          page_views: number | null
          projects_created: number | null
          projects_updated: number | null
          total_session_time_minutes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          last_login?: string | null
          login_count?: number | null
          milestones_created?: number | null
          page_views?: number | null
          projects_created?: number | null
          projects_updated?: number | null
          total_session_time_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          last_login?: string | null
          login_count?: number | null
          milestones_created?: number | null
          page_views?: number | null
          projects_created?: number | null
          projects_updated?: number | null
          total_session_time_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          page_url: string | null
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          page_url?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_end: string | null
          session_start: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_end?: string | null
          session_start?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_end?: string | null
          session_start?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      check_and_trigger_due_syncs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_azure_sync_due: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_inactive_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      end_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: Json
      }
      get_active_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          session_start: string
          last_activity: string
          session_duration_minutes: number
        }[]
      }
      get_auth_users_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          created_at: string
          last_sign_in_at: string
        }[]
      }
      get_auth_users_login_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          total_logins: number
          last_login: string
          total_session_time_minutes: number
          account_created: string
        }[]
      }
      get_comprehensive_user_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          total_logins: number
          last_login: string
          total_session_time_minutes: number
          total_page_views: number
          account_created: string
          last_activity: string
        }[]
      }
      get_user_activity_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          total_session_time: number
          total_page_views: number
          total_projects: number
          login_count: number
          last_login: string
        }[]
      }
      get_user_login_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          total_logins: number
          last_login: string
          total_session_time_minutes: number
          account_created: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      insert_daily_note_direct: {
        Args: { p_project_id: string; p_date: string; p_note: string }
        Returns: string
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_pm_knowledge: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          category: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      trigger_azure_sync_if_due: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      trigger_sync_if_due: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_daily_usage_metrics: {
        Args: { p_user_id: string; p_activity_type: string }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      milestone_status: "completed" | "on-schedule" | "at-risk" | "high-risk"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      milestone_status: ["completed", "on-schedule", "at-risk", "high-risk"],
    },
  },
} as const
