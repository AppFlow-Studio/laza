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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string | null
          created_at: string
          id: number
          item_id: number | null
          location_id: string | null
          notified_users: Json | null
          organization_id: string | null
          resolved_at: string | null
          storage_space_id: string | null
          triggered_at: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string
          id?: number
          item_id?: number | null
          location_id?: string | null
          notified_users?: Json | null
          organization_id?: string | null
          resolved_at?: string | null
          storage_space_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string
          id?: number
          item_id?: number | null
          location_id?: string | null
          notified_users?: Json | null
          organization_id?: string | null
          resolved_at?: string | null
          storage_space_id?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      category: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summary_preferences: {
        Row: {
          created_at: string | null
          group_by_location: boolean
          id: string
          include_comparison_metrics: boolean
          include_employee_activity: boolean
          include_inventory_value: boolean
          include_low_stock_items: boolean
          include_storage_utilization: boolean
          include_trending_items: boolean
          include_updated_items: boolean
          locations_to_include: Json | null
          min_significance_threshold: number
          organization_id: string
          show_matrix_only_with_stock: boolean
          summary_format: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_by_location?: boolean
          id?: string
          include_comparison_metrics?: boolean
          include_employee_activity?: boolean
          include_inventory_value?: boolean
          include_low_stock_items?: boolean
          include_storage_utilization?: boolean
          include_trending_items?: boolean
          include_updated_items?: boolean
          locations_to_include?: Json | null
          min_significance_threshold?: number
          organization_id: string
          show_matrix_only_with_stock?: boolean
          summary_format?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_by_location?: boolean
          id?: string
          include_comparison_metrics?: boolean
          include_employee_activity?: boolean
          include_inventory_value?: boolean
          include_low_stock_items?: boolean
          include_storage_utilization?: boolean
          include_trending_items?: boolean
          include_updated_items?: boolean
          locations_to_include?: Json | null
          min_significance_threshold?: number
          organization_id?: string
          show_matrix_only_with_stock?: boolean
          summary_format?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string
          recipient_email: string
          resend_email_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          recipient_email: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          recipient_email?: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_schedule_log: {
        Row: {
          created_at: string | null
          email_type: string
          id: string
          items_count: number | null
          organization_id: string
          scheduled_date: string
          scheduled_time: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          id?: string
          items_count?: number | null
          organization_id: string
          scheduled_date: string
          scheduled_time: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          id?: string
          items_count?: number | null
          organization_id?: string
          scheduled_date?: string
          scheduled_time?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_schedule_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          action_type: string | null
          created_at: string
          id: number
          item_id: number | null
          location_id: string | null
          new_quantity: number | null
          notes: string | null
          organization_id: string | null
          previous_quantity: number | null
          quantity_change: number | null
          storage_space_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          id?: number
          item_id?: number | null
          location_id?: string | null
          new_quantity?: number | null
          notes?: string | null
          organization_id?: string | null
          previous_quantity?: number | null
          quantity_change?: number | null
          storage_space_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          id?: number
          item_id?: number | null
          location_id?: string | null
          new_quantity?: number | null
          notes?: string | null
          organization_id?: string | null
          previous_quantity?: number | null
          quantity_change?: number | null
          storage_space_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      item_locations: {
        Row: {
          created_at: string
          current_quantity: number | null
          id: string
          item_id: number | null
          last_updated: string | null
          location_id: string | null
          min_quantity_override: number | null
          organization_id: string | null
          storage_space_id: string | null
        }
        Insert: {
          created_at?: string
          current_quantity?: number | null
          id?: string
          item_id?: number | null
          last_updated?: string | null
          location_id?: string | null
          min_quantity_override?: number | null
          organization_id?: string | null
          storage_space_id?: string | null
        }
        Update: {
          created_at?: string
          current_quantity?: number | null
          id?: string
          item_id?: number | null
          last_updated?: string | null
          location_id?: string | null
          min_quantity_override?: number | null
          organization_id?: string | null
          storage_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_locations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_locations_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode_text: string | null
          box_quantity: number | null
          category_id: number | null
          cost_per_unit: number | null
          created_at: string
          id: number
          min_quantity: number | null
          name: string | null
          organization_id: string | null
          sku: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode_text?: string | null
          box_quantity?: number | null
          category_id?: number | null
          cost_per_unit?: number | null
          created_at?: string
          id?: number
          min_quantity?: number | null
          name?: string | null
          organization_id?: string | null
          sku?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode_text?: string | null
          box_quantity?: number | null
          category_id?: number | null
          cost_per_unit?: number | null
          created_at?: string
          id?: number
          min_quantity?: number | null
          name?: string | null
          organization_id?: string | null
          sku?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean | null
          location_type: string
          name: string | null
          organization_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_type?: string
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location_type?: string
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_notification_queue: {
        Row: {
          alert_id: number
          current_quantity: number | null
          id: string
          item_id: number
          location_id: string
          min_quantity: number | null
          notification_sent: boolean
          organization_id: string
          previous_quantity: number | null
          processed_at: string | null
          queued_at: string | null
          storage_space_id: string | null
          urgency_level: string
        }
        Insert: {
          alert_id: number
          current_quantity?: number | null
          id?: string
          item_id: number
          location_id: string
          min_quantity?: number | null
          notification_sent?: boolean
          organization_id: string
          previous_quantity?: number | null
          processed_at?: string | null
          queued_at?: string | null
          storage_space_id?: string | null
          urgency_level: string
        }
        Update: {
          alert_id?: number
          current_quantity?: number | null
          id?: string
          item_id?: number
          location_id?: string
          min_quantity?: number | null
          notification_sent?: boolean
          organization_id?: string
          previous_quantity?: number | null
          processed_at?: string | null
          queued_at?: string | null
          storage_space_id?: string | null
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_notification_queue_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_notification_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_notification_queue_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_notification_queue_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_thresholds: {
        Row: {
          category_id: string | null
          created_at: string | null
          critical_threshold: number | null
          id: string
          is_active: boolean
          item_id: number | null
          location_id: string | null
          low_threshold: number
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          critical_threshold?: number | null
          id?: string
          is_active?: boolean
          item_id?: number | null
          location_id?: string | null
          low_threshold: number
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          critical_threshold?: number | null
          id?: string
          is_active?: boolean
          item_id?: number | null
          location_id?: string | null
          low_threshold?: number
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_thresholds_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_thresholds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_thresholds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          daily_summary_days: Json
          daily_summary_enabled: boolean
          daily_summary_schedule: string
          email_format: string
          id: string
          low_stock_alerts_enabled: boolean
          low_stock_delivery_mode: string
          low_stock_digest_schedule: string | null
          notifications_enabled: boolean
          organization_id: string
          primary_email: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          secondary_emails: Json | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_summary_days?: Json
          daily_summary_enabled?: boolean
          daily_summary_schedule?: string
          email_format?: string
          id?: string
          low_stock_alerts_enabled?: boolean
          low_stock_delivery_mode?: string
          low_stock_digest_schedule?: string | null
          notifications_enabled?: boolean
          organization_id: string
          primary_email: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          secondary_emails?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_summary_days?: Json
          daily_summary_enabled?: boolean
          daily_summary_schedule?: string
          email_format?: string
          id?: string
          low_stock_alerts_enabled?: boolean
          low_stock_delivery_mode?: string
          low_stock_digest_schedule?: string | null
          notifications_enabled?: boolean
          organization_id?: string
          primary_email?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          secondary_emails?: Json | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ticket_items: {
        Row: {
          fulfilled_boxes: number | null
          fulfilled_units: number | null
          id: string
          item_id: number
          quantity_boxes: number
          quantity_units: number
          ticket_id: string
        }
        Insert: {
          fulfilled_boxes?: number | null
          fulfilled_units?: number | null
          id?: string
          item_id: number
          quantity_boxes: number
          quantity_units: number
          ticket_id: string
        }
        Update: {
          fulfilled_boxes?: number | null
          fulfilled_units?: number | null
          id?: string
          item_id?: number
          quantity_boxes?: number
          quantity_units?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ticket_logs: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          ticket_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tickets: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          fulfilled_at: string | null
          id: string
          is_auto_approved: boolean
          notes: string | null
          organization_id: string
          parent_ticket_id: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_by: string
          requesting_location_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          warehouse_location_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          is_auto_approved?: boolean
          notes?: string | null
          organization_id: string
          parent_ticket_id?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          requesting_location_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          warehouse_location_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          is_auto_approved?: boolean
          notes?: string | null
          organization_id?: string
          parent_ticket_id?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          requesting_location_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          warehouse_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tickets_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_requesting_location_id_fkey"
            columns: ["requesting_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tickets_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          assigned_location_id: string | null
          clerk_invite_id: string | null
          clerk_user_id: string | null
          created_at: string
          email: string | null
          id: string
          organization_id: string | null
          role: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_location_id?: string | null
          clerk_invite_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_location_id?: string | null
          clerk_invite_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_clerk_user_id_fkey"
            columns: ["clerk_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          ImageURL: string | null
          name: string | null
          public_metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id: string
          ImageURL?: string | null
          name?: string | null
          public_metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ImageURL?: string | null
          name?: string | null
          public_metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_holds: {
        Row: {
          amount_cents: number
          captured_amount_cents: number | null
          captured_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          held_at: string | null
          id: string
          organization_id: string
          provider_hold_id: string | null
          released_at: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          captured_amount_cents?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          held_at?: string | null
          id?: string
          organization_id: string
          provider_hold_id?: string | null
          released_at?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          captured_amount_cents?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          held_at?: string | null
          id?: string
          organization_id?: string
          provider_hold_id?: string | null
          released_at?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_holds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_holds_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_spaces: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string | null
          temperature_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string | null
          temperature_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string | null
          temperature_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_spaces_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      update_limits: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          location_id: string
          max_updates_per_window: number
          storage_space_id: string | null
          time_window_end: string
          time_window_start: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          max_updates_per_window?: number
          storage_space_id?: string | null
          time_window_end?: string
          time_window_start?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          max_updates_per_window?: number
          storage_space_id?: string | null
          time_window_end?: string
          time_window_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "update_limits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_limits_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      update_override_logs: {
        Row: {
          admin_user_id: string
          created_at: string | null
          employee_user_id: string | null
          id: string
          inventory_log_id: number
          item_id: number
          location_id: string
          override_reason: string | null
          storage_space_id: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          employee_user_id?: string | null
          id?: string
          inventory_log_id: number
          item_id: number
          location_id: string
          override_reason?: string | null
          storage_space_id?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          employee_user_id?: string | null
          id?: string
          inventory_log_id?: number
          item_id?: number
          location_id?: string
          override_reason?: string | null
          storage_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "update_override_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_override_logs_employee_user_id_fkey"
            columns: ["employee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_override_logs_inventory_log_id_fkey"
            columns: ["inventory_log_id"]
            isOneToOne: false
            referencedRelation: "inventory_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_override_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_override_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_override_logs_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_location_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          public_metadata: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_location_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          public_metadata?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_location_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          public_metadata?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_low_stock_alerts_enabled: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      are_notifications_enabled: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      check_scheduled_emails: {
        Args: never
        Returns: {
          email_type: string
          organization_id: string
          triggered: boolean
        }[]
      }
      get_daily_summary_data: {
        Args: {
          p_date?: string
          p_locations_to_include?: string[]
          p_organization_id: string
        }
        Returns: Json
      }
      get_my_claim: { Args: { claim: string }; Returns: string }
      get_organization_id_from_location: {
        Args: { p_location_id: string }
        Returns: string
      }
      get_pending_digest_items: {
        Args: { p_organization_id: string }
        Returns: {
          alert_id: number
          current_quantity: number
          item_id: number
          item_name: string
          item_sku: string
          item_unit: string
          location_id: string
          location_name: string
          min_quantity: number
          previous_quantity: number
          quantity_change: number
          queue_id: string
          queued_at: string
          storage_space_id: string
          storage_space_name: string
          urgency_level: string
        }[]
      }
      get_time_window_bounds: {
        Args: {
          p_reference_time?: string
          p_time_window_end: string
          p_time_window_start: string
        }
        Returns: {
          window_end: string
          window_start: string
        }[]
      }
      get_update_count_in_window: {
        Args: {
          p_item_id: number
          p_location_id: string
          p_storage_space_id: string
          p_time_window_end: string
          p_time_window_start: string
          p_user_id: string
        }
        Returns: number
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_within_time_window: {
        Args: {
          p_time_window_end: string
          p_time_window_start: string
          p_timestamp: string
        }
        Returns: boolean
      }
      mark_digest_items_processed: {
        Args: { p_organization_id: string; p_queue_ids: string[] }
        Returns: number
      }
      queue_low_stock: {
        Args: {
          p_alert_id: number
          p_current_quantity?: number
          p_item_id: number
          p_location_id: string
          p_min_quantity?: number
          p_previous_quantity?: number
          p_storage_space_id: string
          p_urgency_level: string
        }
        Returns: string
      }
      queue_low_stock_alert: {
        Args: {
          p_alert_id: number
          p_current_quantity?: number
          p_item_id: number
          p_location_id: string
          p_min_quantity?: number
          p_previous_quantity?: number
          p_storage_space_id: string
          p_urgency_level: string
        }
        Returns: string
      }
      requesting_user_id: { Args: never; Returns: string }
      trigger_scheduled_emails_now: {
        Args: never
        Returns: {
          email_type: string
          organization_id: string
          triggered: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
