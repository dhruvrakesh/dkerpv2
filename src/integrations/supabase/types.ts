export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      adhesive_coating: {
        Row: {
          created_at: string | null
          deckle: number
          id: string
          item_code: string
          item_name: string
          length: number
          status_adhesive: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          id?: string
          item_code: string
          item_name: string
          length: number
          status_adhesive: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          id?: string
          item_code?: string
          item_name?: string
          length?: number
          status_adhesive?: string
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adhesive_coating_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_adhesive_coating_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "adhesive_coating_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_lamination_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "adhesive_coating_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_slitting_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "adhesive_coating_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "order_punching"
            referencedColumns: ["uiorn"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          token_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          token_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          bpmn_file_id: string | null
          created_at: string
          id: string
          last_activity_at: string
          session_context: Json | null
          session_summary: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bpmn_file_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          session_context?: Json | null
          session_summary?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bpmn_file_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          session_context?: Json | null
          session_summary?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_bpmn_file_id_fkey"
            columns: ["bpmn_file_id"]
            isOneToOne: false
            referencedRelation: "bpmn_files"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          bpmn_file_id: string | null
          completion_tokens: number
          cost_usd: number | null
          created_at: string
          id: string
          metadata: Json | null
          model_used: string
          operation_type: string
          prompt_tokens: number
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          bpmn_file_id?: string | null
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used: string
          operation_type: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          bpmn_file_id?: string | null
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string
          operation_type?: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_bpmn_file_id_fkey"
            columns: ["bpmn_file_id"]
            isOneToOne: false
            referencedRelation: "bpmn_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      artwork_upload: {
        Row: {
          ai_prompt: string | null
          artwork_file: string | null
          artwork_notes: string | null
          brand_sku_ref: string | null
          created_at: string | null
          dieline_spec: string | null
          id: string
        }
        Insert: {
          ai_prompt?: string | null
          artwork_file?: string | null
          artwork_notes?: string | null
          brand_sku_ref?: string | null
          created_at?: string | null
          dieline_spec?: string | null
          id?: string
        }
        Update: {
          ai_prompt?: string | null
          artwork_file?: string | null
          artwork_notes?: string | null
          brand_sku_ref?: string | null
          created_at?: string | null
          dieline_spec?: string | null
          id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          admin_version_data: Json | null
          bill_data: Json
          bill_date: string
          bill_number: string
          client_version_data: Json | null
          company_gstin: string | null
          company_state_code: string | null
          created_at: string
          file_path: string | null
          generated_by: string | null
          id: string
          invoice_amount_words: string | null
          invoice_number: string | null
          invoice_type: string | null
          irn: string | null
          order_id: string
          party_gstin: string | null
          party_state_code: string | null
          place_of_supply: string | null
          qr_code_data: string | null
          reverse_charge: boolean | null
          round_off_amount: number | null
          status: string
          template_id: string | null
          total_cgst_amount: number | null
          total_igst_amount: number | null
          total_sgst_amount: number | null
          total_taxable_amount: number | null
          updated_at: string
        }
        Insert: {
          admin_version_data?: Json | null
          bill_data?: Json
          bill_date?: string
          bill_number: string
          client_version_data?: Json | null
          company_gstin?: string | null
          company_state_code?: string | null
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          invoice_amount_words?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          irn?: string | null
          order_id: string
          party_gstin?: string | null
          party_state_code?: string | null
          place_of_supply?: string | null
          qr_code_data?: string | null
          reverse_charge?: boolean | null
          round_off_amount?: number | null
          status?: string
          template_id?: string | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_taxable_amount?: number | null
          updated_at?: string
        }
        Update: {
          admin_version_data?: Json | null
          bill_data?: Json
          bill_date?: string
          bill_number?: string
          client_version_data?: Json | null
          company_gstin?: string | null
          company_state_code?: string | null
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          invoice_amount_words?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          irn?: string | null
          order_id?: string
          party_gstin?: string | null
          party_state_code?: string | null
          place_of_supply?: string | null
          qr_code_data?: string | null
          reverse_charge?: boolean | null
          round_off_amount?: number | null
          status?: string
          template_id?: string | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_taxable_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dkegl_invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bpmn_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bpmn_templates: {
        Row: {
          bpmn_xml: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          tags: string[] | null
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bpmn_xml: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bpmn_xml?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_mockup_estimate: {
        Row: {
          brand_sku_ref: string | null
          cost_per_kg: number | null
          cost_per_sqm: number | null
          created_at: string | null
          estimated_area_sqcm: number | null
          estimated_weight_gsm: number | null
          id: string
          mockup_file: string | null
          mockup_type: string | null
          notes: string | null
          roll_width_mm: number | null
          total_cost_estimate: number | null
          unit_yield_sq_m_per_kg: number | null
        }
        Insert: {
          brand_sku_ref?: string | null
          cost_per_kg?: number | null
          cost_per_sqm?: number | null
          created_at?: string | null
          estimated_area_sqcm?: number | null
          estimated_weight_gsm?: number | null
          id?: string
          mockup_file?: string | null
          mockup_type?: string | null
          notes?: string | null
          roll_width_mm?: number | null
          total_cost_estimate?: number | null
          unit_yield_sq_m_per_kg?: number | null
        }
        Update: {
          brand_sku_ref?: string | null
          cost_per_kg?: number | null
          cost_per_sqm?: number | null
          created_at?: string | null
          estimated_area_sqcm?: number | null
          estimated_weight_gsm?: number | null
          id?: string
          mockup_file?: string | null
          mockup_type?: string | null
          notes?: string | null
          roll_width_mm?: number | null
          total_cost_estimate?: number | null
          unit_yield_sq_m_per_kg?: number | null
        }
        Relationships: []
      }
      csv_upload_log: {
        Row: {
          created_at: string | null
          error_rows: number
          errors: Json | null
          file_name: string
          file_type: string
          id: string
          success_rows: number
          total_rows: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_rows: number
          errors?: Json | null
          file_name: string
          file_type: string
          id?: string
          success_rows: number
          total_rows: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_rows?: number
          errors?: Json | null
          file_name?: string
          file_type?: string
          id?: string
          success_rows?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_stock_snapshots: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          record_count: number
          snapshot_data: Json
          snapshot_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          record_count?: number
          snapshot_data: Json
          snapshot_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          record_count?: number
          snapshot_data?: Json
          snapshot_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      dkegl_adhesive_coating: {
        Row: {
          created_at: string | null
          deckle: number
          id: string
          item_code: string
          item_name: string
          length: number
          status_adhesive: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          id?: string
          item_code: string
          item_name: string
          length: number
          status_adhesive: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          id?: string
          item_code?: string
          item_name?: string
          length?: number
          status_adhesive?: string
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          token_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          token_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dkegl_ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_ai_chat_sessions: {
        Row: {
          context_data: Json | null
          context_type: string
          created_at: string
          id: string
          last_activity_at: string | null
          organization_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          context_type?: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_data?: Json | null
          context_type?: string
          created_at?: string
          id?: string
          last_activity_at?: string | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_ai_chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_ai_usage_logs: {
        Row: {
          completion_tokens: number
          cost_usd: number | null
          created_at: string
          id: string
          metadata: Json | null
          model_used: string
          operation_type: string
          organization_id: string | null
          prompt_tokens: number
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used: string
          operation_type: string
          organization_id?: string | null
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string
          operation_type?: string
          organization_id?: string | null
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_ai_usage_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dkegl_ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_artwork: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artwork_name: string
          artwork_type: string
          created_at: string
          created_by: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          order_id: string | null
          organization_id: string | null
          status: string
          updated_at: string
          version_number: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_name: string
          artwork_type: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          version_number?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artwork_name?: string
          artwork_type?: string
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_artwork_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_artwork_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_artwork_versions: {
        Row: {
          artwork_id: string | null
          changes_summary: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          version_number: number
        }
        Insert: {
          artwork_id?: string | null
          changes_summary?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          version_number: number
        }
        Update: {
          artwork_id?: string | null
          changes_summary?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_artwork_versions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "dkegl_artwork"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_bom_components: {
        Row: {
          bom_master_id: string
          component_item_code: string
          component_notes: string | null
          consumption_type: string | null
          created_at: string
          id: string
          is_critical: boolean | null
          material_category: string | null
          organization_id: string
          quantity_per_unit: number
          stage_id: string | null
          stage_sequence: number | null
          substitute_items: Json | null
          uom: string | null
          updated_at: string
          waste_percentage: number | null
        }
        Insert: {
          bom_master_id: string
          component_item_code: string
          component_notes?: string | null
          consumption_type?: string | null
          created_at?: string
          id?: string
          is_critical?: boolean | null
          material_category?: string | null
          organization_id: string
          quantity_per_unit?: number
          stage_id?: string | null
          stage_sequence?: number | null
          substitute_items?: Json | null
          uom?: string | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Update: {
          bom_master_id?: string
          component_item_code?: string
          component_notes?: string | null
          consumption_type?: string | null
          created_at?: string
          id?: string
          is_critical?: boolean | null
          material_category?: string | null
          organization_id?: string
          quantity_per_unit?: number
          stage_id?: string | null
          stage_sequence?: number | null
          substitute_items?: Json | null
          uom?: string | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_bom_components_bom_master_id_fkey"
            columns: ["bom_master_id"]
            isOneToOne: false
            referencedRelation: "dkegl_bom_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_bom_components_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_bom_master: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bom_notes: string | null
          bom_version: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          item_code: string
          organization_id: string
          scrap_percentage: number | null
          total_labor_cost: number | null
          total_material_cost: number | null
          total_overhead_cost: number | null
          updated_at: string
          yield_percentage: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bom_notes?: string | null
          bom_version?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          item_code: string
          organization_id: string
          scrap_percentage?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          total_overhead_cost?: number | null
          updated_at?: string
          yield_percentage?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bom_notes?: string | null
          bom_version?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string
          organization_id?: string
          scrap_percentage?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          total_overhead_cost?: number | null
          updated_at?: string
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bom_master_item_code"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_consumable_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_bom_master_item_code"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_fg_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_bom_master_item_code"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_item_master"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_bom_master_item_code"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_rm_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_bom_master_item_code"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_wip_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
        ]
      }
      dkegl_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_cost_analysis: {
        Row: {
          analysis_date: string
          analyzed_by: string | null
          cost_breakdown: Json | null
          created_at: string
          current_market_price: number | null
          efficiency_factor: number | null
          id: string
          item_code: string
          labor_cost: number | null
          margin_percentage: number | null
          material_cost: number | null
          notes: string | null
          organization_id: string | null
          overhead_cost: number | null
          production_volume: number | null
          selling_price: number | null
          standard_cost: number | null
          total_manufacturing_cost: number | null
          updated_at: string
          waste_percentage: number | null
        }
        Insert: {
          analysis_date?: string
          analyzed_by?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          current_market_price?: number | null
          efficiency_factor?: number | null
          id?: string
          item_code: string
          labor_cost?: number | null
          margin_percentage?: number | null
          material_cost?: number | null
          notes?: string | null
          organization_id?: string | null
          overhead_cost?: number | null
          production_volume?: number | null
          selling_price?: number | null
          standard_cost?: number | null
          total_manufacturing_cost?: number | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Update: {
          analysis_date?: string
          analyzed_by?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          current_market_price?: number | null
          efficiency_factor?: number | null
          id?: string
          item_code?: string
          labor_cost?: number | null
          margin_percentage?: number | null
          material_cost?: number | null
          notes?: string | null
          organization_id?: string | null
          overhead_cost?: number | null
          production_volume?: number | null
          selling_price?: number | null
          standard_cost?: number | null
          total_manufacturing_cost?: number | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_cost_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_cylinder_maintenance: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string
          cylinder_id: string | null
          id: string
          maintenance_notes: string | null
          maintenance_type: string
          organization_id: string | null
          performed_by: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          cylinder_id?: string | null
          id?: string
          maintenance_notes?: string | null
          maintenance_type: string
          organization_id?: string | null
          performed_by?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          cylinder_id?: string | null
          id?: string
          maintenance_notes?: string | null
          maintenance_type?: string
          organization_id?: string | null
          performed_by?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_cylinder_maintenance_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "dkegl_cylinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_cylinder_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_cylinders: {
        Row: {
          artwork_id: string | null
          created_at: string
          cylinder_code: string
          cylinder_type: string
          diameter: number | null
          id: string
          last_used_date: string | null
          length: number | null
          location: string | null
          maintenance_due_date: string | null
          number_of_colors: number | null
          organization_id: string | null
          specifications: Json | null
          status: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          artwork_id?: string | null
          created_at?: string
          cylinder_code: string
          cylinder_type: string
          diameter?: number | null
          id?: string
          last_used_date?: string | null
          length?: number | null
          location?: string | null
          maintenance_due_date?: string | null
          number_of_colors?: number | null
          organization_id?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          artwork_id?: string | null
          created_at?: string
          cylinder_code?: string
          cylinder_type?: string
          diameter?: number | null
          id?: string
          last_used_date?: string | null
          length?: number | null
          location?: string | null
          maintenance_due_date?: string | null
          number_of_colors?: number | null
          organization_id?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_cylinders_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "dkegl_artwork"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_cylinders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_daily_stock_snapshots: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          record_count: number
          snapshot_data: Json
          snapshot_date: string
          total_value: number | null
          updated_at: string
          variance_analysis: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          record_count?: number
          snapshot_data: Json
          snapshot_date: string
          total_value?: number | null
          updated_at?: string
          variance_analysis?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          record_count?: number
          snapshot_data?: Json
          snapshot_date?: string
          total_value?: number | null
          updated_at?: string
          variance_analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_daily_stock_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_data_quality_metrics: {
        Row: {
          accuracy_score: number | null
          completeness_score: number | null
          consistency_score: number | null
          created_at: string | null
          duplicate_values: number | null
          empty_fields: number | null
          id: string
          invalid_formats: number | null
          organization_id: string | null
          outliers_detected: number | null
          overall_quality_score: number | null
          quality_issues: Json | null
          recommendations: Json | null
          total_fields: number | null
          upload_session_id: string | null
          validity_score: number | null
        }
        Insert: {
          accuracy_score?: number | null
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string | null
          duplicate_values?: number | null
          empty_fields?: number | null
          id?: string
          invalid_formats?: number | null
          organization_id?: string | null
          outliers_detected?: number | null
          overall_quality_score?: number | null
          quality_issues?: Json | null
          recommendations?: Json | null
          total_fields?: number | null
          upload_session_id?: string | null
          validity_score?: number | null
        }
        Update: {
          accuracy_score?: number | null
          completeness_score?: number | null
          consistency_score?: number | null
          created_at?: string | null
          duplicate_values?: number | null
          empty_fields?: number | null
          id?: string
          invalid_formats?: number | null
          organization_id?: string | null
          outliers_detected?: number | null
          overall_quality_score?: number | null
          quality_issues?: Json | null
          recommendations?: Json | null
          total_fields?: number | null
          upload_session_id?: string | null
          validity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_data_quality_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_data_quality_metrics_upload_session_id_fkey"
            columns: ["upload_session_id"]
            isOneToOne: false
            referencedRelation: "dkegl_upload_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_eligible_adhesive_coating_uiorns: {
        Row: {
          deckle: number | null
          item_code: string | null
          item_name: string | null
          length: number | null
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string | null
        }
        Insert: {
          deckle?: number | null
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string | null
        }
        Update: {
          deckle?: number | null
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string | null
        }
        Relationships: []
      }
      dkegl_eligible_lamination_uiorns: {
        Row: {
          item_name: string | null
          uiorn: string | null
        }
        Insert: {
          item_name?: string | null
          uiorn?: string | null
        }
        Update: {
          item_name?: string | null
          uiorn?: string | null
        }
        Relationships: []
      }
      dkegl_eligible_slitting_uiorns: {
        Row: {
          deckle: number | null
          item_code: string | null
          item_name: string | null
          length: number | null
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string | null
        }
        Insert: {
          deckle?: number | null
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string | null
        }
        Update: {
          deckle?: number | null
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string | null
        }
        Relationships: []
      }
      dkegl_error_log: {
        Row: {
          context: Json | null
          created_at: string | null
          error_code: string | null
          error_message: string
          error_type: string
          id: string
          organization_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message: string
          error_type: string
          id?: string
          organization_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          error_type?: string
          id?: string
          organization_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_error_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_gravure_printing: {
        Row: {
          created_at: string | null
          deckle: number | null
          id: string
          item_code: string | null
          item_name: string | null
          length: number | null
          status_gravure: string
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_gravure: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_gravure?: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_grn_audit_log: {
        Row: {
          action: string
          created_at: string | null
          grn_id: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          grn_id: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          grn_id?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_grn_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_grn_log: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          grn_number: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          item_code: string
          organization_id: string | null
          qty_received: number
          quality_status:
            | Database["public"]["Enums"]["dkegl_quality_status"]
            | null
          remarks: string | null
          supplier_name: string | null
          total_amount: number | null
          unit_rate: number | null
          uom: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          grn_number: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_code: string
          organization_id?: string | null
          qty_received: number
          quality_status?:
            | Database["public"]["Enums"]["dkegl_quality_status"]
            | null
          remarks?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          unit_rate?: number | null
          uom: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          grn_number?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          item_code?: string
          organization_id?: string | null
          qty_received?: number
          quality_status?:
            | Database["public"]["Enums"]["dkegl_quality_status"]
            | null
          remarks?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          unit_rate?: number | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_grn_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grn_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_consumable_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_grn_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_fg_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_grn_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_item_master"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_grn_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_rm_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_grn_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_wip_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
        ]
      }
      dkegl_grn_operations_audit: {
        Row: {
          affected_records: number | null
          after_values: Json | null
          before_values: Json | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_count: number | null
          errors: Json | null
          id: string
          ip_address: unknown | null
          operation_data: Json | null
          operation_id: string | null
          operation_type: string
          organization_id: string | null
          risk_factors: Json | null
          risk_level: string | null
          session_id: string | null
          started_at: string | null
          success_count: number | null
          user_agent: string | null
          user_id: string
          warning_count: number | null
          warnings: Json | null
        }
        Insert: {
          affected_records?: number | null
          after_values?: Json | null
          before_values?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          ip_address?: unknown | null
          operation_data?: Json | null
          operation_id?: string | null
          operation_type: string
          organization_id?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          session_id?: string | null
          started_at?: string | null
          success_count?: number | null
          user_agent?: string | null
          user_id: string
          warning_count?: number | null
          warnings?: Json | null
        }
        Update: {
          affected_records?: number | null
          after_values?: Json | null
          before_values?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          ip_address?: unknown | null
          operation_data?: Json | null
          operation_id?: string | null
          operation_type?: string
          organization_id?: string | null
          risk_factors?: Json | null
          risk_level?: string | null
          session_id?: string | null
          started_at?: string | null
          success_count?: number | null
          user_agent?: string | null
          user_id?: string
          warning_count?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_grn_operations_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_grn_staging: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          date: string
          duplicate_reason: string | null
          existing_record_id: string | null
          grn_number: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          is_duplicate: boolean | null
          item_code: string
          organization_id: string | null
          processed_at: string | null
          processing_status: string | null
          qty_received: number
          quality_status: string | null
          remarks: string | null
          source_file_name: string | null
          source_row_number: number | null
          supplier_name: string | null
          total_amount: number | null
          unit_rate: number | null
          uom: string | null
          updated_at: string | null
          upload_session_id: string
          validation_errors: Json | null
          validation_status: string | null
          validation_warnings: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          duplicate_reason?: string | null
          existing_record_id?: string | null
          grn_number: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_duplicate?: boolean | null
          item_code: string
          organization_id?: string | null
          processed_at?: string | null
          processing_status?: string | null
          qty_received: number
          quality_status?: string | null
          remarks?: string | null
          source_file_name?: string | null
          source_row_number?: number | null
          supplier_name?: string | null
          total_amount?: number | null
          unit_rate?: number | null
          uom?: string | null
          updated_at?: string | null
          upload_session_id: string
          validation_errors?: Json | null
          validation_status?: string | null
          validation_warnings?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          duplicate_reason?: string | null
          existing_record_id?: string | null
          grn_number?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_duplicate?: boolean | null
          item_code?: string
          organization_id?: string | null
          processed_at?: string | null
          processing_status?: string | null
          qty_received?: number
          quality_status?: string | null
          remarks?: string | null
          source_file_name?: string | null
          source_row_number?: number | null
          supplier_name?: string | null
          total_amount?: number | null
          unit_rate?: number | null
          uom?: string | null
          updated_at?: string | null
          upload_session_id?: string
          validation_errors?: Json | null
          validation_status?: string | null
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_grn_staging_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_gst_compliance: {
        Row: {
          compliance_month: number
          compliance_score: number | null
          compliance_year: number
          created_at: string | null
          due_date: string
          filed_date: string | null
          filing_status: string | null
          id: string
          interest_paid: number | null
          late_fee_paid: number | null
          organization_id: string | null
          penalty_paid: number | null
          return_type: string
          updated_at: string | null
        }
        Insert: {
          compliance_month: number
          compliance_score?: number | null
          compliance_year: number
          created_at?: string | null
          due_date: string
          filed_date?: string | null
          filing_status?: string | null
          id?: string
          interest_paid?: number | null
          late_fee_paid?: number | null
          organization_id?: string | null
          penalty_paid?: number | null
          return_type: string
          updated_at?: string | null
        }
        Update: {
          compliance_month?: number
          compliance_score?: number | null
          compliance_year?: number
          created_at?: string | null
          due_date?: string
          filed_date?: string | null
          filing_status?: string | null
          id?: string
          interest_paid?: number | null
          late_fee_paid?: number | null
          organization_id?: string | null
          penalty_paid?: number | null
          return_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_gst_compliance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_gst_rates: {
        Row: {
          cess_rate: number | null
          cgst_rate: number
          created_at: string | null
          effective_from: string
          effective_until: string | null
          gst_rate: number
          hsn_code: string
          id: string
          igst_rate: number
          is_active: boolean | null
          organization_id: string | null
          sgst_rate: number
          updated_at: string | null
        }
        Insert: {
          cess_rate?: number | null
          cgst_rate?: number
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          gst_rate?: number
          hsn_code: string
          id?: string
          igst_rate?: number
          is_active?: boolean | null
          organization_id?: string | null
          sgst_rate?: number
          updated_at?: string | null
        }
        Update: {
          cess_rate?: number | null
          cgst_rate?: number
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          gst_rate?: number
          hsn_code?: string
          id?: string
          igst_rate?: number
          is_active?: boolean | null
          organization_id?: string | null
          sgst_rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_gst_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_gst_summary: {
        Row: {
          created_at: string | null
          document_id: string
          document_type: string
          grand_total: number | null
          id: string
          organization_id: string | null
          round_off_amount: number | null
          total_cess_amount: number | null
          total_cgst_amount: number | null
          total_igst_amount: number | null
          total_sgst_amount: number | null
          total_tax_amount: number | null
          total_taxable_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          document_type: string
          grand_total?: number | null
          id?: string
          organization_id?: string | null
          round_off_amount?: number | null
          total_cess_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          total_taxable_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          document_type?: string
          grand_total?: number | null
          id?: string
          organization_id?: string | null
          round_off_amount?: number | null
          total_cess_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          total_taxable_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_gst_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_gst_transactions: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          created_at: string | null
          gst_rate: number
          hsn_code: string
          id: string
          igst_amount: number | null
          invoice_date: string
          invoice_number: string
          item_code: string | null
          organization_id: string | null
          party_gstin: string | null
          party_name: string
          place_of_supply: string
          reverse_charge: boolean | null
          sgst_amount: number | null
          taxable_amount: number
          total_amount: number
          total_tax_amount: number | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string | null
          gst_rate?: number
          hsn_code: string
          id?: string
          igst_amount?: number | null
          invoice_date: string
          invoice_number: string
          item_code?: string | null
          organization_id?: string | null
          party_gstin?: string | null
          party_name: string
          place_of_supply: string
          reverse_charge?: boolean | null
          sgst_amount?: number | null
          taxable_amount?: number
          total_amount?: number
          total_tax_amount?: number | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string | null
          gst_rate?: number
          hsn_code?: string
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_number?: string
          item_code?: string | null
          organization_id?: string | null
          party_gstin?: string | null
          party_name?: string
          place_of_supply?: string
          reverse_charge?: boolean | null
          sgst_amount?: number | null
          taxable_amount?: number
          total_amount?: number
          total_tax_amount?: number | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_gst_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_hsn_tax_rates: {
        Row: {
          cess_rate: number | null
          cgst_rate: number | null
          commodity_description: string | null
          created_at: string | null
          effective_from: string | null
          effective_until: string | null
          hsn_code: string
          id: string
          igst_rate: number | null
          is_active: boolean | null
          organization_id: string | null
          sgst_rate: number | null
          updated_at: string | null
        }
        Insert: {
          cess_rate?: number | null
          cgst_rate?: number | null
          commodity_description?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          hsn_code: string
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          organization_id?: string | null
          sgst_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          cess_rate?: number | null
          cgst_rate?: number | null
          commodity_description?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          hsn_code?: string
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          organization_id?: string | null
          sgst_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_hsn_tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_invoice_line_items: {
        Row: {
          bill_id: string
          cgst_amount: number | null
          cgst_rate: number | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          item_code: string | null
          item_name: string
          line_sequence: number | null
          organization_id: string
          quantity: number
          sgst_amount: number | null
          sgst_rate: number | null
          taxable_amount: number
          total_amount: number
          unit_rate: number
          updated_at: string | null
        }
        Insert: {
          bill_id: string
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          item_code?: string | null
          item_name: string
          line_sequence?: number | null
          organization_id: string
          quantity?: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_amount: number
          total_amount: number
          unit_rate: number
          updated_at?: string | null
        }
        Update: {
          bill_id?: string
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          item_code?: string | null
          item_name?: string
          line_sequence?: number | null
          organization_id?: string
          quantity?: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_amount?: number
          total_amount?: number
          unit_rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_invoice_line_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_invoice_sequences: {
        Row: {
          created_at: string | null
          current_number: number | null
          financial_year: string
          id: string
          organization_id: string | null
          prefix: string
          sequence_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_number?: number | null
          financial_year: string
          id?: string
          organization_id?: string | null
          prefix: string
          sequence_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_number?: number | null
          financial_year?: string
          id?: string
          organization_id?: string | null
          prefix?: string
          sequence_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_invoice_templates: {
        Row: {
          created_at: string | null
          footer_config: Json | null
          header_config: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          layout_config: Json | null
          organization_id: string
          template_name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json | null
          organization_id: string
          template_name: string
          template_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          footer_config?: Json | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_config?: Json | null
          organization_id?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_issue_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          issue_id: string
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          issue_id: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          issue_id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_issue_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_issue_log: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          date: string
          department: string | null
          id: string
          issue_number: string
          item_code: string
          job_order_ref: string | null
          organization_id: string | null
          purpose: string | null
          qty_issued: number
          remarks: string | null
          requested_by: string | null
          uom: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          department?: string | null
          id?: string
          issue_number: string
          item_code: string
          job_order_ref?: string | null
          organization_id?: string | null
          purpose?: string | null
          qty_issued: number
          remarks?: string | null
          requested_by?: string | null
          uom: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          department?: string | null
          id?: string
          issue_number?: string
          item_code?: string
          job_order_ref?: string | null
          organization_id?: string | null
          purpose?: string | null
          qty_issued?: number
          remarks?: string | null
          requested_by?: string | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_issue_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_issue_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_consumable_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_issue_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_fg_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_issue_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_item_master"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_issue_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_rm_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_issue_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_wip_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
        ]
      }
      dkegl_item_master: {
        Row: {
          artwork_reference: string | null
          bom_structure: Json | null
          category_id: string | null
          created_at: string
          dimensions: Json | null
          exemption_reason: string | null
          gst_applicable: boolean | null
          hsn_code: string | null
          id: string
          item_code: string
          item_name: string
          item_type: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days: number | null
          material_properties: Json | null
          organization_id: string | null
          parent_item_code: string | null
          pricing_info: Json | null
          quality_parameters: Json | null
          quality_specs: Json | null
          reorder_level: number | null
          reorder_quantity: number | null
          specification_reference: string | null
          specifications: Json | null
          status: string | null
          storage_location: string | null
          supplier_info: Json | null
          technical_specs: Json | null
          uom: string
          updated_at: string
          weight_per_unit: number | null
        }
        Insert: {
          artwork_reference?: string | null
          bom_structure?: Json | null
          category_id?: string | null
          created_at?: string
          dimensions?: Json | null
          exemption_reason?: string | null
          gst_applicable?: boolean | null
          hsn_code?: string | null
          id?: string
          item_code: string
          item_name: string
          item_type?: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days?: number | null
          material_properties?: Json | null
          organization_id?: string | null
          parent_item_code?: string | null
          pricing_info?: Json | null
          quality_parameters?: Json | null
          quality_specs?: Json | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          specification_reference?: string | null
          specifications?: Json | null
          status?: string | null
          storage_location?: string | null
          supplier_info?: Json | null
          technical_specs?: Json | null
          uom?: string
          updated_at?: string
          weight_per_unit?: number | null
        }
        Update: {
          artwork_reference?: string | null
          bom_structure?: Json | null
          category_id?: string | null
          created_at?: string
          dimensions?: Json | null
          exemption_reason?: string | null
          gst_applicable?: boolean | null
          hsn_code?: string | null
          id?: string
          item_code?: string
          item_name?: string
          item_type?: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days?: number | null
          material_properties?: Json | null
          organization_id?: string | null
          parent_item_code?: string | null
          pricing_info?: Json | null
          quality_parameters?: Json | null
          quality_specs?: Json | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          specification_reference?: string | null
          specifications?: Json | null
          status?: string | null
          storage_location?: string | null
          supplier_info?: Json | null
          technical_specs?: Json | null
          uom?: string
          updated_at?: string
          weight_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_item_specifications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          item_code: string
          organization_id: string | null
          specification_data: Json
          specification_type: string
          updated_at: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_code: string
          organization_id?: string | null
          specification_data?: Json
          specification_type: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string
          organization_id?: string | null
          specification_data?: Json
          specification_type?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_item_code_fkey"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_consumable_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_item_code_fkey"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_fg_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_item_code_fkey"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_item_master"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_item_code_fkey"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_rm_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "dkegl_item_specifications_organization_id_item_code_fkey"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_wip_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
        ]
      }
      dkegl_lamination: {
        Row: {
          created_at: string | null
          deckle: number | null
          id: string
          item_code: string | null
          item_name: string | null
          length: number | null
          status_lamination: string
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_lamination: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_lamination?: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_master_data: {
        Row: {
          "Coil_Width (mm)": number | null
          "Deckle (mm)": string | null
          gsm: string | null
          item_code: string
          item_name: string | null
          party_name: string | null
          product_category: string | null
          specs: string | null
          substrate: string | null
          thickness: string | null
          "Total GSM": number | null
        }
        Insert: {
          "Coil_Width (mm)"?: number | null
          "Deckle (mm)"?: string | null
          gsm?: string | null
          item_code: string
          item_name?: string | null
          party_name?: string | null
          product_category?: string | null
          specs?: string | null
          substrate?: string | null
          thickness?: string | null
          "Total GSM"?: number | null
        }
        Update: {
          "Coil_Width (mm)"?: number | null
          "Deckle (mm)"?: string | null
          gsm?: string | null
          item_code?: string
          item_name?: string | null
          party_name?: string | null
          product_category?: string | null
          specs?: string | null
          substrate?: string | null
          thickness?: string | null
          "Total GSM"?: number | null
        }
        Relationships: []
      }
      dkegl_material_consumption: {
        Row: {
          actual_quantity: number
          consumption_date: string | null
          created_at: string | null
          id: string
          item_code: string
          notes: string | null
          order_id: string | null
          organization_id: string | null
          planned_quantity: number
          stage_id: string | null
          total_cost: number
          unit_cost: number
          updated_at: string | null
          waste_quantity: number
          workflow_progress_id: string | null
        }
        Insert: {
          actual_quantity?: number
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          item_code: string
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          planned_quantity?: number
          stage_id?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string | null
          waste_quantity?: number
          workflow_progress_id?: string | null
        }
        Update: {
          actual_quantity?: number
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          item_code?: string
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          planned_quantity?: number
          stage_id?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string | null
          waste_quantity?: number
          workflow_progress_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_material_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_material_consumption_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_material_consumption_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_material_consumption_workflow_progress_id_fkey"
            columns: ["workflow_progress_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_material_flow_log: {
        Row: {
          cost_impact: number | null
          created_at: string
          id: string
          item_code: string
          lot_number: string | null
          order_id: string
          organization_id: string
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          running_balance: number
          stage_id: string
          transaction_reason: string | null
          transaction_type: string
          unit_cost: number
          user_id: string | null
          workflow_progress_id: string
        }
        Insert: {
          cost_impact?: number | null
          created_at?: string
          id?: string
          item_code: string
          lot_number?: string | null
          order_id: string
          organization_id: string
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance: number
          stage_id: string
          transaction_reason?: string | null
          transaction_type: string
          unit_cost?: number
          user_id?: string | null
          workflow_progress_id: string
        }
        Update: {
          cost_impact?: number | null
          created_at?: string
          id?: string
          item_code?: string
          lot_number?: string | null
          order_id?: string
          organization_id?: string
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
          stage_id?: string
          transaction_reason?: string | null
          transaction_type?: string
          unit_cost?: number
          user_id?: string | null
          workflow_progress_id?: string
        }
        Relationships: []
      }
      dkegl_material_reservations: {
        Row: {
          allocated_at: string | null
          allocated_quantity: number | null
          consumed_at: string | null
          consumed_quantity: number | null
          created_at: string
          created_by: string | null
          id: string
          item_code: string
          order_id: string
          organization_id: string
          released_at: string | null
          reservation_notes: string | null
          reservation_status: string | null
          reserved_at: string | null
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          allocated_at?: string | null
          allocated_quantity?: number | null
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_code: string
          order_id: string
          organization_id: string
          released_at?: string | null
          reservation_notes?: string | null
          reservation_status?: string | null
          reserved_at?: string | null
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          allocated_at?: string | null
          allocated_quantity?: number | null
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_code?: string
          order_id?: string
          organization_id?: string
          released_at?: string | null
          reservation_notes?: string | null
          reservation_status?: string | null
          reserved_at?: string | null
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_material_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_material_transformations: {
        Row: {
          created_at: string
          id: string
          input_material_id: string
          order_id: string
          organization_id: string
          output_material_id: string
          processing_conditions: Json | null
          quality_impact: Json | null
          stage_id: string
          transformation_parameters: Json | null
          transformation_type: string
          waste_percentage: number
          workflow_progress_id: string
          yield_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          input_material_id: string
          order_id: string
          organization_id: string
          output_material_id: string
          processing_conditions?: Json | null
          quality_impact?: Json | null
          stage_id: string
          transformation_parameters?: Json | null
          transformation_type: string
          waste_percentage?: number
          workflow_progress_id: string
          yield_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          input_material_id?: string
          order_id?: string
          organization_id?: string
          output_material_id?: string
          processing_conditions?: Json | null
          quality_impact?: Json | null
          stage_id?: string
          transformation_parameters?: Json | null
          transformation_type?: string
          waste_percentage?: number
          workflow_progress_id?: string
          yield_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_material_transformations_input_material_id_fkey"
            columns: ["input_material_id"]
            isOneToOne: false
            referencedRelation: "dkegl_stage_material_inputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_material_transformations_output_material_id_fkey"
            columns: ["output_material_id"]
            isOneToOne: false
            referencedRelation: "dkegl_stage_material_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_info: Json | null
          delivery_date: string | null
          id: string
          item_code: string
          item_name: string
          order_number: string
          order_quantity: number
          organization_id: string | null
          printing_details: Json | null
          priority_level: number | null
          specifications: Json | null
          status: Database["public"]["Enums"]["dkegl_order_status"] | null
          substrate_details: Json | null
          uiorn: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json | null
          delivery_date?: string | null
          id?: string
          item_code: string
          item_name: string
          order_number: string
          order_quantity: number
          organization_id?: string | null
          printing_details?: Json | null
          priority_level?: number | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["dkegl_order_status"] | null
          substrate_details?: Json | null
          uiorn: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json | null
          delivery_date?: string | null
          id?: string
          item_code?: string
          item_name?: string
          order_number?: string
          order_quantity?: number
          organization_id?: string | null
          printing_details?: Json | null
          priority_level?: number | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["dkegl_order_status"] | null
          substrate_details?: Json | null
          uiorn?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_organizations: {
        Row: {
          address: string | null
          code: string
          contact_details: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_details?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_details?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      dkegl_po_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          delivery_date: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          item_code: string
          item_name: string
          notes: string | null
          organization_id: string | null
          po_id: string | null
          quantity: number
          sgst_amount: number | null
          total_amount: number | null
          total_with_tax: number | null
          unit_price: number
          uom: string | null
          updated_at: string
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          delivery_date?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          item_code: string
          item_name: string
          notes?: string | null
          organization_id?: string | null
          po_id?: string | null
          quantity: number
          sgst_amount?: number | null
          total_amount?: number | null
          total_with_tax?: number | null
          unit_price: number
          uom?: string | null
          updated_at?: string
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          delivery_date?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          item_code?: string
          item_name?: string
          notes?: string | null
          organization_id?: string | null
          po_id?: string | null
          quantity?: number
          sgst_amount?: number | null
          total_amount?: number | null
          total_with_tax?: number | null
          unit_price?: number
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_po_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "dkegl_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_pricing_audit_log: {
        Row: {
          action: string
          business_justification: string | null
          change_reason: string | null
          created_at: string
          id: string
          impact_analysis: Json | null
          ip_address: string | null
          item_code: string
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          pricing_master_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_justification?: string | null
          change_reason?: string | null
          created_at?: string
          id?: string
          impact_analysis?: Json | null
          ip_address?: string | null
          item_code: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          pricing_master_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_justification?: string | null
          change_reason?: string | null
          created_at?: string
          id?: string
          impact_analysis?: Json | null
          ip_address?: string | null
          item_code?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          pricing_master_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_pricing_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_pricing_audit_log_pricing_master_id_fkey"
            columns: ["pricing_master_id"]
            isOneToOne: false
            referencedRelation: "dkegl_pricing_master"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_pricing_hierarchy: {
        Row: {
          base_price: number
          created_at: string
          currency_code: string | null
          customer_tier: string
          discount_percentage: number | null
          effective_from: string
          effective_until: string | null
          final_price: number
          id: string
          is_active: boolean | null
          item_code: string
          market_region: string | null
          max_quantity: number | null
          min_quantity: number
          organization_id: string | null
          pricing_rules: Json | null
          special_conditions: string | null
          updated_at: string
        }
        Insert: {
          base_price: number
          created_at?: string
          currency_code?: string | null
          customer_tier: string
          discount_percentage?: number | null
          effective_from?: string
          effective_until?: string | null
          final_price: number
          id?: string
          is_active?: boolean | null
          item_code: string
          market_region?: string | null
          max_quantity?: number | null
          min_quantity?: number
          organization_id?: string | null
          pricing_rules?: Json | null
          special_conditions?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          currency_code?: string | null
          customer_tier?: string
          discount_percentage?: number | null
          effective_from?: string
          effective_until?: string | null
          final_price?: number
          id?: string
          is_active?: boolean | null
          item_code?: string
          market_region?: string | null
          max_quantity?: number | null
          min_quantity?: number
          organization_id?: string | null
          pricing_rules?: Json | null
          special_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_pricing_hierarchy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_pricing_master: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          current_weighted_avg: number | null
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          item_code: string
          last_grn_price: number | null
          organization_id: string | null
          price_tolerance_percentage: number | null
          pricing_notes: string | null
          standard_cost: number
          updated_at: string
          valuation_method: string
          version_number: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          current_weighted_avg?: number | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          item_code: string
          last_grn_price?: number | null
          organization_id?: string | null
          price_tolerance_percentage?: number | null
          pricing_notes?: string | null
          standard_cost?: number
          updated_at?: string
          valuation_method?: string
          version_number?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          current_weighted_avg?: number | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string
          last_grn_price?: number | null
          organization_id?: string | null
          price_tolerance_percentage?: number | null
          pricing_notes?: string | null
          standard_cost?: number
          updated_at?: string
          valuation_method?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_pricing_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_pricing_variance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_data: Json | null
          alert_severity: string | null
          alert_type: string
          created_at: string
          current_master_price: number | null
          grn_reference: string | null
          id: string
          item_code: string
          new_market_price: number | null
          organization_id: string | null
          resolution_notes: string | null
          status: string | null
          updated_at: string
          variance_percentage: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_data?: Json | null
          alert_severity?: string | null
          alert_type: string
          created_at?: string
          current_master_price?: number | null
          grn_reference?: string | null
          id?: string
          item_code: string
          new_market_price?: number | null
          organization_id?: string | null
          resolution_notes?: string | null
          status?: string | null
          updated_at?: string
          variance_percentage?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_data?: Json | null
          alert_severity?: string | null
          alert_type?: string
          created_at?: string
          current_master_price?: number | null
          grn_reference?: string | null
          id?: string
          item_code?: string
          new_market_price?: number | null
          organization_id?: string | null
          resolution_notes?: string | null
          status?: string | null
          updated_at?: string
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_pricing_variance_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_production_metrics: {
        Row: {
          capacity_utilization: number | null
          completed_orders: number | null
          created_at: string
          date: string
          downtime_hours: number | null
          efficiency_percentage: number | null
          id: string
          metrics_data: Json | null
          on_time_delivery_rate: number | null
          organization_id: string | null
          pending_orders: number | null
          process_name: string
          quality_rejection_rate: number | null
          total_orders: number | null
          updated_at: string
        }
        Insert: {
          capacity_utilization?: number | null
          completed_orders?: number | null
          created_at?: string
          date?: string
          downtime_hours?: number | null
          efficiency_percentage?: number | null
          id?: string
          metrics_data?: Json | null
          on_time_delivery_rate?: number | null
          organization_id?: string | null
          pending_orders?: number | null
          process_name: string
          quality_rejection_rate?: number | null
          total_orders?: number | null
          updated_at?: string
        }
        Update: {
          capacity_utilization?: number | null
          completed_orders?: number | null
          created_at?: string
          date?: string
          downtime_hours?: number | null
          efficiency_percentage?: number | null
          id?: string
          metrics_data?: Json | null
          on_time_delivery_rate?: number | null
          organization_id?: string | null
          pending_orders?: number | null
          process_name?: string
          quality_rejection_rate?: number | null
          total_orders?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_production_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_production_schedule: {
        Row: {
          actual_duration_hours: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_operator: string | null
          created_at: string
          estimated_duration_hours: number | null
          id: string
          machine_allocated: string | null
          notes: string | null
          order_id: string | null
          organization_id: string | null
          priority: number | null
          process_name: string
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          status: Database["public"]["Enums"]["dkegl_process_status"] | null
          updated_at: string
        }
        Insert: {
          actual_duration_hours?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_operator?: string | null
          created_at?: string
          estimated_duration_hours?: number | null
          id?: string
          machine_allocated?: string | null
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          priority?: number | null
          process_name: string
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          status?: Database["public"]["Enums"]["dkegl_process_status"] | null
          updated_at?: string
        }
        Update: {
          actual_duration_hours?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_operator?: string | null
          created_at?: string
          estimated_duration_hours?: number | null
          id?: string
          machine_allocated?: string | null
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          priority?: number | null
          process_name?: string
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          status?: Database["public"]["Enums"]["dkegl_process_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_production_schedule_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_production_schedule_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          expected_delivery_date: string | null
          grand_total_amount: number | null
          id: string
          notes: string | null
          organization_id: string | null
          po_date: string
          po_number: string
          status: string
          subtotal_amount: number | null
          total_amount: number | null
          total_cgst_amount: number | null
          total_igst_amount: number | null
          total_sgst_amount: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_delivery_date?: string | null
          grand_total_amount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          po_date?: string
          po_number: string
          status?: string
          subtotal_amount?: number | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_delivery_date?: string | null
          grand_total_amount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          po_date?: string
          po_number?: string
          status?: string
          subtotal_amount?: number | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "dkegl_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_quality_control: {
        Row: {
          approval_date: string | null
          approval_status: string | null
          approved_by: string | null
          corrective_action: string | null
          created_at: string
          defect_details: string | null
          id: string
          inspection_date: string | null
          inspector_name: string | null
          order_id: string | null
          organization_id: string | null
          process_name: string
          quality_parameters: Json | null
          status: Database["public"]["Enums"]["dkegl_quality_status"] | null
          test_results: Json | null
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          corrective_action?: string | null
          created_at?: string
          defect_details?: string | null
          id?: string
          inspection_date?: string | null
          inspector_name?: string | null
          order_id?: string | null
          organization_id?: string | null
          process_name: string
          quality_parameters?: Json | null
          status?: Database["public"]["Enums"]["dkegl_quality_status"] | null
          test_results?: Json | null
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          corrective_action?: string | null
          created_at?: string
          defect_details?: string | null
          id?: string
          inspection_date?: string | null
          inspector_name?: string | null
          order_id?: string | null
          organization_id?: string | null
          process_name?: string
          quality_parameters?: Json | null
          status?: Database["public"]["Enums"]["dkegl_quality_status"] | null
          test_results?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_quality_control_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_quality_control_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_quality_inspections: {
        Row: {
          corrective_actions: Json | null
          created_at: string
          defects_found: Json | null
          id: string
          inspection_date: string
          inspection_results: Json
          inspector_id: string | null
          order_id: string | null
          organization_id: string | null
          overall_result: string
          remarks: string | null
          stage_id: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          corrective_actions?: Json | null
          created_at?: string
          defects_found?: Json | null
          id?: string
          inspection_date?: string
          inspection_results?: Json
          inspector_id?: string | null
          order_id?: string | null
          organization_id?: string | null
          overall_result: string
          remarks?: string | null
          stage_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          corrective_actions?: Json | null
          created_at?: string
          defects_found?: Json | null
          id?: string
          inspection_date?: string
          inspection_results?: Json
          inspector_id?: string | null
          order_id?: string | null
          organization_id?: string | null
          overall_result?: string
          remarks?: string | null
          stage_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_quality_inspections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_quality_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_quality_inspections_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_quality_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dkegl_quality_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_quality_templates: {
        Row: {
          acceptance_criteria: Json
          check_type:
            | Database["public"]["Enums"]["dkegl_quality_check_type"]
            | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          quality_parameters: Json
          stage_type: string
          template_name: string
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: Json
          check_type?:
            | Database["public"]["Enums"]["dkegl_quality_check_type"]
            | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          quality_parameters?: Json
          stage_type: string
          template_name: string
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: Json
          check_type?:
            | Database["public"]["Enums"]["dkegl_quality_check_type"]
            | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          quality_parameters?: Json
          stage_type?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_quality_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_quote_items: {
        Row: {
          created_at: string | null
          delivery_leadtime_days: number | null
          id: string
          item_notes: string | null
          organization_id: string
          quote_id: string
          quoted_quantity: number
          quoted_unit_price: number
          rfq_item_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_leadtime_days?: number | null
          id?: string
          item_notes?: string | null
          organization_id: string
          quote_id: string
          quoted_quantity?: number
          quoted_unit_price?: number
          rfq_item_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_leadtime_days?: number | null
          id?: string
          item_notes?: string | null
          organization_id?: string
          quote_id?: string
          quoted_quantity?: number
          quoted_unit_price?: number
          rfq_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "dkegl_vendor_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_quote_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "dkegl_rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_rfq: {
        Row: {
          awarded_at: string | null
          awarded_vendor_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string | null
          evaluation_criteria: Json | null
          id: string
          metadata: Json | null
          organization_id: string
          priority_level: string | null
          rfq_number: string
          status: string | null
          submission_deadline: string | null
          terms_conditions: string | null
          title: string
          total_estimated_value: number | null
          updated_at: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_vendor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          evaluation_criteria?: Json | null
          id?: string
          metadata?: Json | null
          organization_id: string
          priority_level?: string | null
          rfq_number: string
          status?: string | null
          submission_deadline?: string | null
          terms_conditions?: string | null
          title: string
          total_estimated_value?: number | null
          updated_at?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_vendor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          evaluation_criteria?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          priority_level?: string | null
          rfq_number?: string
          status?: string | null
          submission_deadline?: string | null
          terms_conditions?: string | null
          title?: string
          total_estimated_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_rfq_items: {
        Row: {
          created_at: string | null
          delivery_requirements: string | null
          estimated_unit_price: number | null
          id: string
          item_code: string
          item_description: string | null
          organization_id: string
          quantity: number
          rfq_id: string
          specifications: string | null
          uom: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_requirements?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_code: string
          item_description?: string | null
          organization_id: string
          quantity?: number
          rfq_id: string
          specifications?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_requirements?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_code?: string
          item_description?: string | null
          organization_id?: string
          quantity?: number
          rfq_id?: string
          specifications?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "dkegl_rfq"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_security_audit_log: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          organization_id: string | null
          risk_level: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dkegl_slitting: {
        Row: {
          created_at: string | null
          deckle: number
          id: string
          item_code: string
          item_name: string
          length: number
          status_slitting: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          id?: string
          item_code: string
          item_name: string
          length: number
          status_slitting: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          id?: string
          item_code?: string
          item_name?: string
          length?: number
          status_slitting?: string
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_stage_cost_breakdown: {
        Row: {
          accounting_period: string | null
          actual_cost: number
          allocation_basis: string | null
          cost_category: string
          cost_center: string | null
          cost_driver: string | null
          cost_subcategory: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          organization_id: string
          planned_cost: number
          stage_id: string
          updated_at: string
          variance_amount: number | null
          variance_percentage: number | null
          workflow_progress_id: string
        }
        Insert: {
          accounting_period?: string | null
          actual_cost?: number
          allocation_basis?: string | null
          cost_category: string
          cost_center?: string | null
          cost_driver?: string | null
          cost_subcategory?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          organization_id: string
          planned_cost?: number
          stage_id: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
          workflow_progress_id: string
        }
        Update: {
          accounting_period?: string | null
          actual_cost?: number
          allocation_basis?: string | null
          cost_category?: string
          cost_center?: string | null
          cost_driver?: string | null
          cost_subcategory?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          organization_id?: string
          planned_cost?: number
          stage_id?: string
          updated_at?: string
          variance_amount?: number | null
          variance_percentage?: number | null
          workflow_progress_id?: string
        }
        Relationships: []
      }
      dkegl_stage_material_categories: {
        Row: {
          category_name: string
          category_type: string
          cost_allocation_method: string | null
          created_at: string
          id: string
          is_required: boolean | null
          organization_id: string
          quality_requirements: Json | null
          stage_id: string
          storage_requirements: Json | null
          typical_consumption_rate: number | null
          updated_at: string
          waste_allowance_percentage: number | null
        }
        Insert: {
          category_name: string
          category_type: string
          cost_allocation_method?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          organization_id: string
          quality_requirements?: Json | null
          stage_id: string
          storage_requirements?: Json | null
          typical_consumption_rate?: number | null
          updated_at?: string
          waste_allowance_percentage?: number | null
        }
        Update: {
          category_name?: string
          category_type?: string
          cost_allocation_method?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          organization_id?: string
          quality_requirements?: Json | null
          stage_id?: string
          storage_requirements?: Json | null
          typical_consumption_rate?: number | null
          updated_at?: string
          waste_allowance_percentage?: number | null
        }
        Relationships: []
      }
      dkegl_stage_material_inputs: {
        Row: {
          actual_quantity: number
          created_at: string
          expiry_date: string | null
          id: string
          input_type: string
          item_code: string
          lot_number: string | null
          material_properties: Json | null
          order_id: string
          organization_id: string
          planned_quantity: number
          quality_status: string | null
          received_date: string | null
          source_stage_id: string | null
          stage_id: string
          supplier_batch: string | null
          total_cost: number | null
          unit_cost: number
          updated_at: string
          workflow_progress_id: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          input_type: string
          item_code: string
          lot_number?: string | null
          material_properties?: Json | null
          order_id: string
          organization_id: string
          planned_quantity?: number
          quality_status?: string | null
          received_date?: string | null
          source_stage_id?: string | null
          stage_id: string
          supplier_batch?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          workflow_progress_id: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          input_type?: string
          item_code?: string
          lot_number?: string | null
          material_properties?: Json | null
          order_id?: string
          organization_id?: string
          planned_quantity?: number
          quality_status?: string | null
          received_date?: string | null
          source_stage_id?: string | null
          stage_id?: string
          supplier_batch?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          workflow_progress_id?: string
        }
        Relationships: []
      }
      dkegl_stage_material_outputs: {
        Row: {
          actual_quantity: number
          created_at: string
          destination_stage_id: string | null
          id: string
          item_code: string
          material_properties: Json | null
          order_id: string
          organization_id: string
          output_type: string
          planned_quantity: number
          quality_grade: string | null
          stage_id: string
          total_cost: number | null
          unit_cost: number
          updated_at: string
          waste_category: string | null
          waste_reason: string | null
          workflow_progress_id: string
          yield_percentage: number | null
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          destination_stage_id?: string | null
          id?: string
          item_code: string
          material_properties?: Json | null
          order_id: string
          organization_id: string
          output_type: string
          planned_quantity?: number
          quality_grade?: string | null
          stage_id: string
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          waste_category?: string | null
          waste_reason?: string | null
          workflow_progress_id: string
          yield_percentage?: number | null
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          destination_stage_id?: string | null
          id?: string
          item_code?: string
          material_properties?: Json | null
          order_id?: string
          organization_id?: string
          output_type?: string
          planned_quantity?: number
          quality_grade?: string | null
          stage_id?: string
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
          waste_category?: string | null
          waste_reason?: string | null
          workflow_progress_id?: string
          yield_percentage?: number | null
        }
        Relationships: []
      }
      dkegl_stage_performance: {
        Row: {
          avg_efficiency_percentage: number | null
          avg_processing_time_hours: number | null
          bottleneck_score: number | null
          created_at: string
          id: string
          orders_processed: number | null
          organization_id: string | null
          performance_date: string
          quality_pass_rate: number | null
          resource_utilization: number | null
          stage_id: string | null
          total_waste_percentage: number | null
          updated_at: string
        }
        Insert: {
          avg_efficiency_percentage?: number | null
          avg_processing_time_hours?: number | null
          bottleneck_score?: number | null
          created_at?: string
          id?: string
          orders_processed?: number | null
          organization_id?: string | null
          performance_date?: string
          quality_pass_rate?: number | null
          resource_utilization?: number | null
          stage_id?: string | null
          total_waste_percentage?: number | null
          updated_at?: string
        }
        Update: {
          avg_efficiency_percentage?: number | null
          avg_processing_time_hours?: number | null
          bottleneck_score?: number | null
          created_at?: string
          id?: string
          orders_processed?: number | null
          organization_id?: string | null
          performance_date?: string
          quality_pass_rate?: number | null
          resource_utilization?: number | null
          stage_id?: string | null
          total_waste_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_stage_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_stage_performance_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_stock: {
        Row: {
          available_qty: number | null
          current_qty: number
          id: string
          item_code: string
          last_transaction_date: string | null
          last_updated: string
          last_valuation_date: string | null
          location: string | null
          opening_qty: number
          organization_id: string | null
          pricing_method: string | null
          reorder_level: number | null
          reserved_qty: number | null
          unit_cost: number | null
          valuation_method: string | null
        }
        Insert: {
          available_qty?: number | null
          current_qty?: number
          id?: string
          item_code: string
          last_transaction_date?: string | null
          last_updated?: string
          last_valuation_date?: string | null
          location?: string | null
          opening_qty?: number
          organization_id?: string | null
          pricing_method?: string | null
          reorder_level?: number | null
          reserved_qty?: number | null
          unit_cost?: number | null
          valuation_method?: string | null
        }
        Update: {
          available_qty?: number | null
          current_qty?: number
          id?: string
          item_code?: string
          last_transaction_date?: string | null
          last_updated?: string
          last_valuation_date?: string | null
          location?: string | null
          opening_qty?: number
          organization_id?: string | null
          pricing_method?: string | null
          reorder_level?: number | null
          reserved_qty?: number | null
          unit_cost?: number | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_stock_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_consumable_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_stock_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_fg_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_stock_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_item_master"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_stock_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_rm_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
          {
            foreignKeyName: "fk_stock_item_master"
            columns: ["organization_id", "item_code"]
            isOneToOne: false
            referencedRelation: "dkegl_wip_items_view"
            referencedColumns: ["organization_id", "item_code"]
          },
        ]
      }
      dkegl_stock_corrections: {
        Row: {
          correction_type: string
          created_at: string | null
          created_by: string | null
          id: string
          item_code: string
          new_location: string | null
          new_qty: number | null
          old_location: string | null
          old_qty: number | null
          organization_id: string
          reason: string | null
          reference_number: string | null
        }
        Insert: {
          correction_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_code: string
          new_location?: string | null
          new_qty?: number | null
          old_location?: string | null
          old_qty?: number | null
          organization_id: string
          reason?: string | null
          reference_number?: string | null
        }
        Update: {
          correction_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_code?: string
          new_location?: string | null
          new_qty?: number | null
          old_location?: string | null
          old_qty?: number | null
          organization_id?: string
          reason?: string | null
          reference_number?: string | null
        }
        Relationships: []
      }
      dkegl_stock_snapshots: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          metadata: Json | null
          organization_id: string | null
          record_count: number
          snapshot_data: Json
          snapshot_date: string
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          record_count?: number
          snapshot_data: Json
          snapshot_date: string
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          record_count?: number
          snapshot_data?: Json
          snapshot_date?: string
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_stock_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_stock_summary: {
        Row: {
          calculated_qty: number | null
          category_name: string | null
          consumption_rate_30d: number | null
          consumption_rate_7d: number | null
          consumption_rate_90d: number | null
          current_qty: number | null
          days_of_cover: number | null
          id: string
          issue_30d: number | null
          issue_7d: number | null
          issue_90d: number | null
          item_code: string
          item_name: string | null
          last_transaction_date: string | null
          last_updated: string
          opening_qty: number | null
          organization_id: string | null
          reorder_level: number | null
          reorder_suggested: boolean | null
          total_grn_qty: number | null
          total_issued_qty: number | null
          variance_qty: number | null
        }
        Insert: {
          calculated_qty?: number | null
          category_name?: string | null
          consumption_rate_30d?: number | null
          consumption_rate_7d?: number | null
          consumption_rate_90d?: number | null
          current_qty?: number | null
          days_of_cover?: number | null
          id?: string
          issue_30d?: number | null
          issue_7d?: number | null
          issue_90d?: number | null
          item_code: string
          item_name?: string | null
          last_transaction_date?: string | null
          last_updated?: string
          opening_qty?: number | null
          organization_id?: string | null
          reorder_level?: number | null
          reorder_suggested?: boolean | null
          total_grn_qty?: number | null
          total_issued_qty?: number | null
          variance_qty?: number | null
        }
        Update: {
          calculated_qty?: number | null
          category_name?: string | null
          consumption_rate_30d?: number | null
          consumption_rate_7d?: number | null
          consumption_rate_90d?: number | null
          current_qty?: number | null
          days_of_cover?: number | null
          id?: string
          issue_30d?: number | null
          issue_7d?: number | null
          issue_90d?: number | null
          item_code?: string
          item_name?: string | null
          last_transaction_date?: string | null
          last_updated?: string
          opening_qty?: number | null
          organization_id?: string | null
          reorder_level?: number | null
          reorder_suggested?: boolean | null
          total_grn_qty?: number | null
          total_issued_qty?: number | null
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_stock_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_tape_orders: {
        Row: {
          created_at: string | null
          deckle: number
          id: string
          item_code: string
          item_name: string
          job_no: number
          length: number
          number_colours: number
          order_entry_date: string
          sr_no: number
          status: string | null
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          id?: string
          item_code: string
          item_name: string
          job_no: number
          length: number
          number_colours: number
          order_entry_date: string
          sr_no: number
          status?: string | null
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          id?: string
          item_code?: string
          item_name?: string
          job_no?: number
          length?: number
          number_colours?: number
          order_entry_date?: string
          sr_no?: number
          status?: string | null
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_tax_calculations: {
        Row: {
          bill_id: string
          created_at: string | null
          id: string
          organization_id: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          taxable_amount: number
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          taxable_amount: number
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          taxable_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_tax_calculations_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_upload_sessions: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          duplicate_rows: number | null
          error_summary: Json | null
          file_hash: string | null
          file_name: string
          file_size: number | null
          id: string
          invalid_rows: number | null
          organization_id: string | null
          processed_rows: number | null
          processing_completed_at: string | null
          processing_duration_ms: number | null
          processing_errors: Json | null
          processing_started_at: string | null
          requires_approval: boolean | null
          session_type: string | null
          status: string | null
          total_rows: number | null
          updated_at: string | null
          upload_duration_ms: number | null
          uploaded_by: string
          valid_rows: number | null
          validation_duration_ms: number | null
          validation_summary: Json | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          duplicate_rows?: number | null
          error_summary?: Json | null
          file_hash?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          invalid_rows?: number | null
          organization_id?: string | null
          processed_rows?: number | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_errors?: Json | null
          processing_started_at?: string | null
          requires_approval?: boolean | null
          session_type?: string | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
          upload_duration_ms?: number | null
          uploaded_by: string
          valid_rows?: number | null
          validation_duration_ms?: number | null
          validation_summary?: Json | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          duplicate_rows?: number | null
          error_summary?: Json | null
          file_hash?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          invalid_rows?: number | null
          organization_id?: string | null
          processed_rows?: number | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_errors?: Json | null
          processing_started_at?: string | null
          requires_approval?: boolean | null
          session_type?: string | null
          status?: string | null
          total_rows?: number | null
          updated_at?: string | null
          upload_duration_ms?: number | null
          uploaded_by?: string
          valid_rows?: number | null
          validation_duration_ms?: number | null
          validation_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_upload_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_user_profiles: {
        Row: {
          contact_number: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["dkegl_user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["dkegl_user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["dkegl_user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_vendor_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dkegl_vendor_performance: {
        Row: {
          average_delivery_days: number | null
          communication_score: number | null
          created_at: string | null
          defect_rate: number | null
          delivery_score: number | null
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_notes: string | null
          id: string
          on_time_deliveries: number | null
          organization_id: string
          overall_score: number | null
          price_variance_percentage: number | null
          pricing_score: number | null
          quality_issues: number | null
          quality_score: number | null
          total_order_value: number | null
          total_orders: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          average_delivery_days?: number | null
          communication_score?: number | null
          created_at?: string | null
          defect_rate?: number | null
          delivery_score?: number | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_notes?: string | null
          id?: string
          on_time_deliveries?: number | null
          organization_id: string
          overall_score?: number | null
          price_variance_percentage?: number | null
          pricing_score?: number | null
          quality_issues?: number | null
          quality_score?: number | null
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          average_delivery_days?: number | null
          communication_score?: number | null
          created_at?: string | null
          defect_rate?: number | null
          delivery_score?: number | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_period_end?: string
          evaluation_period_start?: string
          evaluator_notes?: string | null
          id?: string
          on_time_deliveries?: number | null
          organization_id?: string
          overall_score?: number | null
          price_variance_percentage?: number | null
          pricing_score?: number | null
          quality_issues?: number | null
          quality_score?: number | null
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "dkegl_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_vendor_quotes: {
        Row: {
          attachments: Json | null
          created_at: string | null
          currency_code: string | null
          delivery_terms: string | null
          evaluation_notes: string | null
          evaluation_score: number | null
          id: string
          organization_id: string
          payment_terms: string | null
          quote_number: string | null
          rfq_id: string
          status: string | null
          submission_date: string | null
          total_quote_value: number | null
          updated_at: string | null
          validity_period: number | null
          vendor_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          currency_code?: string | null
          delivery_terms?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          organization_id: string
          payment_terms?: string | null
          quote_number?: string | null
          rfq_id: string
          status?: string | null
          submission_date?: string | null
          total_quote_value?: number | null
          updated_at?: string | null
          validity_period?: number | null
          vendor_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          currency_code?: string | null
          delivery_terms?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          id?: string
          organization_id?: string
          payment_terms?: string | null
          quote_number?: string | null
          rfq_id?: string
          status?: string | null
          submission_date?: string | null
          total_quote_value?: number | null
          updated_at?: string | null
          validity_period?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_vendor_quotes_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "dkegl_rfq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_vendor_quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "dkegl_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_vendors: {
        Row: {
          address: string | null
          address_details: Json | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bank_details: Json | null
          category_id: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          delivery_rating: number | null
          email: string | null
          id: string
          is_active: boolean | null
          last_performance_update: string | null
          organization_id: string | null
          payment_terms: string | null
          performance_rating: number | null
          phone: string | null
          pricing_rating: number | null
          quality_rating: number | null
          supplier_type: string | null
          tax_details: Json | null
          tax_id: string | null
          updated_at: string
          vendor_code: string
          vendor_name: string
        }
        Insert: {
          address?: string | null
          address_details?: Json | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          category_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          delivery_rating?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_performance_update?: string | null
          organization_id?: string | null
          payment_terms?: string | null
          performance_rating?: number | null
          phone?: string | null
          pricing_rating?: number | null
          quality_rating?: number | null
          supplier_type?: string | null
          tax_details?: Json | null
          tax_id?: string | null
          updated_at?: string
          vendor_code: string
          vendor_name: string
        }
        Update: {
          address?: string | null
          address_details?: Json | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json | null
          category_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          delivery_rating?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_performance_update?: string | null
          organization_id?: string | null
          payment_terms?: string | null
          performance_rating?: number | null
          phone?: string | null
          pricing_rating?: number | null
          quality_rating?: number | null
          supplier_type?: string | null
          tax_details?: Json | null
          tax_id?: string | null
          updated_at?: string
          vendor_code?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_waste_tracking: {
        Row: {
          actual_amount: number
          corrective_action: string | null
          cost_impact: number
          created_at: string | null
          id: string
          order_id: string | null
          organization_id: string | null
          planned_amount: number
          recorded_at: string | null
          recorded_by: string | null
          root_cause: string | null
          stage_id: string | null
          waste_amount: number
          waste_category: string
          waste_percentage: number
          waste_type: string
          workflow_progress_id: string | null
        }
        Insert: {
          actual_amount?: number
          corrective_action?: string | null
          cost_impact?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string | null
          planned_amount?: number
          recorded_at?: string | null
          recorded_by?: string | null
          root_cause?: string | null
          stage_id?: string | null
          waste_amount?: number
          waste_category: string
          waste_percentage?: number
          waste_type: string
          workflow_progress_id?: string | null
        }
        Update: {
          actual_amount?: number
          corrective_action?: string | null
          cost_impact?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string | null
          planned_amount?: number
          recorded_at?: string | null
          recorded_by?: string | null
          root_cause?: string | null
          stage_id?: string | null
          waste_amount?: number
          waste_category?: string
          waste_percentage?: number
          waste_type?: string
          workflow_progress_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_waste_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_waste_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_waste_tracking_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_waste_tracking_workflow_progress_id_fkey"
            columns: ["workflow_progress_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_workflow_progress: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          efficiency_percentage: number | null
          id: string
          labor_cost: number | null
          material_consumed: Json | null
          material_cost: number | null
          notes: string | null
          order_id: string | null
          organization_id: string | null
          overhead_cost: number | null
          progress_percentage: number | null
          quality_status: string | null
          resource_utilization: Json | null
          stage_data: Json | null
          stage_id: string | null
          started_at: string | null
          status: string
          total_stage_cost: number | null
          updated_at: string
          waste_percentage: number | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          efficiency_percentage?: number | null
          id?: string
          labor_cost?: number | null
          material_consumed?: Json | null
          material_cost?: number | null
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          overhead_cost?: number | null
          progress_percentage?: number | null
          quality_status?: string | null
          resource_utilization?: Json | null
          stage_data?: Json | null
          stage_id?: string | null
          started_at?: string | null
          status?: string
          total_stage_cost?: number | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          efficiency_percentage?: number | null
          id?: string
          labor_cost?: number | null
          material_consumed?: Json | null
          material_cost?: number | null
          notes?: string | null
          order_id?: string | null
          organization_id?: string | null
          overhead_cost?: number | null
          progress_percentage?: number | null
          quality_status?: string | null
          resource_utilization?: Json | null
          stage_data?: Json | null
          stage_id?: string | null
          started_at?: string | null
          status?: string
          total_stage_cost?: number | null
          updated_at?: string
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_workflow_progress_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "dkegl_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_workflow_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_workflow_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "dkegl_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_workflow_stages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          sequence_order: number | null
          stage_config: Json | null
          stage_name: string
          stage_order: number
          stage_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          sequence_order?: number | null
          stage_config?: Json | null
          stage_name: string
          stage_order: number
          stage_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          sequence_order?: number | null
          stage_config?: Json | null
          stage_name?: string
          stage_order?: number
          stage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_workflow_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_account_mapping: {
        Row: {
          created_at: string
          dkegl_account_code: string | null
          dkegl_ledger_type: string | null
          id: string
          is_verified: boolean | null
          mapping_confidence: number | null
          mapping_notes: string | null
          organization_id: string
          tally_account_code: string | null
          tally_account_name: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          dkegl_account_code?: string | null
          dkegl_ledger_type?: string | null
          id?: string
          is_verified?: boolean | null
          mapping_confidence?: number | null
          mapping_notes?: string | null
          organization_id?: string
          tally_account_code?: string | null
          tally_account_name: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          dkegl_account_code?: string | null
          dkegl_ledger_type?: string | null
          id?: string
          is_verified?: boolean | null
          mapping_confidence?: number | null
          mapping_notes?: string | null
          organization_id?: string
          tally_account_code?: string | null
          tally_account_name?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      dkpkl_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: string | null
          error_rows: number | null
          file_hash: string | null
          file_name: string
          file_size: number | null
          gst_summary: Json | null
          gst_validation_enabled: boolean | null
          id: string
          import_type: Database["public"]["Enums"]["dkpkl_import_type"]
          metadata: Json | null
          organization_id: string
          period_end: string
          period_start: string
          processed_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
          updated_at: string
          uploaded_by: string | null
          warning_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          error_rows?: number | null
          file_hash?: string | null
          file_name: string
          file_size?: number | null
          gst_summary?: Json | null
          gst_validation_enabled?: boolean | null
          id?: string
          import_type: Database["public"]["Enums"]["dkpkl_import_type"]
          metadata?: Json | null
          organization_id?: string
          period_end: string
          period_start: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          uploaded_by?: string | null
          warning_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          error_rows?: number | null
          file_hash?: string | null
          file_name?: string
          file_size?: number | null
          gst_summary?: Json | null
          gst_validation_enabled?: boolean | null
          id?: string
          import_type?: Database["public"]["Enums"]["dkpkl_import_type"]
          metadata?: Json | null
          organization_id?: string
          period_end?: string
          period_start?: string
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
          uploaded_by?: string | null
          warning_rows?: number | null
        }
        Relationships: []
      }
      dkpkl_ledger_staging: {
        Row: {
          account_code: string | null
          batch_id: string
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          id: string
          ledger_name: string | null
          narration: string | null
          organization_id: string
          posted_to_erp_at: string | null
          posting_status: string | null
          raw_row_id: string | null
          reference_number: string | null
          validation_errors: Json | null
          validation_status: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Insert: {
          account_code?: string | null
          batch_id: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          ledger_name?: string | null
          narration?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          raw_row_id?: string | null
          reference_number?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Update: {
          account_code?: string | null
          batch_id?: string
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          ledger_name?: string | null
          narration?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          raw_row_id?: string | null
          reference_number?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_ledger_staging_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkpkl_ledger_staging_raw_row_id_fkey"
            columns: ["raw_row_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_raw_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_purchase_records: {
        Row: {
          amount: number | null
          batch_id: string
          created_at: string | null
          gst_details: Json | null
          id: string
          item_details: Json | null
          organization_id: string
          posted_at: string | null
          posted_to_erp: boolean | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          validation_errors: Json | null
          validation_status: string | null
          vendor_name: string
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number | null
          batch_id: string
          created_at?: string | null
          gst_details?: Json | null
          id?: string
          item_details?: Json | null
          organization_id: string
          posted_at?: string | null
          posted_to_erp?: boolean | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          vendor_name: string
          voucher_date: string
          voucher_number: string
        }
        Update: {
          amount?: number | null
          batch_id?: string
          created_at?: string | null
          gst_details?: Json | null
          id?: string
          item_details?: Json | null
          organization_id?: string
          posted_at?: string | null
          posted_to_erp?: boolean | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          vendor_name?: string
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_purchase_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_purchase_staging: {
        Row: {
          batch_id: string
          cgst_amount: number | null
          created_at: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_date: string | null
          invoice_number: string | null
          item_code: string | null
          item_name: string | null
          organization_id: string
          posted_to_erp_at: string | null
          posting_status: string | null
          quantity: number | null
          raw_row_id: string | null
          sgst_amount: number | null
          supplier_name: string | null
          tax_amount: number | null
          total_amount: number | null
          unit_rate: number | null
          validation_errors: Json | null
          validation_status: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Insert: {
          batch_id: string
          cgst_amount?: number | null
          created_at?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity?: number | null
          raw_row_id?: string | null
          sgst_amount?: number | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Update: {
          batch_id?: string
          cgst_amount?: number | null
          created_at?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity?: number | null
          raw_row_id?: string | null
          sgst_amount?: number | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_purchase_staging_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkpkl_purchase_staging_raw_row_id_fkey"
            columns: ["raw_row_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_raw_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_raw_rows: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          organization_id: string
          parsed_status: string | null
          posted_at: string | null
          posted_by: string | null
          posted_to_erp: boolean | null
          row_data: Json
          row_number: number
          validation_errors: Json | null
          validation_warnings: Json | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          organization_id?: string
          parsed_status?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posted_to_erp?: boolean | null
          row_data: Json
          row_number: number
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          parsed_status?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posted_to_erp?: boolean | null
          row_data?: Json
          row_number?: number
          validation_errors?: Json | null
          validation_warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_raw_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_reconciliation_log: {
        Row: {
          batch_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          reconciliation_data: Json | null
          reconciliation_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_record_id: string | null
          source_table: string | null
          status: string | null
          target_record_id: string | null
          target_table: string | null
        }
        Insert: {
          batch_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reconciliation_data?: Json | null
          reconciliation_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_record_id?: string | null
          source_table?: string | null
          status?: string | null
          target_record_id?: string | null
          target_table?: string | null
        }
        Update: {
          batch_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reconciliation_data?: Json | null
          reconciliation_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_record_id?: string | null
          source_table?: string | null
          status?: string | null
          target_record_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_reconciliation_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_sales_records: {
        Row: {
          amount: number | null
          batch_id: string
          created_at: string | null
          gst_details: Json | null
          id: string
          item_details: Json | null
          organization_id: string
          party_name: string
          posted_at: string | null
          posted_to_erp: boolean | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          validation_errors: Json | null
          validation_status: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number | null
          batch_id: string
          created_at?: string | null
          gst_details?: Json | null
          id?: string
          item_details?: Json | null
          organization_id: string
          party_name: string
          posted_at?: string | null
          posted_to_erp?: boolean | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date: string
          voucher_number: string
        }
        Update: {
          amount?: number | null
          batch_id?: string
          created_at?: string | null
          gst_details?: Json | null
          id?: string
          item_details?: Json | null
          organization_id?: string
          party_name?: string
          posted_at?: string | null
          posted_to_erp?: boolean | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_sales_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_sales_staging: {
        Row: {
          batch_id: string
          cgst_amount: number | null
          created_at: string
          einvoice_number: string | null
          eway_bill_number: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_number: string | null
          item_code: string | null
          item_name: string | null
          organization_id: string
          party_name: string | null
          posted_to_erp_at: string | null
          posting_status: string | null
          quantity: number | null
          raw_row_id: string | null
          sgst_amount: number | null
          tax_amount: number | null
          total_amount: number | null
          unit_rate: number | null
          validation_errors: Json | null
          validation_status: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Insert: {
          batch_id: string
          cgst_amount?: number | null
          created_at?: string
          einvoice_number?: string | null
          eway_bill_number?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_number?: string | null
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          party_name?: string | null
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity?: number | null
          raw_row_id?: string | null
          sgst_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Update: {
          batch_id?: string
          cgst_amount?: number | null
          created_at?: string
          einvoice_number?: string | null
          eway_bill_number?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_number?: string | null
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          party_name?: string | null
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity?: number | null
          raw_row_id?: string | null
          sgst_amount?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_sales_staging_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkpkl_sales_staging_raw_row_id_fkey"
            columns: ["raw_row_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_raw_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_stock_staging: {
        Row: {
          batch_id: string
          batch_number: string | null
          created_at: string
          godown_name: string | null
          id: string
          item_code: string | null
          item_name: string | null
          organization_id: string
          posted_to_erp_at: string | null
          posting_status: string | null
          quantity_in: number | null
          quantity_out: number | null
          raw_row_id: string | null
          total_value: number | null
          unit_rate: number | null
          validation_errors: Json | null
          validation_status: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Insert: {
          batch_id: string
          batch_number?: string | null
          created_at?: string
          godown_name?: string | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          raw_row_id?: string | null
          total_value?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Update: {
          batch_id?: string
          batch_number?: string | null
          created_at?: string
          godown_name?: string | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          organization_id?: string
          posted_to_erp_at?: string | null
          posting_status?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          raw_row_id?: string | null
          total_value?: number | null
          unit_rate?: number | null
          validation_errors?: Json | null
          validation_status?: string | null
          voucher_date?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_stock_staging_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkpkl_stock_staging_raw_row_id_fkey"
            columns: ["raw_row_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_raw_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      gravure_printing: {
        Row: {
          created_at: string | null
          deckle: number | null
          id: string
          item_code: string | null
          item_name: string | null
          length: number | null
          status_gravure: string
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_gravure: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_gravure?: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gravure_printing_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: true
            referencedRelation: "eligible_adhesive_coating_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "gravure_printing_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: true
            referencedRelation: "eligible_lamination_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "gravure_printing_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: true
            referencedRelation: "eligible_slitting_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "gravure_printing_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: true
            referencedRelation: "order_punching"
            referencedColumns: ["uiorn"]
          },
        ]
      }
      grn_audit_log: {
        Row: {
          action: string
          created_at: string | null
          grn_id: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          grn_id: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          grn_id?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_audit_log_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn_log"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_log: {
        Row: {
          amount_inr: number | null
          created_at: string
          date: string
          grn_number: string
          id: string
          invoice_number: string | null
          item_code: string
          qty_received: number
          remarks: string | null
          uom: string
          vendor: string | null
        }
        Insert: {
          amount_inr?: number | null
          created_at?: string
          date?: string
          grn_number: string
          id?: string
          invoice_number?: string | null
          item_code: string
          qty_received: number
          remarks?: string | null
          uom: string
          vendor?: string | null
        }
        Update: {
          amount_inr?: number | null
          created_at?: string
          date?: string
          grn_number?: string
          id?: string
          invoice_number?: string | null
          item_code?: string
          qty_received?: number
          remarks?: string | null
          uom?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_log_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["item_code"]
          },
        ]
      }
      issue_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          issue_id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          issue_id: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          issue_id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_audit_log_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issue_log"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_log: {
        Row: {
          created_at: string
          date: string
          id: string
          item_code: string
          purpose: string | null
          qty_issued: number
          remarks: string | null
          total_issued_qty: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          item_code: string
          purpose?: string | null
          qty_issued: number
          remarks?: string | null
          total_issued_qty?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          item_code?: string
          purpose?: string | null
          qty_issued?: number
          remarks?: string | null
          total_issued_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_log_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "item_master"
            referencedColumns: ["item_code"]
          },
        ]
      }
      item_master: {
        Row: {
          auto_code: string | null
          category_id: string | null
          created_at: string
          gsm: number | null
          id: string
          item_code: string
          item_name: string
          qualifier: string | null
          size_mm: string | null
          status: string
          uom: string
          updated_at: string
          usage_type: string | null
        }
        Insert: {
          auto_code?: string | null
          category_id?: string | null
          created_at?: string
          gsm?: number | null
          id?: string
          item_code: string
          item_name: string
          qualifier?: string | null
          size_mm?: string | null
          status?: string
          uom?: string
          updated_at?: string
          usage_type?: string | null
        }
        Update: {
          auto_code?: string | null
          category_id?: string | null
          created_at?: string
          gsm?: number | null
          id?: string
          item_code?: string
          item_name?: string
          qualifier?: string | null
          size_mm?: string | null
          status?: string
          uom?: string
          updated_at?: string
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lamination: {
        Row: {
          created_at: string | null
          deckle: number | null
          id: string
          item_code: string | null
          item_name: string | null
          length: number | null
          status_lamination: string
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_lamination: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number | null
          id?: string
          item_code?: string | null
          item_name?: string | null
          length?: number | null
          status_lamination?: string
          substrate_gsm?: number | null
          substrate_name?: string | null
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lamination_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_adhesive_coating_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "lamination_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_lamination_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "lamination_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_slitting_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "lamination_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "order_punching"
            referencedColumns: ["uiorn"]
          },
        ]
      }
      Master_Data: {
        Row: {
          "Coil_Width (mm)": number | null
          "Deckle (mm)": string | null
          GSM: string | null
          Item_Code: string
          Item_Name: string | null
          Party_Name: string | null
          Product_Category: string | null
          Specs: string | null
          Substrate: string | null
          Thickness: string | null
          "Total GSM": number | null
        }
        Insert: {
          "Coil_Width (mm)"?: number | null
          "Deckle (mm)"?: string | null
          GSM?: string | null
          Item_Code: string
          Item_Name?: string | null
          Party_Name?: string | null
          Product_Category?: string | null
          Specs?: string | null
          Substrate?: string | null
          Thickness?: string | null
          "Total GSM"?: number | null
        }
        Update: {
          "Coil_Width (mm)"?: number | null
          "Deckle (mm)"?: string | null
          GSM?: string | null
          Item_Code?: string
          Item_Name?: string | null
          Party_Name?: string | null
          Product_Category?: string | null
          Specs?: string | null
          Substrate?: string | null
          Thickness?: string | null
          "Total GSM"?: number | null
        }
        Relationships: []
      }
      material_selection: {
        Row: {
          barrier_material: string | null
          brand_sku_ref: string | null
          coating_type: string | null
          created_at: string | null
          gsm_estimate: number | null
          id: string
          ink_system: string | null
          micron_total: number | null
          notes: string | null
          packaging_ref: string | null
          print_surface: string | null
          recyclability: string | null
          sealing_layer: string | null
          substrate_structure: string | null
          total_layers: number | null
        }
        Insert: {
          barrier_material?: string | null
          brand_sku_ref?: string | null
          coating_type?: string | null
          created_at?: string | null
          gsm_estimate?: number | null
          id?: string
          ink_system?: string | null
          micron_total?: number | null
          notes?: string | null
          packaging_ref?: string | null
          print_surface?: string | null
          recyclability?: string | null
          sealing_layer?: string | null
          substrate_structure?: string | null
          total_layers?: number | null
        }
        Update: {
          barrier_material?: string | null
          brand_sku_ref?: string | null
          coating_type?: string | null
          created_at?: string | null
          gsm_estimate?: number | null
          id?: string
          ink_system?: string | null
          micron_total?: number | null
          notes?: string | null
          packaging_ref?: string | null
          print_surface?: string | null
          recyclability?: string | null
          sealing_layer?: string | null
          substrate_structure?: string | null
          total_layers?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          amount: number
          boxes: number
          created_at: string
          id: string
          length: number
          mic: string
          order_id: string
          particulars: string
          per_roll: number
          rolls: number
          width: number
        }
        Insert: {
          amount: number
          boxes: number
          created_at?: string
          id?: string
          length: number
          mic: string
          order_id: string
          particulars: string
          per_roll: number
          rolls: number
          width: number
        }
        Update: {
          amount?: number
          boxes?: number
          created_at?: string
          id?: string
          length?: number
          mic?: string
          order_id?: string
          particulars?: string
          per_roll?: number
          rolls?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_punching: {
        Row: {
          created_at: string | null
          deckle: number
          item_code: string
          item_name: string
          job_no: number
          length: number
          number_colours: number
          order_entry_date: string
          sr_no: number
          status: string | null
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          item_code: string
          item_name: string
          job_no: number
          length: number
          number_colours: number
          order_entry_date: string
          sr_no: number
          status?: string | null
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          item_code?: string
          item_name?: string
          job_no?: number
          length?: number
          number_colours?: number
          order_entry_date?: string
          sr_no?: number
          status?: string | null
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          client_company: string | null
          client_email: string
          client_name: string
          created_at: string
          gst_type: string
          id: string
          net_value: number
          notes: string | null
          order_date: string
          order_number: string
          status: string
          tax_value: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_company?: string | null
          client_email: string
          client_name: string
          created_at?: string
          gst_type: string
          id?: string
          net_value?: number
          notes?: string | null
          order_date: string
          order_number: string
          status: string
          tax_value?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_company?: string | null
          client_email?: string
          client_name?: string
          created_at?: string
          gst_type?: string
          id?: string
          net_value?: number
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          tax_value?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      packaging_projects: {
        Row: {
          add_on_features: Json | null
          artwork_design: Json | null
          brand_info: Json | null
          cost_estimate: Json | null
          created_at: string | null
          id: string
          material_selection: Json | null
          packaging_type: Json | null
          project_name: string | null
          project_notes: string | null
          sku_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          add_on_features?: Json | null
          artwork_design?: Json | null
          brand_info?: Json | null
          cost_estimate?: Json | null
          created_at?: string | null
          id?: string
          material_selection?: Json | null
          packaging_type?: Json | null
          project_name?: string | null
          project_notes?: string | null
          sku_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          add_on_features?: Json | null
          artwork_design?: Json | null
          brand_info?: Json | null
          cost_estimate?: Json | null
          created_at?: string | null
          id?: string
          material_selection?: Json | null
          packaging_type?: Json | null
          project_name?: string | null
          project_notes?: string | null
          sku_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      packaging_selection: {
        Row: {
          adhesive_notes: string | null
          adhesive_type: string | null
          barrier_layer: string | null
          brand_sku_ref: string | null
          coating_type: string | null
          container_stl: string | null
          container_type: string | null
          created_at: string | null
          gusset_type: string | null
          has_spout: boolean | null
          has_valve: boolean | null
          has_zipper: boolean | null
          id: string
          ink_notes: string | null
          label_cut_length: number | null
          length_mm: number | null
          micron_thickness: number | null
          other_type_note: string | null
          pre_deform_artwork: boolean | null
          primary_type: string | null
          print_method: string | null
          roll_width_mm: number | null
          sealing_layer: string | null
          shrink_md_percent: number | null
          shrink_td_percent: number | null
          sleeve_width: number | null
          substrate: string | null
          subtype: string | null
          tube_barrier: string | null
          tube_diameter: number | null
          tube_length: number | null
          width_mm: number | null
        }
        Insert: {
          adhesive_notes?: string | null
          adhesive_type?: string | null
          barrier_layer?: string | null
          brand_sku_ref?: string | null
          coating_type?: string | null
          container_stl?: string | null
          container_type?: string | null
          created_at?: string | null
          gusset_type?: string | null
          has_spout?: boolean | null
          has_valve?: boolean | null
          has_zipper?: boolean | null
          id?: string
          ink_notes?: string | null
          label_cut_length?: number | null
          length_mm?: number | null
          micron_thickness?: number | null
          other_type_note?: string | null
          pre_deform_artwork?: boolean | null
          primary_type?: string | null
          print_method?: string | null
          roll_width_mm?: number | null
          sealing_layer?: string | null
          shrink_md_percent?: number | null
          shrink_td_percent?: number | null
          sleeve_width?: number | null
          substrate?: string | null
          subtype?: string | null
          tube_barrier?: string | null
          tube_diameter?: number | null
          tube_length?: number | null
          width_mm?: number | null
        }
        Update: {
          adhesive_notes?: string | null
          adhesive_type?: string | null
          barrier_layer?: string | null
          brand_sku_ref?: string | null
          coating_type?: string | null
          container_stl?: string | null
          container_type?: string | null
          created_at?: string | null
          gusset_type?: string | null
          has_spout?: boolean | null
          has_valve?: boolean | null
          has_zipper?: boolean | null
          id?: string
          ink_notes?: string | null
          label_cut_length?: number | null
          length_mm?: number | null
          micron_thickness?: number | null
          other_type_note?: string | null
          pre_deform_artwork?: boolean | null
          primary_type?: string | null
          print_method?: string | null
          roll_width_mm?: number | null
          sealing_layer?: string | null
          shrink_md_percent?: number | null
          shrink_td_percent?: number | null
          sleeve_width?: number | null
          substrate?: string | null
          subtype?: string | null
          tube_barrier?: string | null
          tube_diameter?: number | null
          tube_length?: number | null
          width_mm?: number | null
        }
        Relationships: []
      }
      po_logs: {
        Row: {
          created_at: string | null
          customer: string
          details: Json | null
          id: string
          po_number: string
          status: string
        }
        Insert: {
          created_at?: string | null
          customer: string
          details?: Json | null
          id?: string
          po_number: string
          status: string
        }
        Update: {
          created_at?: string | null
          customer?: string
          details?: Json | null
          id?: string
          po_number?: string
          status?: string
        }
        Relationships: []
      }
      process_knowledge_base: {
        Row: {
          bpmn_context: Json
          confidence_score: number | null
          created_at: string
          effectiveness_score: number | null
          extracted_insights: Json
          id: string
          knowledge_type: string
          source_session_id: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          bpmn_context: Json
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          extracted_insights: Json
          id?: string
          knowledge_type: string
          source_session_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          bpmn_context?: Json
          confidence_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          extracted_insights?: Json
          id?: string
          knowledge_type?: string
          source_session_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_knowledge_base_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      slitting: {
        Row: {
          created_at: string | null
          deckle: number
          id: string
          item_code: string
          item_name: string
          length: number
          status_slitting: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deckle: number
          id?: string
          item_code: string
          item_name: string
          length: number
          status_slitting: string
          substrate_gsm: number
          substrate_name: string
          uiorn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deckle?: number
          id?: string
          item_code?: string
          item_name?: string
          length?: number
          status_slitting?: string
          substrate_gsm?: number
          substrate_name?: string
          uiorn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slitting_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_adhesive_coating_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "slitting_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_lamination_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "slitting_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "eligible_slitting_uiorns"
            referencedColumns: ["uiorn"]
          },
          {
            foreignKeyName: "slitting_uiorn_fkey"
            columns: ["uiorn"]
            isOneToOne: false
            referencedRelation: "order_punching"
            referencedColumns: ["uiorn"]
          },
        ]
      }
      stock: {
        Row: {
          current_qty: number
          id: string
          item_code: string
          last_updated: string
          opening_qty: number
        }
        Insert: {
          current_qty?: number
          id?: string
          item_code: string
          last_updated?: string
          opening_qty?: number
        }
        Update: {
          current_qty?: number
          id?: string
          item_code?: string
          last_updated?: string
          opening_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: true
            referencedRelation: "item_master"
            referencedColumns: ["item_code"]
          },
        ]
      }
      stock_analytics_queries: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          execution_time_ms: number | null
          filters: Json | null
          id: string
          query_result: Json | null
          query_text: string
          query_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          query_result?: Json | null
          query_text: string
          query_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          query_result?: Json | null
          query_text?: string
          query_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dkegl_consumable_items_view: {
        Row: {
          artwork_reference: string | null
          bom_structure: Json | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          dimensions: Json | null
          hsn_code: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          item_type: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days: number | null
          material_properties: Json | null
          organization_id: string | null
          parent_item_code: string | null
          pricing_info: Json | null
          quality_parameters: Json | null
          quality_specs: Json | null
          reorder_level: number | null
          reorder_quantity: number | null
          specification_reference: string | null
          specifications: Json | null
          status: string | null
          stock_qty: number | null
          stock_status: string | null
          storage_location: string | null
          supplier_info: Json | null
          technical_specs: Json | null
          uom: string | null
          updated_at: string | null
          weight_per_unit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_fg_items_view: {
        Row: {
          artwork_file: string | null
          artwork_notes: string | null
          artwork_reference: string | null
          bom_structure: Json | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          dimensions: Json | null
          hsn_code: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          item_type: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days: number | null
          material_properties: Json | null
          organization_id: string | null
          parent_item_code: string | null
          pricing_info: Json | null
          quality_parameters: Json | null
          quality_specs: Json | null
          reorder_level: number | null
          reorder_quantity: number | null
          specification_reference: string | null
          specifications: Json | null
          status: string | null
          stock_qty: number | null
          storage_location: string | null
          supplier_info: Json | null
          technical_specs: Json | null
          uom: string | null
          updated_at: string | null
          weight_per_unit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_rm_items_view: {
        Row: {
          artwork_reference: string | null
          bom_structure: Json | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          dimensions: Json | null
          effective_reorder_level: number | null
          hsn_code: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          item_type: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days: number | null
          material_properties: Json | null
          organization_id: string | null
          parent_item_code: string | null
          pricing_info: Json | null
          quality_parameters: Json | null
          quality_specs: Json | null
          reorder_level: number | null
          reorder_quantity: number | null
          specification_reference: string | null
          specifications: Json | null
          status: string | null
          stock_qty: number | null
          storage_location: string | null
          supplier_info: Json | null
          technical_specs: Json | null
          uom: string | null
          updated_at: string | null
          weight_per_unit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkegl_wip_items_view: {
        Row: {
          artwork_reference: string | null
          bom_structure: Json | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          dimensions: Json | null
          hsn_code: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          item_type: Database["public"]["Enums"]["dkegl_item_type"] | null
          lead_time_days: number | null
          material_properties: Json | null
          organization_id: string | null
          parent_item_code: string | null
          parent_item_name: string | null
          pricing_info: Json | null
          quality_parameters: Json | null
          quality_specs: Json | null
          reorder_level: number | null
          reorder_quantity: number | null
          specification_reference: string | null
          specifications: Json | null
          status: string | null
          stock_qty: number | null
          storage_location: string | null
          supplier_info: Json | null
          technical_specs: Json | null
          uom: string | null
          updated_at: string | null
          weight_per_unit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dkegl_item_master_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dkegl_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dkegl_item_master_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dkegl_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_unified_purchase_view: {
        Row: {
          amount: number | null
          batch_id: string | null
          batch_status: string | null
          created_at: string | null
          gst_details: Json | null
          import_type: Database["public"]["Enums"]["dkpkl_import_type"] | null
          item_details: Json | null
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          tax_amount: number | null
          total_amount: number | null
          validation_status: string | null
          vendor_name: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_purchase_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      dkpkl_unified_sales_view: {
        Row: {
          amount: number | null
          batch_id: string | null
          batch_status: string | null
          created_at: string | null
          customer_name: string | null
          gst_details: Json | null
          import_type: Database["public"]["Enums"]["dkpkl_import_type"] | null
          item_details: Json | null
          organization_id: string | null
          period_end: string | null
          period_start: string | null
          tax_amount: number | null
          total_amount: number | null
          validation_status: string | null
          voucher_date: string | null
          voucher_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dkpkl_sales_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dkpkl_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      eligible_adhesive_coating_uiorns: {
        Row: {
          deckle: number | null
          item_code: string | null
          item_name: string | null
          length: number | null
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string | null
        }
        Relationships: []
      }
      eligible_lamination_uiorns: {
        Row: {
          item_name: string | null
          uiorn: string | null
        }
        Relationships: []
      }
      eligible_slitting_uiorns: {
        Row: {
          deckle: number | null
          item_code: string | null
          item_name: string | null
          length: number | null
          substrate_gsm: number | null
          substrate_name: string | null
          uiorn: string | null
        }
        Relationships: []
      }
      stock_summary: {
        Row: {
          calculated_qty: number | null
          category_name: string | null
          consumption_rate_30d: number | null
          consumption_rate_7d: number | null
          consumption_rate_90d: number | null
          current_qty: number | null
          days_of_cover: number | null
          days_of_cover_7d: number | null
          days_of_cover_90d: number | null
          issue_30d: number | null
          issue_7d: number | null
          issue_90d: number | null
          item_code: string | null
          item_name: string | null
          opening_qty: number | null
          stock_validation_status: string | null
          total_grn_qty: number | null
          total_issued_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: true
            referencedRelation: "item_master"
            referencedColumns: ["item_code"]
          },
        ]
      }
    }
    Functions: {
      capture_daily_stock_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      count_adhesive_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      count_gravure_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      count_lamination_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      count_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      dkegl_analyze_consumption_patterns: {
        Args: { _org_id: string; _item_code?: string }
        Returns: {
          item_code: string
          item_name: string
          avg_monthly_consumption: number
          consumption_trend: string
          seasonality_factor: number
          recommended_reorder_level: number
          recommended_reorder_quantity: number
          next_reorder_date: string
        }[]
      }
      dkegl_calculate_gst: {
        Args:
          | {
              _org_id: string
              _hsn_code: string
              _taxable_amount: number
              _is_interstate?: boolean
            }
          | {
              _taxable_amount: number
              _buyer_state_code: string
              _seller_state_code?: string
              _gst_rate?: number
            }
        Returns: Json
      }
      dkegl_calculate_item_pricing: {
        Args: {
          _org_id: string
          _item_code: string
          _customer_tier?: string
          _quantity?: number
        }
        Returns: {
          pricing_source: string
          unit_price: number
          total_price: number
          discount_applied: number
          margin_percentage: number
          is_primary: boolean
        }[]
      }
      dkegl_calculate_stage_cost: {
        Args: { _workflow_progress_id: string }
        Returns: number
      }
      dkegl_calculate_stage_material_requirements: {
        Args: { _order_id: string; _stage_id: string }
        Returns: {
          item_code: string
          item_name: string
          material_category: string
          planned_quantity: number
          unit_cost: number
          total_planned_cost: number
          waste_allowance: number
          total_with_waste: number
        }[]
      }
      dkegl_calculate_stock_valuation: {
        Args: { _org_id: string; _item_code: string; _quantity: number }
        Returns: number
      }
      dkegl_calculate_vendor_performance: {
        Args: { _vendor_id: string; _start_date: string; _end_date: string }
        Returns: number
      }
      dkegl_capture_daily_stock_snapshot: {
        Args: { _org_id?: string }
        Returns: Json
      }
      dkegl_cleanup_old_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      dkegl_consolidate_stock_locations: {
        Args: { _org_id: string }
        Returns: Json
      }
      dkegl_correct_negative_stocks: {
        Args: { _org_id: string }
        Returns: Json
      }
      dkegl_count_adhesive_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      dkegl_count_gravure_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      dkegl_count_lamination_started: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      dkegl_count_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
        }[]
      }
      dkegl_create_gst_summary: {
        Args: {
          _org_id: string
          _document_type: string
          _document_id: string
          _line_items: Json
        }
        Returns: string
      }
      dkegl_detect_material_shortages: {
        Args: { _org_id: string; _stage_id: string; _order_id: string }
        Returns: {
          item_code: string
          required_quantity: number
          available_quantity: number
          shortage_quantity: number
          shortage_severity: string
          suggested_action: string
        }[]
      }
      dkegl_detect_pricing_variance: {
        Args: {
          _org_id: string
          _item_code: string
          _grn_price: number
          _grn_reference: string
        }
        Returns: undefined
      }
      dkegl_explode_bom: {
        Args: { _org_id: string; _item_code: string; _quantity: number }
        Returns: {
          component_item_code: string
          component_item_name: string
          total_quantity_required: number
          stage_id: string
          stage_name: string
          consumption_type: string
          is_critical: boolean
          waste_percentage: number
          net_requirement: number
          available_stock: number
          shortage_quantity: number
        }[]
      }
      dkegl_generate_gstr_returns: {
        Args: {
          _org_id: string
          _return_type: string
          _month: number
          _year: number
        }
        Returns: {
          return_data: Json
          summary: Json
          validation_errors: Json
        }[]
      }
      dkegl_generate_item_code: {
        Args: {
          _org_id: string
          category_name: string
          qualifier?: string
          size_mm?: string
          gsm?: number
        }
        Returns: string
      }
      dkegl_generate_vendor_code: {
        Args: { _org_id: string }
        Returns: string
      }
      dkegl_get_active_bom: {
        Args: { _org_id: string; _item_code: string }
        Returns: string
      }
      dkegl_get_ai_memory_insights: {
        Args: { _org_id: string } | { _org_id: string; _days_back?: number }
        Returns: Json
      }
      dkegl_get_comprehensive_stock_summary: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          category_name: string
          location: string
          current_qty: number
          unit_cost: number
          total_value: number
          last_transaction_date: string
          stock_status: string
          reorder_level: number
          days_of_cover: number
        }[]
      }
      dkegl_get_context_inventory_data: {
        Args: { _org_id: string; _context_type?: string }
        Returns: Json
      }
      dkegl_get_context_production_data: {
        Args: { _org_id: string; _context_type?: string }
        Returns: Json
      }
      dkegl_get_current_item_pricing: {
        Args: { _org_id: string; _item_code: string }
        Returns: {
          standard_cost: number
          valuation_method: string
          last_updated: string
          approved_by: string
          price_tolerance: number
        }[]
      }
      dkegl_get_current_user_org: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dkegl_get_gst_summary: {
        Args: { _org_id: string; _start_date?: string; _end_date?: string }
        Returns: {
          total_gst_liability: number
          total_input_tax_credit: number
          net_gst_payable: number
          cgst_amount: number
          sgst_amount: number
          igst_amount: number
          total_taxable_turnover: number
          gst_rate_wise_breakdown: Json
          monthly_gst_trend: Json
          vendor_wise_gst: Json
          customer_wise_gst: Json
        }[]
      }
      dkegl_get_inventory_analytics: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          category_name: string
          current_stock: number
          stock_value: number
          turnover_ratio: number
          stock_status: string
          reorder_recommendation: string
          last_movement_date: string
        }[]
      }
      dkegl_get_next_invoice_number: {
        Args: { _org_id: string; _sequence_type: string }
        Returns: string
      }
      dkegl_get_order_cost_summary: {
        Args: { _order_id: string }
        Returns: {
          stage_name: string
          material_cost: number
          labor_cost: number
          overhead_cost: number
          total_stage_cost: number
          waste_percentage: number
          efficiency_percentage: number
        }[]
      }
      dkegl_get_paginated_stock: {
        Args: {
          _org_id: string
          _page?: number
          _page_size?: number
          _search?: string
          _category_filter?: string
          _status_filter?: string
          _sort_column?: string
          _sort_direction?: string
        }
        Returns: {
          item_code: string
          item_name: string
          category_name: string
          current_qty: number
          unit_cost: number
          total_value: number
          location: string
          uom: string
          reorder_level: number
          is_low_stock: boolean
          last_transaction_date: string
          last_updated: string
          total_count: number
        }[]
      }
      dkegl_get_predictive_insights: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          predicted_demand_next_month: number
          confidence_level: string
          recommended_stock_level: number
          stockout_risk: string
          optimal_order_quantity: number
          lead_time_buffer: number
        }[]
      }
      dkegl_get_pricing_intelligence: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          standard_cost: number
          current_market_price: number
          variance_percentage: number
          price_trend: string
          last_grn_price: number
          recommendation: string
        }[]
      }
      dkegl_get_procurement_analytics: {
        Args: { _org_id: string; _days_back?: number }
        Returns: {
          total_vendors: number
          active_vendors: number
          total_spend: number
          avg_order_value: number
          on_time_delivery_rate: number
          active_rfqs: number
        }[]
      }
      dkegl_get_real_stock_summary: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          category_name: string
          current_qty: number
          unit_cost: number
          total_value: number
          last_transaction_date: string
          location: string
          reorder_level: number
          is_low_stock: boolean
        }[]
      }
      dkegl_get_stock_aging: {
        Args: { _org_id: string }
        Returns: {
          item_code: string
          item_name: string
          category_name: string
          current_qty: number
          last_movement_date: string
          days_since_movement: number
          aging_category: string
          estimated_value: number
        }[]
      }
      dkegl_get_stock_analytics_totals: {
        Args: { _org_id: string }
        Returns: {
          total_items: number
          total_value: number
          out_of_stock_items: number
          low_stock_items: number
          in_stock_items: number
          negative_stock_items: number
          total_locations: number
          last_updated: string
        }[]
      }
      dkegl_get_stock_health_metrics: {
        Args: { _org_id: string }
        Returns: {
          total_items: number
          items_with_opening_stock: number
          items_with_transactions: number
          items_with_variances: number
          total_variance_value: number
          data_quality_score: number
          last_reconciliation_date: string
        }[]
      }
      dkegl_get_stock_metrics: {
        Args: { _org_id: string }
        Returns: {
          total_items: number
          total_value: number
          low_stock_count: number
          zero_stock_count: number
          avg_stock_age: number
        }[]
      }
      dkegl_get_stock_movements: {
        Args: { _org_id: string; _item_code?: string; _days?: number }
        Returns: {
          transaction_date: string
          transaction_type: string
          item_code: string
          item_name: string
          quantity: number
          running_balance: number
          source_reference: string
          unit_cost: number
        }[]
      }
      dkegl_get_stock_reconciliation_summary: {
        Args: { _org_id: string }
        Returns: {
          summary_type: string
          item_count: number
          total_value: number
          details: Json
        }[]
      }
      dkegl_get_workflow_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          uiorn: string
          item_name: string
          order_punching: string
          gravure_printing: string
          coating_lamination: string
          adhesive_coating: string
          slitting: string
        }[]
      }
      dkegl_has_role: {
        Args: {
          _user_id: string
          _org_id: string
          _role: Database["public"]["Enums"]["dkegl_user_role"]
        }
        Returns: boolean
      }
      dkegl_log_security_event: {
        Args: { _event_type: string; _event_data?: Json; _risk_level?: string }
        Returns: undefined
      }
      dkegl_populate_stock_summary: {
        Args: { _org_id: string } | { _org_id: string; _opening_date?: string }
        Returns: Json
      }
      dkegl_reconcile_stock_data: {
        Args: { _org_id: string }
        Returns: Json
      }
      dkegl_refresh_stock_summary: {
        Args: { _org_id: string } | { _org_id: string; _opening_date?: string }
        Returns: undefined
      }
      dkegl_reserve_order_materials: {
        Args: { _order_id: string }
        Returns: Json
      }
      dkegl_run_emergency_cleanup: {
        Args: { _org_id?: string }
        Returns: Json
      }
      dkegl_safe_populate_stock_summary: {
        Args: { _org_id: string; _opening_date?: string }
        Returns: Json
      }
      dkegl_schedule_daily_reconciliation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      dkegl_track_gst_compliance: {
        Args: { _org_id: string }
        Returns: {
          compliance_score: number
          pending_returns: Json
          upcoming_deadlines: Json
          penalty_calculations: Json
          recommendations: Json
        }[]
      }
      dkegl_track_material_consumption: {
        Args: {
          _workflow_progress_id: string
          _item_code: string
          _planned_qty: number
          _actual_qty: number
          _unit_cost?: number
        }
        Returns: string
      }
      dkegl_validate_grn_staging_record: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkegl_validate_grn_staging_record_enhanced: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkegl_validate_material_balance: {
        Args: { _workflow_progress_id: string }
        Returns: Json
      }
      dkpkl_get_customer_analysis: {
        Args: { _org_id: string; _start_date?: string; _end_date?: string }
        Returns: Json
      }
      dkpkl_get_dashboard_metrics: {
        Args: Record<PropertyKey, never> | { _org_id: string }
        Returns: Json
      }
      dkpkl_get_executive_summary: {
        Args: { _org_id: string; _period?: string }
        Returns: Json
      }
      dkpkl_get_purchase_summary: {
        Args: { _org_id: string; _start_date?: string; _end_date?: string }
        Returns: Json
      }
      dkpkl_get_sales_summary: {
        Args: { _org_id: string; _start_date?: string; _end_date?: string }
        Returns: Json
      }
      dkpkl_migrate_staging_to_records: {
        Args: { _batch_id: string }
        Returns: Json
      }
      dkpkl_parse_ledger_entries: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkpkl_parse_purchase_voucher: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkpkl_parse_sales_voucher: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkpkl_parse_stock_journal: {
        Args: { _staging_id: string }
        Returns: Json
      }
      dkpkl_post_purchase_to_issue: {
        Args: { _batch_id: string } | { _batch_id: string; _org_id: string }
        Returns: Json
      }
      dkpkl_post_sales_to_grn: {
        Args: { _batch_id: string } | { _batch_id: string; _org_id: string }
        Returns: Json
      }
      dkpkl_process_excel_batch: {
        Args:
          | {
              _batch_id: string
              _import_type: Database["public"]["Enums"]["dkpkl_import_type"]
              _excel_data: Json
            }
          | { _batch_id: string; _import_type: string; _excel_data: string }
        Returns: Json
      }
      dkpkl_validate_staging_record: {
        Args: {
          _staging_id: string
          _import_type: Database["public"]["Enums"]["dkpkl_import_type"]
        }
        Returns: Json
      }
      generate_item_code: {
        Args: {
          category_name: string
          qualifier?: string
          size_mm?: string
          gsm?: number
        }
        Returns: string
      }
      generate_item_code_with_validation: {
        Args: {
          category_name: string
          qualifier?: string
          size_mm?: string
          gsm?: number
        }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_workflow_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          uiorn: string
          item_name: string
          order_punching: string
          gravure_printing: string
          coating_lamination: string
          adhesive_coating: string
          slitting: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      validate_item_code_params: {
        Args: {
          category_name: string
          qualifier?: string
          size_mm?: string
          gsm?: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      dkegl_item_type:
        | "raw_material"
        | "work_in_progress"
        | "consumable"
        | "finished_good"
      dkegl_order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "completed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "pending"
      dkegl_process_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "cancelled"
        | "quality_check"
        | "approved"
        | "rejected"
      dkegl_quality_check_type:
        | "dimensional"
        | "visual"
        | "functional"
        | "material"
        | "weight"
        | "thickness"
        | "color_match"
        | "print_quality"
        | "adhesion"
        | "barrier_properties"
      dkegl_quality_status:
        | "pending"
        | "in_review"
        | "passed"
        | "failed"
        | "rework_required"
        | "approved"
      dkegl_transaction_type:
        | "opening_stock"
        | "purchase"
        | "production"
        | "issue"
        | "adjustment"
        | "transfer"
        | "return"
      dkegl_user_role:
        | "admin"
        | "manager"
        | "operator"
        | "viewer"
        | "quality_controller"
        | "production_planner"
      dkpkl_import_type: "SALES" | "PURCHASE" | "VOUCHER" | "STOCK" | "PAYROLL"
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
      app_role: ["admin", "user"],
      dkegl_item_type: [
        "raw_material",
        "work_in_progress",
        "consumable",
        "finished_good",
      ],
      dkegl_order_status: [
        "draft",
        "confirmed",
        "in_production",
        "completed",
        "shipped",
        "delivered",
        "cancelled",
        "pending",
      ],
      dkegl_process_status: [
        "pending",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled",
        "quality_check",
        "approved",
        "rejected",
      ],
      dkegl_quality_check_type: [
        "dimensional",
        "visual",
        "functional",
        "material",
        "weight",
        "thickness",
        "color_match",
        "print_quality",
        "adhesion",
        "barrier_properties",
      ],
      dkegl_quality_status: [
        "pending",
        "in_review",
        "passed",
        "failed",
        "rework_required",
        "approved",
      ],
      dkegl_transaction_type: [
        "opening_stock",
        "purchase",
        "production",
        "issue",
        "adjustment",
        "transfer",
        "return",
      ],
      dkegl_user_role: [
        "admin",
        "manager",
        "operator",
        "viewer",
        "quality_controller",
        "production_planner",
      ],
      dkpkl_import_type: ["SALES", "PURCHASE", "VOUCHER", "STOCK", "PAYROLL"],
    },
  },
} as const
