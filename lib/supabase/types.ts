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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
          locations_to_include?: Json | null
          min_significance_threshold?: number
          organization_id?: string
          show_matrix_only_with_stock?: boolean
          summary_format?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_preferences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summary_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
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
      inventory_update_requests: {
        Row: {
          action_type: string
          created_at: string
          id: string
          item_id: number
          location_id: string
          new_quantity: number
          notes: string | null
          org_id: string
          previous_quantity: number
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_space_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          item_id: number
          location_id: string
          new_quantity: number
          notes?: string | null
          org_id: string
          previous_quantity?: number
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_space_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          item_id?: number
          location_id?: string
          new_quantity?: number
          notes?: string | null
          org_id?: string
          previous_quantity?: number
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_update_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_cost_history: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          item_id: number
          organization_id: string
          purchase_order_id: string
          unit_cost_after: number
          unit_price_before: number
        }
        Insert: {
          created_at?: string
          effective_date: string
          id?: string
          item_id: number
          organization_id: string
          purchase_order_id: string
          unit_cost_after: number
          unit_price_before: number
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          item_id?: number
          organization_id?: string
          purchase_order_id?: string
          unit_cost_after?: number
          unit_price_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_cost_history_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_cost_history_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_cost_history_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_cost_history_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "item_shipment_breakdown"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "item_cost_history_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
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
      item_warehouse_pricing: {
        Row: {
          created_at: string
          currency: string
          item_id: number
          updated_at: string
          updated_by: string
          warehouse_transfer_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          item_id: number
          updated_at?: string
          updated_by: string
          warehouse_transfer_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          item_id?: number
          updated_at?: string
          updated_by?: string
          warehouse_transfer_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_warehouse_pricing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_warehouse_pricing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_warehouse_pricing_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode_text: string | null
          box_quantity: number | null
          category_id: number | null
          cbm_per_carton: number | null
          cost_per_unit: number | null
          created_at: string
          current_unit_cost: number | null
          id: number
          is_warehouse_item: boolean
          min_quantity: number | null
          name: string | null
          organization_id: string | null
          short_label: string | null
          sku: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode_text?: string | null
          box_quantity?: number | null
          category_id?: number | null
          cbm_per_carton?: number | null
          cost_per_unit?: number | null
          created_at?: string
          current_unit_cost?: number | null
          id?: number
          is_warehouse_item?: boolean
          min_quantity?: number | null
          name?: string | null
          organization_id?: string | null
          short_label?: string | null
          sku?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode_text?: string | null
          box_quantity?: number | null
          category_id?: number | null
          cbm_per_carton?: number | null
          cost_per_unit?: number | null
          created_at?: string
          current_unit_cost?: number | null
          id?: number
          is_warehouse_item?: boolean
          min_quantity?: number | null
          name?: string | null
          organization_id?: string | null
          short_label?: string | null
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
      location_catalog: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          item_id: number
          location_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          item_id: number
          location_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          item_id?: number
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_catalog_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_catalog_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "location_catalog_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_catalog_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_groups_organization_id_fkey"
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
          group_id: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location_type: string
          longitude: number | null
          name: string | null
          organization_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "location_groups"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
            foreignKeyName: "notification_preferences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ticket_fulfillment_lines: {
        Row: {
          boxes_deducted: number
          created_at: string
          id: string
          order_ticket_item_id: string
          pallet_id: string
          pallet_inventory_id: string
          pieces_per_box_at_time: number
          total_pieces: number
        }
        Insert: {
          boxes_deducted: number
          created_at?: string
          id?: string
          order_ticket_item_id: string
          pallet_id: string
          pallet_inventory_id: string
          pieces_per_box_at_time: number
          total_pieces: number
        }
        Update: {
          boxes_deducted?: number
          created_at?: string
          id?: string
          order_ticket_item_id?: string
          pallet_id?: string
          pallet_inventory_id?: string
          pieces_per_box_at_time?: number
          total_pieces?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_fulfillment_lines_order_ticket_item_id_fkey"
            columns: ["order_ticket_item_id"]
            isOneToOne: false
            referencedRelation: "order_ticket_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_fulfillment_lines_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_fulfillment_lines_pallet_inventory_id_fkey"
            columns: ["pallet_inventory_id"]
            isOneToOne: false
            referencedRelation: "pallet_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_fulfillment_lines_pallet_inventory_id_fkey"
            columns: ["pallet_inventory_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventory_overview"
            referencedColumns: ["pallet_inventory_id"]
          },
        ]
      }
      order_ticket_items: {
        Row: {
          fulfilled_boxes: number | null
          fulfilled_units: number | null
          id: string
          item_id: number
          line_total: number | null
          quantity_boxes: number
          quantity_units: number
          ticket_id: string
          unit_cost_at_time: number | null
        }
        Insert: {
          fulfilled_boxes?: number | null
          fulfilled_units?: number | null
          id?: string
          item_id: number
          line_total?: number | null
          quantity_boxes: number
          quantity_units: number
          ticket_id: string
          unit_cost_at_time?: number | null
        }
        Update: {
          fulfilled_boxes?: number | null
          fulfilled_units?: number | null
          id?: string
          item_id?: number
          line_total?: number | null
          quantity_boxes?: number
          quantity_units?: number
          ticket_id?: string
          unit_cost_at_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
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
          delivery_type: string | null
          fulfilled_at: string | null
          has_discrepancy: boolean
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
          title: string | null
          updated_at: string
          warehouse_location_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_type?: string | null
          fulfilled_at?: string | null
          has_discrepancy?: boolean
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
          title?: string | null
          updated_at?: string
          warehouse_location_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_type?: string | null
          fulfilled_at?: string | null
          has_discrepancy?: boolean
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
          title?: string | null
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
      pallet_inventory: {
        Row: {
          box_count: number
          created_at: string
          id: string
          initial_box_count: number
          item_id: number
          pallet_id: string
          pieces_per_box_override: number | null
          purchase_order_item_id: string | null
          updated_at: string
        }
        Insert: {
          box_count: number
          created_at?: string
          id?: string
          initial_box_count: number
          item_id: number
          pallet_id: string
          pieces_per_box_override?: number | null
          purchase_order_item_id?: string | null
          updated_at?: string
        }
        Update: {
          box_count?: number
          created_at?: string
          id?: string
          initial_box_count?: number
          item_id?: number
          pallet_id?: string
          pieces_per_box_override?: number | null
          purchase_order_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pallet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "pallet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inventory_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inventory_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_operations_log: {
        Row: {
          box_count_change: number | null
          created_at: string
          id: string
          item_id: number | null
          notes: string | null
          operation_type: string
          organization_id: string
          pallet_id: string
          performed_by: string
          related_pallet_id: string | null
          related_ticket_id: string | null
        }
        Insert: {
          box_count_change?: number | null
          created_at?: string
          id?: string
          item_id?: number | null
          notes?: string | null
          operation_type: string
          organization_id: string
          pallet_id: string
          performed_by: string
          related_pallet_id?: string | null
          related_ticket_id?: string | null
        }
        Update: {
          box_count_change?: number | null
          created_at?: string
          id?: string
          item_id?: number | null
          notes?: string | null
          operation_type?: string
          organization_id?: string
          pallet_id?: string
          performed_by?: string
          related_pallet_id?: string | null
          related_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_operations_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "pallet_operations_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_operations_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_operations_log_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_operations_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_operations_log_related_pallet_id_fkey"
            columns: ["related_pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_operations_log_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      permission_change_logs: {
        Row: {
          action_type: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_location_id: string | null
          new_value: string | null
          notes: string | null
          organization_id: string
          previous_location_id: string | null
          previous_value: string | null
          source: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_location_id?: string | null
          new_value?: string | null
          notes?: string | null
          organization_id: string
          previous_location_id?: string | null
          previous_value?: string | null
          source?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_location_id?: string | null
          new_value?: string | null
          notes?: string | null
          organization_id?: string
          previous_location_id?: string | null
          previous_value?: string | null
          source?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_change_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_change_logs_new_location_id_fkey"
            columns: ["new_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_change_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_change_logs_previous_location_id_fkey"
            columns: ["previous_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_change_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      po_item_box_configs: {
        Row: {
          box_count: number
          created_at: string
          id: string
          notes: string | null
          pieces_per_box: number
          purchase_order_item_id: string
          total_pieces: number | null
        }
        Insert: {
          box_count: number
          created_at?: string
          id?: string
          notes?: string | null
          pieces_per_box: number
          purchase_order_item_id: string
          total_pieces?: number | null
        }
        Update: {
          box_count?: number
          created_at?: string
          id?: string
          notes?: string | null
          pieces_per_box?: number
          purchase_order_item_id?: string
          total_pieces?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "po_item_box_configs_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          allocated_office_fee: number
          allocated_shipping_fee: number
          cartons: number | null
          cbm: number | null
          cbm_share: number | null
          has_mixed_configs: boolean
          id: string
          item_id: number
          pieces_per_box: number | null
          pieces_per_carton: number | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          total_cost_after: number
          total_price_before: number
          unit_cost_after: number
          unit_price_before: number
        }
        Insert: {
          allocated_office_fee?: number
          allocated_shipping_fee?: number
          cartons?: number | null
          cbm?: number | null
          cbm_share?: number | null
          has_mixed_configs?: boolean
          id?: string
          item_id: number
          pieces_per_box?: number | null
          pieces_per_carton?: number | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          total_cost_after?: number
          total_price_before?: number
          unit_cost_after?: number
          unit_price_before: number
        }
        Update: {
          allocated_office_fee?: number
          allocated_shipping_fee?: number
          cartons?: number | null
          cbm?: number | null
          cbm_share?: number | null
          has_mixed_configs?: boolean
          id?: string
          item_id?: number
          pieces_per_box?: number | null
          pieces_per_carton?: number | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          total_cost_after?: number
          total_price_before?: number
          unit_cost_after?: number
          unit_price_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "item_shipment_breakdown"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_arrival: string | null
          created_at: string
          created_by: string
          expected_arrival: string | null
          id: string
          notes: string | null
          office_fee: number
          order_date: string | null
          organization_id: string
          po_number: string
          shipping_fee: number
          status: string
          subtotal_before: number
          supplier_name: string | null
          total_cbm: number | null
          total_pallets: number | null
          updated_at: string
          warehouse_location_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          created_at?: string
          created_by: string
          expected_arrival?: string | null
          id?: string
          notes?: string | null
          office_fee?: number
          order_date?: string | null
          organization_id: string
          po_number: string
          shipping_fee?: number
          status?: string
          subtotal_before?: number
          supplier_name?: string | null
          total_cbm?: number | null
          total_pallets?: number | null
          updated_at?: string
          warehouse_location_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          created_at?: string
          created_by?: string
          expected_arrival?: string | null
          id?: string
          notes?: string | null
          office_fee?: number
          order_date?: string | null
          organization_id?: string
          po_number?: string
          shipping_fee?: number
          status?: string
          subtotal_before?: number
          supplier_name?: string | null
          total_cbm?: number | null
          total_pallets?: number | null
          updated_at?: string
          warehouse_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      store_purchase_items: {
        Row: {
          id: string
          item_id: number
          line_total: number
          purchase_id: string
          quantity: number
          storage_space_id: string | null
          unit_cost: number
        }
        Insert: {
          id?: string
          item_id: number
          purchase_id: string
          quantity: number
          storage_space_id?: string | null
          unit_cost: number
        }
        Update: {
          id?: string
          item_id?: number
          purchase_id?: string
          quantity?: number
          storage_space_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "store_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchases: {
        Row: {
          created_at: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          purchased_at: string
          purchased_by: string
          supplier_name: string | null
          total_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          purchased_at: string
          purchased_by: string
          supplier_name?: string | null
          total_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          purchased_at?: string
          purchased_by?: string
          supplier_name?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_purchases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_deliveries: {
        Row: {
          actual_cost: number | null
          actual_pallet_count: number | null
          created_at: string
          delivered_at: string | null
          delivered_by: string | null
          delivery_rate_at_time: number
          delivery_type: string
          dispatched_at: string | null
          estimated_cost: number | null
          estimated_pallet_count: number | null
          id: string
          notes: string | null
          payment_status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_pallet_count?: number | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_rate_at_time: number
          delivery_type: string
          dispatched_at?: string | null
          estimated_cost?: number | null
          estimated_pallet_count?: number | null
          id?: string
          notes?: string | null
          payment_status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_pallet_count?: number | null
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_rate_at_time?: number
          delivery_type?: string
          dispatched_at?: string | null
          estimated_cost?: number | null
          estimated_pallet_count?: number | null
          id?: string
          notes?: string | null
          payment_status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_deliveries_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_deliveries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
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
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
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
      user_location_assignments: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      warehouse_expense_rates: {
        Row: {
          default_rate: number
          expense_type: string
          id: string
          is_optional: boolean
          organization_id: string
          rate_unit: string
          updated_at: string
        }
        Insert: {
          default_rate?: number
          expense_type: string
          id?: string
          is_optional?: boolean
          organization_id: string
          rate_unit?: string
          updated_at?: string
        }
        Update: {
          default_rate?: number
          expense_type?: string
          id?: string
          is_optional?: boolean
          organization_id?: string
          rate_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_expense_rates_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          expense_date: string
          expense_type: string
          id: string
          is_self_delivered: boolean | null
          notes: string | null
          organization_id: string
          pallet_count: number | null
          period_end: string | null
          period_start: string | null
          purchase_order_id: string | null
          rate_per_pallet: number | null
          title: string | null
          updated_at: string
          warehouse_location_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          expense_date: string
          expense_type: string
          id?: string
          is_self_delivered?: boolean | null
          notes?: string | null
          organization_id: string
          pallet_count?: number | null
          period_end?: string | null
          period_start?: string | null
          purchase_order_id?: string | null
          rate_per_pallet?: number | null
          title?: string | null
          updated_at?: string
          warehouse_location_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          expense_date?: string
          expense_type?: string
          id?: string
          is_self_delivered?: boolean | null
          notes?: string | null
          organization_id?: string
          pallet_count?: number | null
          period_end?: string | null
          period_start?: string | null
          purchase_order_id?: string | null
          rate_per_pallet?: number | null
          title?: string | null
          updated_at?: string
          warehouse_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_expenses_created_by_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_expenses_location_fk"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_expenses_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_expenses_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "item_shipment_breakdown"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "warehouse_expenses_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_pallets: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          pallet_label: string
          purchase_order_id: string | null
          received_at: string | null
          retired_at: string | null
          status: string
          storage_space_id: string | null
          updated_at: string
          warehouse_location_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          pallet_label: string
          purchase_order_id?: string | null
          received_at?: string | null
          retired_at?: string | null
          status?: string
          storage_space_id?: string | null
          updated_at?: string
          warehouse_location_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          pallet_label?: string
          purchase_order_id?: string | null
          received_at?: string | null
          retired_at?: string | null
          status?: string
          storage_space_id?: string | null
          updated_at?: string
          warehouse_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "item_shipment_breakdown"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "warehouse_pallets_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_rent_snapshots: {
        Row: {
          active_pallet_count: number
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          rate_per_pallet: number
          snapshot_date: string
          total_cost: number
        }
        Insert: {
          active_pallet_count: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          rate_per_pallet: number
          snapshot_date: string
          total_cost: number
        }
        Update: {
          active_pallet_count?: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          rate_per_pallet?: number
          snapshot_date?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_rent_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      delivery_estimation_accuracy: {
        Row: {
          actual_boxes_per_pallet: number | null
          actual_cost: number | null
          actual_pallet_count: number | null
          cost_delta: number | null
          delivered_at: string | null
          delivery_id: string | null
          estimated_cost: number | null
          estimated_pallet_count: number | null
          organization_id: string | null
          pallet_delta: number | null
          requesting_location_id: string | null
          ticket_id: string | null
          total_boxes_delivered: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "ticket_deliveries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      item_box_totals: {
        Row: {
          current_default_per_box: number | null
          current_warehouse_boxes: number | null
          item_id: number | null
          item_name: string | null
          organization_id: string | null
          shipment_count: number | null
          sku: string | null
          total_boxes_received: number | null
          total_pieces_received: number | null
          weighted_avg_per_box: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_shipment_breakdown: {
        Row: {
          actual_arrival: string | null
          config_box_count: number | null
          config_created_at: string | null
          config_id: string | null
          config_notes: string | null
          config_pieces_per_box: number | null
          config_total_pieces: number | null
          has_mixed_configs: boolean | null
          item_id: number | null
          item_name: string | null
          organization_id: string | null
          po_date: string | null
          po_id: string | null
          po_line_total_boxes: number | null
          po_line_total_pieces: number | null
          po_number: string | null
          purchase_order_item_id: string | null
          sku: string | null
          supplier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_item_box_configs_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_inventory_overview: {
        Row: {
          box_count: number | null
          config_source: string | null
          effective_ppb: number | null
          has_mixed_configs: boolean | null
          initial_box_count: number | null
          inventory_created_at: string | null
          inventory_updated_at: string | null
          item_default_ppb: number | null
          item_display_label: string | null
          item_id: number | null
          item_name: string | null
          organization_id: string | null
          pallet_id: string | null
          pallet_inventory_id: string | null
          pallet_label: string | null
          pallet_status: string | null
          pieces_per_box_override: number | null
          po_pieces_per_box: number | null
          purchase_order_id: string | null
          purchase_order_item_id: string | null
          received_at: string | null
          sku: string | null
          storage_space_id: string | null
          total_pieces: number | null
          warehouse_location_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_box_totals"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "pallet_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inventory_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "warehouse_pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_inventory_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "item_shipment_breakdown"
            referencedColumns: ["po_id"]
          },
          {
            foreignKeyName: "warehouse_pallets_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_pallets_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      confirm_delivery: {
        Args: {
          p_actual_pallets: number
          p_admin_user_id: string
          p_notes?: string
          p_ticket_id: string
        }
        Returns: Json
      }
      confirm_order_receipt: {
        Args: { p_received_items: Json; p_ticket_id: string; p_user_id: string }
        Returns: Json
      }
      confirm_self_pickup: {
        Args: { p_admin_user_id: string; p_notes?: string; p_ticket_id: string }
        Returns: Json
      }
      dispatch_order_ticket: {
        Args: {
          p_admin_user_id: string
          p_estimated_pallets?: number
          p_notes?: string
          p_ticket_id: string
        }
        Returns: Json
      }
      fulfill_order_ticket: {
        Args: {
          p_admin_user_id: string
          p_allow_partial: boolean
          p_delivery_type: string
          p_ticket_id: string
        }
        Returns: Json
      }
      fulfill_order_ticket_manual: {
        Args: {
          p_admin_user_id: string
          p_delivery_type?: string
          p_pallet_selection: Json
          p_ticket_id: string
        }
        Returns: Json
      }
      get_daily_summary_data: {
        Args: {
          p_date?: string
          p_locations_to_include?: string[]
          p_organization_id: string
        }
        Returns: Json
      }
      get_delivery_pallet_estimate: {
        Args: { p_organization_id: string; p_total_boxes: number }
        Returns: {
          avg_boxes_per_pallet: number
          confidence: string
          delivery_count: number
          estimated_pallets: number
        }[]
      }
      get_effective_notification_preferences: {
        Args: { p_location_id: string; p_organization_id: string }
        Returns: {
          delivery_mode: string
          low_stock_alerts_enabled: boolean
          notifications_enabled: boolean
          primary_email: string
          quiet_hours_end: string
          quiet_hours_start: string
          secondary_emails: Json
          source: string
          timezone: string
        }[]
      }
      get_effective_pieces_per_box: {
        Args: { p_pallet_inventory_id: string }
        Returns: number
      }
      get_item_shipment_history: {
        Args: { p_item_id: number; p_organization_id: string }
        Returns: Json
      }
      get_jwt_debug: { Args: never; Returns: Json }
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
      get_reorder_alerts: {
        Args: {
          p_buffer_days?: number
          p_lead_time_days?: number
          p_organization_id: string
        }
        Returns: {
          avg_weekly_units: number
          current_warehouse_stock: number
          item_id: number
          item_name: string
          item_sku: string
          urgency: string
          weeks_remaining: number
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
      get_user_role: { Args: { user_id: string }; Returns: string }
      get_warehouse_burn_rates: {
        Args: { p_days_lookback?: number; p_organization_id: string }
        Returns: {
          avg_weekly_units: number
          current_warehouse_stock: number
          item_id: number
          item_name: string
          item_sku: string
          weeks_remaining: number
        }[]
      }
      is_admin_or_above: { Args: never; Returns: boolean }
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
      move_boxes_between_pallets: {
        Args: {
          p_box_count: number
          p_item_id: number
          p_source_pallet_id: string
          p_target_pallet_id: string
          p_user_id: string
        }
        Returns: undefined
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
      recalculate_po_costs: {
        Args: { p_purchase_order_id: string }
        Returns: undefined
      }
      receive_purchase_order: {
        Args: {
          p_purchase_order_id: string
          p_received_items: Json
          p_user_id: string
        }
        Returns: Json
      }
      receive_shipment_to_pallets: {
        Args: {
          p_pallet_assignments: Json
          p_purchase_order_id: string
          p_user_id: string
        }
        Returns: Json
      }
      requesting_user_id: { Args: never; Returns: string }
      take_warehouse_rent_snapshot: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      trigger_scheduled_emails_now: {
        Args: never
        Returns: {
          email_type: string
          organization_id: string
          triggered: boolean
        }[]
      }
      validate_pallet_selection: {
        Args: { p_pallet_selection: Json; p_ticket_id: string }
        Returns: Json
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
