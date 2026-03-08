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
      badge_deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          delivered_by: string | null
          delivered_by_name: string | null
          id: string
          key_id: number
          year: number
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          id?: string
          key_id: number
          year?: number
        }
        Update: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          id?: string
          key_id?: number
          year?: number
        }
        Relationships: []
      }
      chapter_fees: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chapter_leadership: {
        Row: {
          created_at: string
          id: string
          key_id: number
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          role?: string
        }
        Relationships: []
      }
      dues_payments: {
        Row: {
          amount: number
          created_at: string
          exported: boolean
          id: string
          key_id: number
          method: string
          method_code: string
          new_expiration_date: string
          old_expiration_date: string | null
          old_standing: string | null
          payment_date: string
          recorded_by: string | null
          recorded_by_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          exported?: boolean
          id?: string
          key_id: number
          method: string
          method_code: string
          new_expiration_date: string
          old_expiration_date?: string | null
          old_standing?: string | null
          payment_date?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          exported?: boolean
          id?: string
          key_id?: number
          method?: string
          method_code?: string
          new_expiration_date?: string
          old_expiration_date?: string | null
          old_standing?: string | null
          payment_date?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
        }
        Relationships: []
      }
      member_chapter_data: {
        Row: {
          application_status: string | null
          aviation_visible_in_directory: boolean
          chapter_payment_method: string | null
          chapter_payment_notes: string | null
          contact_visible_in_directory: boolean
          created_at: string
          id: string
          internal_notes: string | null
          key_id: number
          pending_roster_update: boolean | null
          updated_at: string
          volunteer_notes: string | null
          volunteering_visible_in_directory: boolean
        }
        Insert: {
          application_status?: string | null
          aviation_visible_in_directory?: boolean
          chapter_payment_method?: string | null
          chapter_payment_notes?: string | null
          contact_visible_in_directory?: boolean
          created_at?: string
          id?: string
          internal_notes?: string | null
          key_id: number
          pending_roster_update?: boolean | null
          updated_at?: string
          volunteer_notes?: string | null
          volunteering_visible_in_directory?: boolean
        }
        Update: {
          application_status?: string | null
          aviation_visible_in_directory?: boolean
          chapter_payment_method?: string | null
          chapter_payment_notes?: string | null
          contact_visible_in_directory?: boolean
          created_at?: string
          id?: string
          internal_notes?: string | null
          key_id?: number
          pending_roster_update?: boolean | null
          updated_at?: string
          volunteer_notes?: string | null
          volunteering_visible_in_directory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "member_chapter_data_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: true
            referencedRelation: "roster_members"
            referencedColumns: ["key_id"]
          },
        ]
      }
      member_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          key_id: number
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          key_id: number
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          key_id?: number
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_user_roles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      roster_import_changes: {
        Row: {
          change_type: string
          created_at: string
          eaa_number: string | null
          field_name: string | null
          first_name: string | null
          id: string
          import_id: string
          key_id: number
          last_name: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          eaa_number?: string | null
          field_name?: string | null
          first_name?: string | null
          id?: string
          import_id: string
          key_id: number
          last_name?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          eaa_number?: string | null
          field_name?: string | null
          first_name?: string | null
          id?: string
          import_id?: string
          key_id?: number
          last_name?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_import_changes_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "roster_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_imports: {
        Row: {
          added_count: number | null
          file_name: string | null
          id: string
          imported_at: string
          imported_by: string | null
          modified_count: number | null
          record_count: number | null
          removed_count: number | null
          status: string | null
        }
        Insert: {
          added_count?: number | null
          file_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          modified_count?: number | null
          record_count?: number | null
          removed_count?: number | null
          status?: string | null
        }
        Update: {
          added_count?: number | null
          file_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          modified_count?: number | null
          record_count?: number | null
          removed_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      roster_member_snapshots: {
        Row: {
          created_at: string
          id: string
          import_id: string
          key_id: number
          snapshot: Json
        }
        Insert: {
          created_at?: string
          id?: string
          import_id: string
          key_id: number
          snapshot: Json
        }
        Update: {
          created_at?: string
          id?: string
          import_id?: string
          key_id?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roster_member_snapshots_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "roster_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_members: {
        Row: {
          address_private: boolean | null
          admin_level_desc: string | null
          aircraft_built: string | null
          aircraft_owned: string | null
          aircraft_project: string | null
          aptify_id: number | null
          background_check: string | null
          birth_date: string | null
          cell_phone: string | null
          cell_phone_private: boolean | null
          chapter_name: string | null
          chapter_number: string | null
          chapter_type: string | null
          country: string | null
          created_at: string
          current_joined_on_date: string | null
          current_standing: string | null
          date_added: string | null
          date_updated: string | null
          eaa_expiration: string | null
          eaa_number: string | null
          eagle_flight_volunteer: boolean | null
          eagle_pilot: boolean | null
          email: string | null
          email_private: boolean | null
          expiration_date: string | null
          first_name: string | null
          gender: string | null
          home_phone: string | null
          home_phone_private: boolean | null
          imc: boolean | null
          key_id: number
          last_import_id: string | null
          last_name: string | null
          member_type: string | null
          nickname: string | null
          other_info: string | null
          preferred_city: string | null
          preferred_state: string | null
          ratings: string | null
          spouse: string | null
          street_address_1: string | null
          street_address_2: string | null
          udf1: string | null
          udf1_text: string | null
          udf2: string | null
          udf2_text: string | null
          udf3: string | null
          udf3_text: string | null
          udf4: string | null
          udf4_text: string | null
          udf5: string | null
          udf5_text: string | null
          updated_at: string
          updated_by: string | null
          username: string | null
          vmc: boolean | null
          young_eagle_pilot: boolean | null
          young_eagle_volunteer: boolean | null
          youth_protection: string | null
          zip_code: string | null
        }
        Insert: {
          address_private?: boolean | null
          admin_level_desc?: string | null
          aircraft_built?: string | null
          aircraft_owned?: string | null
          aircraft_project?: string | null
          aptify_id?: number | null
          background_check?: string | null
          birth_date?: string | null
          cell_phone?: string | null
          cell_phone_private?: boolean | null
          chapter_name?: string | null
          chapter_number?: string | null
          chapter_type?: string | null
          country?: string | null
          created_at?: string
          current_joined_on_date?: string | null
          current_standing?: string | null
          date_added?: string | null
          date_updated?: string | null
          eaa_expiration?: string | null
          eaa_number?: string | null
          eagle_flight_volunteer?: boolean | null
          eagle_pilot?: boolean | null
          email?: string | null
          email_private?: boolean | null
          expiration_date?: string | null
          first_name?: string | null
          gender?: string | null
          home_phone?: string | null
          home_phone_private?: boolean | null
          imc?: boolean | null
          key_id: number
          last_import_id?: string | null
          last_name?: string | null
          member_type?: string | null
          nickname?: string | null
          other_info?: string | null
          preferred_city?: string | null
          preferred_state?: string | null
          ratings?: string | null
          spouse?: string | null
          street_address_1?: string | null
          street_address_2?: string | null
          udf1?: string | null
          udf1_text?: string | null
          udf2?: string | null
          udf2_text?: string | null
          udf3?: string | null
          udf3_text?: string | null
          udf4?: string | null
          udf4_text?: string | null
          udf5?: string | null
          udf5_text?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
          vmc?: boolean | null
          young_eagle_pilot?: boolean | null
          young_eagle_volunteer?: boolean | null
          youth_protection?: string | null
          zip_code?: string | null
        }
        Update: {
          address_private?: boolean | null
          admin_level_desc?: string | null
          aircraft_built?: string | null
          aircraft_owned?: string | null
          aircraft_project?: string | null
          aptify_id?: number | null
          background_check?: string | null
          birth_date?: string | null
          cell_phone?: string | null
          cell_phone_private?: boolean | null
          chapter_name?: string | null
          chapter_number?: string | null
          chapter_type?: string | null
          country?: string | null
          created_at?: string
          current_joined_on_date?: string | null
          current_standing?: string | null
          date_added?: string | null
          date_updated?: string | null
          eaa_expiration?: string | null
          eaa_number?: string | null
          eagle_flight_volunteer?: boolean | null
          eagle_pilot?: boolean | null
          email?: string | null
          email_private?: boolean | null
          expiration_date?: string | null
          first_name?: string | null
          gender?: string | null
          home_phone?: string | null
          home_phone_private?: boolean | null
          imc?: boolean | null
          key_id?: number
          last_import_id?: string | null
          last_name?: string | null
          member_type?: string | null
          nickname?: string | null
          other_info?: string | null
          preferred_city?: string | null
          preferred_state?: string | null
          ratings?: string | null
          spouse?: string | null
          street_address_1?: string | null
          street_address_2?: string | null
          udf1?: string | null
          udf1_text?: string | null
          udf2?: string | null
          udf2_text?: string | null
          udf3?: string | null
          udf3_text?: string | null
          udf4?: string | null
          udf4_text?: string | null
          udf5?: string | null
          udf5_text?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
          vmc?: boolean | null
          young_eagle_pilot?: boolean | null
          young_eagle_volunteer?: boolean | null
          youth_protection?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      site_links: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteering_opportunities: {
        Row: {
          created_at: string
          created_by_key_id: number
          created_by_name: string
          description: string
          id: string
          num_volunteers: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_key_id: number
          created_by_name?: string
          description?: string
          id?: string
          num_volunteers?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_key_id?: number
          created_by_name?: string
          description?: string
          id?: string
          num_volunteers?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteering_opportunity_contacts: {
        Row: {
          created_at: string
          id: string
          key_id: number
          opportunity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          opportunity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteering_opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteering_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_emails_by_ids: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inactive_members_by_import: {
        Args: never
        Returns: {
          imported_at: string
          inactive_count: number
          total_members: number
        }[]
      }
      promote_pending_roles: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member" | "officer"
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
      app_role: ["admin", "member", "officer"],
    },
  },
} as const
