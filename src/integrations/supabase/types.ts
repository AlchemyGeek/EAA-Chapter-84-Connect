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
      buddy_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          created_at: string
          graduated_at: string | null
          id: string
          volunteer_key_id: number
        }
        Insert: {
          application_id: string
          assigned_at?: string
          created_at?: string
          graduated_at?: string | null
          id?: string
          volunteer_key_id: number
        }
        Update: {
          application_id?: string
          assigned_at?: string
          created_at?: string
          graduated_at?: string | null
          id?: string
          volunteer_key_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "buddy_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "new_member_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_assignments_volunteer_key_id_fkey"
            columns: ["volunteer_key_id"]
            isOneToOne: false
            referencedRelation: "buddy_volunteers"
            referencedColumns: ["key_id"]
          },
        ]
      }
      buddy_email_log: {
        Row: {
          assignment_id: string
          email_type: string
          id: string
          sent_at: string
        }
        Insert: {
          assignment_id: string
          email_type: string
          id?: string
          sent_at?: string
        }
        Update: {
          assignment_id?: string
          email_type?: string
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_email_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "buddy_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_email_templates: {
        Row: {
          body: string
          id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      buddy_volunteers: {
        Row: {
          created_at: string
          id: string
          key_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
        }
        Relationships: []
      }
      chapter_fees: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          payment_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          payment_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          payment_url?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hangar_talk_attachments: {
        Row: {
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          storage_path: string
        }
        Insert: {
          file_name: string
          file_size?: number
          file_type: string
          id?: string
          message_id: string
          storage_path: string
        }
        Update: {
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangar_talk_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "hangar_talk_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      hangar_talk_messages: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          key_id: number
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          key_id: number
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          key_id?: number
        }
        Relationships: []
      }
      hangar_talk_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          key_id: number
          message_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          key_id: number
          message_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          key_id?: number
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangar_talk_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "hangar_talk_messages"
            referencedColumns: ["id"]
          },
        ]
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
      member_engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          key_id: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          key_id: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          key_id?: number
        }
        Relationships: []
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
      new_member_applications: {
        Row: {
          address: string
          city: string
          created_at: string
          eaa_number: string
          eaa_verified: boolean
          email: string
          fee_amount: number
          fees_verified: boolean
          first_name: string
          id: string
          last_name: string
          processed: boolean
          processed_at: string | null
          quarter_applied: string
          roster_key_id: number | null
          state: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          eaa_number: string
          eaa_verified?: boolean
          email: string
          fee_amount?: number
          fees_verified?: boolean
          first_name: string
          id?: string
          last_name: string
          processed?: boolean
          processed_at?: string | null
          quarter_applied: string
          roster_key_id?: number | null
          state: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          eaa_number?: string
          eaa_verified?: boolean
          email?: string
          fee_amount?: number
          fees_verified?: boolean
          first_name?: string
          id?: string
          last_name?: string
          processed?: boolean
          processed_at?: string | null
          quarter_applied?: string
          roster_key_id?: number | null
          state?: string
          zip_code?: string
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          created_at: string
          extracted_text: string | null
          extraction_error: string | null
          extraction_status: string
          id: string
          issue_date: string
          search_vector: unknown
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          issue_date: string
          search_vector?: unknown
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string
          id?: string
          issue_date?: string
          search_vector?: unknown
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      volunteering_applications: {
        Row: {
          created_at: string
          id: string
          key_id: number
          member_email: string | null
          member_name: string
          member_phone: string | null
          opportunity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: number
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          opportunity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: number
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteering_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteering_opportunities"
            referencedColumns: ["id"]
          },
        ]
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
      check_email_and_eaa_in_roster: {
        Args: { _eaa_number: string; _email: string }
        Returns: boolean
      }
      check_email_in_roster: { Args: { _email: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      engagement_kpis: {
        Args: never
        Returns: {
          active_30d: number
          active_7d: number
          dormant_60d: number
          highly_engaged_30d: number
          service_page_views_30d: number
          total_active_members: number
        }[]
      }
      engagement_trend: {
        Args: never
        Returns: {
          active_members: number
          week_start: string
        }[]
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_directory_members: {
        Args: never
        Returns: {
          aircraft_built: string
          aircraft_owned: string
          aircraft_project: string
          cell_phone: string
          country: string
          current_standing: string
          eaa_number: string
          eagle_flight_volunteer: boolean
          eagle_pilot: boolean
          email: string
          first_name: string
          home_phone: string
          imc: boolean
          key_id: number
          last_name: string
          member_type: string
          nickname: string
          preferred_city: string
          preferred_state: string
          ratings: string
          street_address_1: string
          street_address_2: string
          vmc: boolean
          young_eagle_pilot: boolean
          young_eagle_volunteer: boolean
          zip_code: string
        }[]
      }
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
      is_officer: { Args: { _user_email: string }; Returns: boolean }
      member_update_own_record:
        | {
            Args: {
              _address_private?: boolean
              _aircraft_built?: string
              _aircraft_owned?: string
              _aircraft_project?: string
              _cell_phone?: string
              _cell_phone_private?: boolean
              _country?: string
              _email?: string
              _email_private?: boolean
              _home_phone?: string
              _home_phone_private?: boolean
              _key_id: number
              _nickname?: string
              _other_info?: string
              _preferred_city?: string
              _preferred_state?: string
              _ratings?: string
              _spouse?: string
              _street_address_1?: string
              _street_address_2?: string
              _zip_code?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _address_private?: boolean
              _aircraft_built?: string
              _aircraft_owned?: string
              _aircraft_project?: string
              _cell_phone?: string
              _cell_phone_private?: boolean
              _country?: string
              _eagle_flight_volunteer?: boolean
              _eagle_pilot?: boolean
              _email?: string
              _email_private?: boolean
              _home_phone?: string
              _home_phone_private?: boolean
              _key_id: number
              _nickname?: string
              _other_info?: string
              _preferred_city?: string
              _preferred_state?: string
              _ratings?: string
              _spouse?: string
              _street_address_1?: string
              _street_address_2?: string
              _young_eagle_pilot?: boolean
              _young_eagle_volunteer?: boolean
              _zip_code?: string
            }
            Returns: undefined
          }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      promote_pending_roles: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reassign_buddy: { Args: { _application_id: string }; Returns: undefined }
      search_newsletters: {
        Args: { _query: string }
        Returns: {
          extraction_status: string
          id: string
          issue_date: string
          match_count: number
          rank: number
          snippet: string
          storage_path: string
          title: string
        }[]
      }
      ts_lexize_words: {
        Args: { _query: string }
        Returns: {
          lexeme: string
        }[]
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
