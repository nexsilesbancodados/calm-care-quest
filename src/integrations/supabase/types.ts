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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string
          entity: string
          entity_id: string | null
          id: string
          user_email: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      dispensations: {
        Row: {
          dispensed_at: string
          id: string
          medication_name: string
          patient_id: string
          quantity: number
        }
        Insert: {
          dispensed_at?: string
          id?: string
          medication_name: string
          patient_id: string
          quantity?: number
        }
        Update: {
          dispensed_at?: string
          id?: string
          medication_name?: string
          patient_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispensations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          batch_number: string
          category: string
          controlled_substance: boolean
          created_at: string
          current_stock: number
          dosage: string
          expiration_date: string
          form: string
          generic_name: string
          id: string
          location: string
          manufacturer: string
          minimum_stock: number
          name: string
          notes: string
          updated_at: string
        }
        Insert: {
          batch_number?: string
          category?: string
          controlled_substance?: boolean
          created_at?: string
          current_stock?: number
          dosage?: string
          expiration_date?: string
          form?: string
          generic_name?: string
          id?: string
          location?: string
          manufacturer?: string
          minimum_stock?: number
          name: string
          notes?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          category?: string
          controlled_substance?: boolean
          created_at?: string
          current_stock?: number
          dosage?: string
          expiration_date?: string
          form?: string
          generic_name?: string
          id?: string
          location?: string
          manufacturer?: string
          minimum_stock?: number
          name?: string
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          created_at: string
          id: string
          medication_id: string | null
          medication_name: string
          notes: string
          patient: string | null
          quantity: number
          responsible_person: string
          type: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id?: string | null
          medication_name: string
          notes?: string
          patient?: string | null
          quantity?: number
          responsible_person?: string
          type?: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string | null
          medication_name?: string
          notes?: string
          patient?: string | null
          quantity?: number
          responsible_person?: string
          type?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_evolution: {
        Row: {
          author: string
          created_at: string
          description: string
          id: string
          patient_id: string
          type: string
        }
        Insert: {
          author?: string
          created_at?: string
          description?: string
          id?: string
          patient_id: string
          type?: string
        }
        Update: {
          author?: string
          created_at?: string
          description?: string
          id?: string
          patient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_evolution_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_date: string | null
          allergies: string
          attending_doctor: string
          bed: string | null
          created_at: string
          date_of_birth: string | null
          diagnosis: string
          gender: string
          id: string
          name: string
          notes: string
          registration_number: string
          status: string
          updated_at: string
          ward: string
        }
        Insert: {
          admission_date?: string | null
          allergies?: string
          attending_doctor?: string
          bed?: string | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis?: string
          gender?: string
          id?: string
          name: string
          notes?: string
          registration_number?: string
          status?: string
          updated_at?: string
          ward?: string
        }
        Update: {
          admission_date?: string | null
          allergies?: string
          attending_doctor?: string
          bed?: string | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis?: string
          gender?: string
          id?: string
          name?: string
          notes?: string
          registration_number?: string
          status?: string
          updated_at?: string
          ward?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          active: boolean
          created_at: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          medication_name: string
          notes: string
          patient_id: string
          prescribed_by: string
          start_date: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name: string
          notes?: string
          patient_id: string
          prescribed_by?: string
          start_date?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string
          patient_id?: string
          prescribed_by?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_medications: {
        Row: {
          id: string
          medication_id: string
          supplier_id: string
        }
        Insert: {
          id?: string
          medication_id: string
          supplier_id: string
        }
        Update: {
          id?: string
          medication_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_medications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_medications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          created_at: string
          id: string
          items: string
          nf: string | null
          quantity: number
          status: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: string
          nf?: string | null
          quantity?: number
          status?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: string
          nf?: string | null
          quantity?: number
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string
          avg_delivery_days: number
          category: string
          cnpj: string
          contact: string
          created_at: string
          email: string
          id: string
          last_order: string | null
          name: string
          notes: string
          phone: string
          rating: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          avg_delivery_days?: number
          category?: string
          cnpj?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          last_order?: string | null
          name: string
          notes?: string
          phone?: string
          rating?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          avg_delivery_days?: number
          category?: string
          cnpj?: string
          contact?: string
          created_at?: string
          email?: string
          id?: string
          last_order?: string | null
          name?: string
          notes?: string
          phone?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      transfer_items: {
        Row: {
          batch_number: string
          dosage: string
          id: string
          medication_name: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          batch_number?: string
          dosage?: string
          id?: string
          medication_name: string
          quantity?: number
          transfer_id: string
        }
        Update: {
          batch_number?: string
          dosage?: string
          id?: string
          medication_name?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          date: string
          destination_branch: string
          direction: string
          expected_date: string | null
          id: string
          notes: string
          origin_branch: string
          received_by: string | null
          responsible_person: string
          status: string
          transport_doc: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          destination_branch?: string
          direction?: string
          expected_date?: string | null
          id?: string
          notes?: string
          origin_branch?: string
          received_by?: string | null
          responsible_person?: string
          status?: string
          transport_doc?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          destination_branch?: string
          direction?: string
          expected_date?: string | null
          id?: string
          notes?: string
          origin_branch?: string
          received_by?: string | null
          responsible_person?: string
          status?: string
          transport_doc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
