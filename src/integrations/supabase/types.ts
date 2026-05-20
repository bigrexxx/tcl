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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          admin_whatsapp: string
          full_day_price_naira: number
          ga_measurement_id: string
          half_day_price_naira: number
          hourly_price_naira: number
          id: number
          podcast_price_naira: number
          updated_at: string
          wa_gc_link: string
        }
        Insert: {
          admin_whatsapp?: string
          full_day_price_naira?: number
          ga_measurement_id?: string
          half_day_price_naira?: number
          hourly_price_naira?: number
          id?: number
          podcast_price_naira?: number
          updated_at?: string
          wa_gc_link?: string
        }
        Update: {
          admin_whatsapp?: string
          full_day_price_naira?: number
          ga_measurement_id?: string
          half_day_price_naira?: number
          hourly_price_naira?: number
          id?: number
          podcast_price_naira?: number
          updated_at?: string
          wa_gc_link?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          answers: Json
          approval_email_sent: boolean
          approval_email_sent_at: string | null
          committee_id: string
          committee_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          matric: string
          phone: string
          status: string
        }
        Insert: {
          answers?: Json
          approval_email_sent?: boolean
          approval_email_sent_at?: string | null
          committee_id: string
          committee_name: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          matric: string
          phone: string
          status?: string
        }
        Update: {
          answers?: Json
          approval_email_sent?: boolean
          approval_email_sent_at?: string | null
          committee_id?: string
          committee_name?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          matric?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      studio_bookings: {
        Row: {
          booking_date: string
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          package_id: string
          package_name: string
          phone: string
          project_type: string
          status: string
          time_slot: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          package_id: string
          package_name: string
          phone: string
          project_type: string
          status?: string
          time_slot: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          package_id?: string
          package_name?: string
          phone?: string
          project_type?: string
          status?: string
          time_slot?: string
        }
        Relationships: []
      }
    }
    Views: {
      studio_booked_slots: {
        Row: {
          booking_date: string | null
          time_slot: string | null
        }
        Insert: {
          booking_date?: string | null
          time_slot?: string | null
        }
        Update: {
          booking_date?: string | null
          time_slot?: string | null
        }
        Relationships: []
      }
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
