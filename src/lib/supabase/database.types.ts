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
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_id: string | null
          role: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
          is_active: boolean
          is_super_admin: boolean
          last_module: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
          is_active?: boolean
          is_super_admin?: boolean
          last_module?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
          is_active?: boolean
          is_super_admin?: boolean
          last_module?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_module_roles: {
        Row: {
          id: string
          user_id: string
          module: 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr'
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module: 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr'
          role: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module?: 'accounting' | 'bookings' | 'inventory' | 'maintenance' | 'customers' | 'hr'
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          tax_id: string
          registered_address: Json
          billing_address: Json
          same_as_billing_address: boolean
          contact_information: Json
          currency: string
          is_active: boolean
          is_vat_registered: boolean
          vat_rate: number | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tax_id: string
          registered_address: Json
          billing_address: Json
          same_as_billing_address?: boolean
          contact_information: Json
          currency?: string
          is_active?: boolean
          is_vat_registered?: boolean
          vat_rate?: number | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tax_id?: string
          registered_address?: Json
          billing_address?: Json
          same_as_billing_address?: boolean
          contact_information?: Json
          currency?: string
          is_active?: boolean
          is_vat_registered?: boolean
          vat_rate?: number | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          name: string
          type: string[]
          contact_person: string | null
          email: string | null
          phone: string | null
          tax_id: string | null
          billing_address: Json | null
          default_currency: string
          payment_terms: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string[]
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          tax_id?: string | null
          billing_address?: Json | null
          default_currency?: string
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string[]
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          tax_id?: string | null
          billing_address?: Json | null
          default_currency?: string
          payment_terms?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          code: string
          company_id: string
          type: 'yacht' | 'charter' | 'event' | 'other' | null
          description: string | null
          participants: Json
          status: 'active' | 'inactive' | 'completed'
          management_fee_percentage: number
          intercompany_owner_company_id: string | null
          intercompany_fee_day_charter: number | null
          intercompany_fee_overnight: number | null
          intercompany_fee_cabin: number | null
          intercompany_fee_other: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          company_id: string
          type?: 'yacht' | 'charter' | 'event' | 'other' | null
          description?: string | null
          participants?: Json
          status?: 'active' | 'inactive' | 'completed'
          management_fee_percentage?: number
          intercompany_owner_company_id?: string | null
          intercompany_fee_day_charter?: number | null
          intercompany_fee_overnight?: number | null
          intercompany_fee_cabin?: number | null
          intercompany_fee_other?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          company_id?: string
          type?: 'yacht' | 'charter' | 'event' | 'other' | null
          description?: string | null
          participants?: Json
          status?: 'active' | 'inactive' | 'completed'
          management_fee_percentage?: number
          intercompany_owner_company_id?: string | null
          intercompany_fee_day_charter?: number | null
          intercompany_fee_overnight?: number | null
          intercompany_fee_cabin?: number | null
          intercompany_fee_other?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      employees: {
        Row: {
          id: string
          employee_id: string
          user_profile_id: string | null
          picture_url: string | null
          full_name_en: string
          full_name_th: string | null
          nickname: string | null
          email: string | null
          phone: string | null
          line_id: string | null
          employment_type: string
          company_id: string | null
          position: string | null
          status: 'active' | 'on_leave' | 'resigned' | 'terminated'
          start_date: string | null
          probation_end_date: string | null
          contract_end_date: string | null
          resignation_date: string | null
          base_salary: number
          currency: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id?: string
          user_profile_id?: string | null
          picture_url?: string | null
          full_name_en: string
          full_name_th?: string | null
          nickname?: string | null
          email?: string | null
          phone?: string | null
          line_id?: string | null
          employment_type?: string
          company_id?: string | null
          position?: string | null
          status?: 'active' | 'on_leave' | 'resigned' | 'terminated'
          start_date?: string | null
          probation_end_date?: string | null
          contract_end_date?: string | null
          resignation_date?: string | null
          base_salary?: number
          currency?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          user_profile_id?: string | null
          picture_url?: string | null
          full_name_en?: string
          full_name_th?: string | null
          nickname?: string | null
          email?: string | null
          phone?: string | null
          line_id?: string | null
          employment_type?: string
          company_id?: string | null
          position?: string | null
          status?: 'active' | 'on_leave' | 'resigned' | 'terminated'
          start_date?: string | null
          probation_end_date?: string | null
          contract_end_date?: string | null
          resignation_date?: string | null
          base_salary?: number
          currency?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_positions: {
        Row: {
          id: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      hr_employment_types: {
        Row: {
          id: string
          name: string
          label: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          label: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          label?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      employee_boat_assignments: {
        Row: {
          id: string
          employee_id: string
          boat_id: string
          role_on_boat: string | null
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          boat_id: string
          role_on_boat?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          boat_id?: string
          role_on_boat?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_charter_rates: {
        Row: {
          id: string
          employee_id: string
          charter_rate_type: 'half_day' | 'full_day' | 'overnight' | 'sleep_on_boat' | 'other'
          season: 'high' | 'low'
          rate_amount: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          charter_rate_type: 'half_day' | 'full_day' | 'overnight' | 'sleep_on_boat' | 'other'
          season: 'high' | 'low'
          rate_amount?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          charter_rate_type?: 'half_day' | 'full_day' | 'overnight' | 'sleep_on_boat' | 'other'
          season?: 'high' | 'low'
          rate_amount?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          id: string
          employee_id: string
          document_type: string
          document_name: string
          file_url: string | null
          file_name: string | null
          issue_date: string | null
          expiry_date: string | null
          alert_days_before: number
          notes: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          document_type?: string
          document_name: string
          file_url?: string | null
          file_name?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          alert_days_before?: number
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          document_type?: string
          document_name?: string
          file_url?: string | null
          file_name?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          alert_days_before?: number
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_document_types: {
        Row: {
          id: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      commission_records: {
        Row: {
          id: string
          boat_id: string | null
          charter_date_from: string | null
          charter_date_to: string | null
          charter_type: string | null
          booking_type: string
          charter_fee: number
          management_fee: number
          net_income: number
          commission_rate: number
          total_commission: number
          booking_owner_id: string | null
          currency: string
          notes: string | null
          created_by: string | null
          booking_id: string | null
          source: string
          management_fee_overridden: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          boat_id?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_type?: string | null
          booking_type: string
          charter_fee?: number
          management_fee?: number
          net_income?: number
          commission_rate?: number
          total_commission?: number
          booking_owner_id?: string | null
          currency?: string
          notes?: string | null
          created_by?: string | null
          booking_id?: string | null
          source?: string
          management_fee_overridden?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          boat_id?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_type?: string | null
          booking_type?: string
          charter_fee?: number
          management_fee?: number
          net_income?: number
          commission_rate?: number
          total_commission?: number
          booking_owner_id?: string | null
          currency?: string
          notes?: string | null
          created_by?: string | null
          booking_id?: string | null
          source?: string
          management_fee_overridden?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      intercompany_charter_fees: {
        Row: {
          id: string
          receipt_id: string | null
          receipt_number: string | null
          agency_company_id: string | null
          owner_company_id: string | null
          project_id: string | null
          charter_type: string | null
          charter_date: string | null
          charter_fee_amount: number
          currency: string | null
          status: string
          settled_date: string | null
          settlement_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          receipt_id?: string | null
          receipt_number?: string | null
          agency_company_id?: string | null
          owner_company_id?: string | null
          project_id?: string | null
          charter_type?: string | null
          charter_date?: string | null
          charter_fee_amount: number
          currency?: string | null
          status?: string
          settled_date?: string | null
          settlement_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string | null
          receipt_number?: string | null
          agency_company_id?: string | null
          owner_company_id?: string | null
          project_id?: string | null
          charter_type?: string | null
          charter_date?: string | null
          charter_fee_amount?: number
          currency?: string | null
          status?: string
          settled_date?: string | null
          settlement_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_number: string
          type: string
          status: string
          title: string
          date_from: string
          date_to: string
          time: string | null
          hold_until: string | null
          project_id: string | null
          external_boat_name: string | null
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          number_of_guests: number | null
          booking_owner: string
          agent_name: string | null
          agent_platform: string | null
          meet_and_greeter: string | null
          destination: string | null
          pickup_location: string | null
          currency: string
          total_price: number | null
          deposit_amount: number | null
          deposit_due_date: string | null
          deposit_paid_date: string | null
          balance_amount: number | null
          balance_due_date: string | null
          balance_paid_date: string | null
          deposit_receipt_id: string | null
          final_receipt_id: string | null
          invoice_id: string | null
          expense_ids: string[] | null
          internal_notes: string | null
          customer_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          contact_channel: string | null
          payment_status: string | null
          charter_fee: number | null
          extra_charges: number | null
          admin_fee: number | null
          beam_charge_id: string | null
          departure_from: string | null
          arrival_to: string | null
          charter_time: string | null
          commission_rate: number | null
          total_commission: number | null
          commission_deduction: number | null
          commission_received: number | null
          finance_note: string | null
          finance_attachments: unknown
          internal_note_attachments: unknown
          updated_by: string | null
          updated_by_name: string | null
          charter_cost: number | null
          charter_cost_currency: string | null
          charter_expense_status: string | null
          linked_expense_id: string | null
          meet_greeter_id: string | null
        }
        Insert: {
          id?: string
          booking_number: string
          type?: string
          status?: string
          title: string
          date_from: string
          date_to: string
          time?: string | null
          hold_until?: string | null
          project_id?: string | null
          external_boat_name?: string | null
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          number_of_guests?: number | null
          booking_owner: string
          agent_name?: string | null
          agent_platform?: string | null
          meet_and_greeter?: string | null
          destination?: string | null
          pickup_location?: string | null
          currency?: string
          total_price?: number | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          deposit_paid_date?: string | null
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_date?: string | null
          deposit_receipt_id?: string | null
          final_receipt_id?: string | null
          invoice_id?: string | null
          expense_ids?: string[] | null
          internal_notes?: string | null
          customer_notes?: string | null
          created_by?: string | null
          contact_channel?: string | null
          payment_status?: string | null
          charter_fee?: number | null
          extra_charges?: number | null
          admin_fee?: number | null
          beam_charge_id?: string | null
          departure_from?: string | null
          arrival_to?: string | null
          charter_time?: string | null
          commission_rate?: number | null
          total_commission?: number | null
          commission_deduction?: number | null
          commission_received?: number | null
          finance_note?: string | null
          finance_attachments?: unknown
          internal_note_attachments?: unknown
          updated_by?: string | null
          updated_by_name?: string | null
          charter_cost?: number | null
          charter_cost_currency?: string | null
          charter_expense_status?: string | null
          linked_expense_id?: string | null
          meet_greeter_id?: string | null
        }
        Update: {
          id?: string
          booking_number?: string
          type?: string
          status?: string
          title?: string
          date_from?: string
          date_to?: string
          time?: string | null
          hold_until?: string | null
          project_id?: string | null
          external_boat_name?: string | null
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          number_of_guests?: number | null
          booking_owner?: string
          agent_name?: string | null
          agent_platform?: string | null
          meet_and_greeter?: string | null
          destination?: string | null
          pickup_location?: string | null
          currency?: string
          total_price?: number | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          deposit_paid_date?: string | null
          balance_amount?: number | null
          balance_due_date?: string | null
          balance_paid_date?: string | null
          deposit_receipt_id?: string | null
          final_receipt_id?: string | null
          invoice_id?: string | null
          expense_ids?: string[] | null
          internal_notes?: string | null
          customer_notes?: string | null
          created_by?: string | null
          contact_channel?: string | null
          payment_status?: string | null
          charter_fee?: number | null
          extra_charges?: number | null
          admin_fee?: number | null
          beam_charge_id?: string | null
          departure_from?: string | null
          arrival_to?: string | null
          charter_time?: string | null
          commission_rate?: number | null
          total_commission?: number | null
          commission_deduction?: number | null
          commission_received?: number | null
          finance_note?: string | null
          finance_attachments?: unknown
          internal_note_attachments?: unknown
          updated_by?: string | null
          updated_by_name?: string | null
          charter_cost?: number | null
          charter_cost_currency?: string | null
          charter_expense_status?: string | null
          linked_expense_id?: string | null
          meet_greeter_id?: string | null
        }
        Relationships: []
      }
      meet_greeters: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_guests: {
        Row: {
          id: string
          booking_id: string
          guest_name: string
          guest_email: string | null
          guest_phone: string | null
          nationality: string | null
          passport_number: string | null
          cabin_number: string | null
          dietary_requirements: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          guest_name: string
          guest_email?: string | null
          guest_phone?: string | null
          nationality?: string | null
          passport_number?: string | null
          cabin_number?: string | null
          dietary_requirements?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          guest_name?: string
          guest_email?: string | null
          guest_phone?: string | null
          nationality?: string | null
          passport_number?: string | null
          cabin_number?: string | null
          dietary_requirements?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      booking_payments: {
        Row: {
          id: string
          booking_id: string
          payment_type: string
          amount: number
          currency: string
          due_date: string | null
          paid_date: string | null
          note: string | null
          paid_to_company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          payment_type?: string
          amount: number
          currency?: string
          due_date?: string | null
          paid_date?: string | null
          note?: string | null
          paid_to_company_id?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          payment_type?: string
          amount?: number
          currency?: string
          due_date?: string | null
          paid_date?: string | null
          note?: string | null
          paid_to_company_id?: string | null
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          id: string
          boat_colors: unknown
          external_boats: unknown
          banner_image_url: string | null
          calendar_display: unknown
          updated_at: string
        }
        Insert: {
          id?: string
          boat_colors?: unknown
          external_boats?: unknown
          banner_image_url?: string | null
          calendar_display?: unknown
        }
        Update: {
          boat_colors?: unknown
          external_boats?: unknown
          banner_image_url?: string | null
          calendar_display?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          message: string
          link: string | null
          reference_id: string
          reference_number: string | null
          target_role: string
          target_user_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          message: string
          link?: string | null
          reference_id: string
          reference_number?: string | null
          target_role?: string
          target_user_id?: string | null
          read?: boolean
        }
        Update: {
          type?: string
          title?: string
          message?: string
          link?: string | null
          reference_id?: string
          reference_number?: string | null
          target_role?: string
          target_user_id?: string | null
          read?: boolean
        }
        Relationships: []
      }
      booking_crew: {
        Row: {
          id: string
          booking_id: string
          employee_id: string
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          employee_id: string
          role?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          employee_id?: string
          role?: string | null
        }
        Relationships: []
      }
      booking_agencies: {
        Row: {
          id: string
          contact_id: string
          platform: string | null
          commission_rate: number | null
          default_currency: string
          contract_url: string | null
          contract_filename: string | null
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          platform?: string | null
          commission_rate?: number | null
          default_currency?: string
          contract_url?: string | null
          contract_filename?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          contact_id?: string
          platform?: string | null
          commission_rate?: number | null
          default_currency?: string
          contract_url?: string | null
          contract_filename?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_agencies_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      beam_merchant_accounts: {
        Row: {
          id: string
          company_id: string
          merchant_id: string
          merchant_name: string
          settlement_bank_account_id: string | null
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          merchant_id: string
          merchant_name: string
          settlement_bank_account_id?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          merchant_id?: string
          merchant_name?: string
          settlement_bank_account_id?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beam_merchant_accounts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beam_merchant_accounts_settlement_bank_account_id_fkey"
            columns: ["settlement_bank_account_id"]
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      beam_transactions: {
        Row: {
          id: string
          merchant_account_id: string
          charge_id: string
          source_id: string | null
          transaction_date: string
          transaction_time: string | null
          settlement_date: string | null
          settlement_status: string | null
          invoice_no: string | null
          invoice_date: string | null
          currency: string
          gross_amount: number
          fee_rate: number | null
          fee_amount: number
          vat_amount: number
          net_amount: number
          payment_method: string | null
          card_brand: string | null
          card_country: string | null
          card_holder_name: string | null
          booking_id: string | null
          receipt_id: string | null
          match_status: string
          match_confidence: number | null
          payment_link_description: string | null
          reference_id: string | null
          imported_at: string
          imported_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_account_id: string
          charge_id: string
          source_id?: string | null
          transaction_date: string
          transaction_time?: string | null
          settlement_date?: string | null
          settlement_status?: string | null
          invoice_no?: string | null
          invoice_date?: string | null
          currency?: string
          gross_amount: number
          fee_rate?: number | null
          fee_amount?: number
          vat_amount?: number
          net_amount: number
          payment_method?: string | null
          card_brand?: string | null
          card_country?: string | null
          card_holder_name?: string | null
          booking_id?: string | null
          receipt_id?: string | null
          match_status?: string
          match_confidence?: number | null
          payment_link_description?: string | null
          reference_id?: string | null
          imported_at?: string
          imported_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_account_id?: string
          charge_id?: string
          source_id?: string | null
          transaction_date?: string
          transaction_time?: string | null
          settlement_date?: string | null
          settlement_status?: string | null
          invoice_no?: string | null
          invoice_date?: string | null
          currency?: string
          gross_amount?: number
          fee_rate?: number | null
          fee_amount?: number
          vat_amount?: number
          net_amount?: number
          payment_method?: string | null
          card_brand?: string | null
          card_country?: string | null
          card_holder_name?: string | null
          booking_id?: string | null
          receipt_id?: string | null
          match_status?: string
          match_confidence?: number | null
          payment_link_description?: string | null
          reference_id?: string | null
          imported_at?: string
          imported_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beam_transactions_merchant_account_id_fkey"
            columns: ["merchant_account_id"]
            referencedRelation: "beam_merchant_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beam_transactions_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beam_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          }
        ]
      }
      external_boats: {
        Row: {
          id: string
          name: string
          display_name: string
          operator_name: string | null
          contact_id: string | null
          depart_from: string | null
          picture_url: string | null
          contract_url: string | null
          contract_filename: string | null
          contact_person: string | null
          contact_channel: string | null
          contact_value: string | null
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          operator_name?: string | null
          contact_id?: string | null
          depart_from?: string | null
          picture_url?: string | null
          contract_url?: string | null
          contract_filename?: string | null
          contact_person?: string | null
          contact_channel?: string | null
          contact_value?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          operator_name?: string | null
          contact_id?: string | null
          depart_from?: string | null
          picture_url?: string | null
          contract_url?: string | null
          contract_filename?: string | null
          contact_person?: string | null
          contact_channel?: string | null
          contact_value?: string | null
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_boats_contact_id_fkey"
            columns: ["contact_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      booking_lookups: {
        Row: {
          id: string
          category: string
          value: string
          label: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          value: string
          label: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          value?: string
          label?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          id: string
          company_id: string
          bank_information: Json
          account_name: string
          account_number: string
          currency: 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED'
          gl_account_code: string
          opening_balance: number | null
          opening_balance_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          bank_information: Json
          account_name: string
          account_number: string
          currency: 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED'
          gl_account_code: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          bank_information?: Json
          account_name?: string
          account_number?: string
          currency?: 'THB' | 'EUR' | 'USD' | 'SGD' | 'GBP' | 'AED'
          gl_account_code?: string
          opening_balance?: number | null
          opening_balance_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          invoice_number: string
          client_id: string | null
          client_name: string
          quotation_id: string | null
          charter_period_from: string | null
          charter_period_to: string | null
          boat_id: string | null
          charter_type: string | null
          charter_date_from: string | null
          charter_date_to: string | null
          charter_time: string | null
          invoice_date: string
          due_date: string
          payment_terms: string | null
          pricing_type: string
          subtotal: number
          tax_amount: number
          total_amount: number
          amount_paid: number
          amount_outstanding: number
          currency: string
          fx_rate: number | null
          status: string
          notes: string | null
          booking_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_number: string
          client_id?: string | null
          client_name: string
          quotation_id?: string | null
          booking_id?: string | null
          charter_period_from?: string | null
          charter_period_to?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          invoice_date: string
          due_date: string
          payment_terms?: string | null
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          amount_outstanding?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_number?: string
          client_id?: string | null
          client_name?: string
          quotation_id?: string | null
          booking_id?: string | null
          charter_period_from?: string | null
          charter_period_to?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          invoice_date?: string
          due_date?: string
          payment_terms?: string | null
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          amount_outstanding?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          wht_rate: string
          amount: number
          line_order: number | null
        }
        Insert: {
          id?: string
          invoice_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate?: number
          wht_rate?: string
          amount: number
          line_order?: number | null
        }
        Update: {
          id?: string
          invoice_id?: string
          project_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          wht_rate?: string
          amount?: number
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      quotations: {
        Row: {
          id: string
          company_id: string
          quotation_number: string
          client_id: string | null
          client_name: string
          charter_period_from: string | null
          charter_period_to: string | null
          boat_id: string | null
          charter_type: string | null
          charter_date_from: string | null
          charter_date_to: string | null
          charter_time: string | null
          date_created: string
          valid_until: string
          pricing_type: string
          subtotal: number
          tax_amount: number
          total_amount: number
          currency: string
          fx_rate: number | null
          status: string
          notes: string | null
          terms_and_conditions: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          quotation_number: string
          client_id?: string | null
          client_name: string
          charter_period_from?: string | null
          charter_period_to?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          date_created: string
          valid_until: string
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          quotation_number?: string
          client_id?: string | null
          client_name?: string
          charter_period_from?: string | null
          charter_period_to?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          date_created?: string
          valid_until?: string
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          terms_and_conditions?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      quotation_line_items: {
        Row: {
          id: string
          quotation_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          amount: number
          line_order: number | null
        }
        Insert: {
          id?: string
          quotation_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate?: number
          amount: number
          line_order?: number | null
        }
        Update: {
          id?: string
          quotation_id?: string
          project_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          amount?: number
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_line_items_quotation_id_fkey"
            columns: ["quotation_id"]
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          company_id: string
          receipt_number: string
          invoice_id: string | null
          client_id: string | null
          client_name: string
          receipt_date: string
          reference: string | null
          boat_id: string | null
          charter_type: string | null
          charter_date_from: string | null
          charter_date_to: string | null
          charter_time: string | null
          charter_period_from: string | null
          charter_period_to: string | null
          pricing_type: string
          subtotal: number
          tax_amount: number
          total_amount: number
          total_received: number | null
          currency: string
          fx_rate: number | null
          fx_rate_source: string | null
          fx_base_currency: string | null
          fx_target_currency: string | null
          fx_rate_date: string | null
          status: string
          notes: string | null
          original_receipt_number: string | null
          is_using_recycled_number: boolean
          revenue_recognition_status: string | null
          booking_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          receipt_number: string
          invoice_id?: string | null
          booking_id?: string | null
          client_id?: string | null
          client_name: string
          receipt_date: string
          reference?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          charter_period_from?: string | null
          charter_period_to?: string | null
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          total_received?: number | null
          currency?: string
          fx_rate?: number | null
          fx_rate_source?: string | null
          fx_base_currency?: string | null
          fx_target_currency?: string | null
          fx_rate_date?: string | null
          status?: string
          notes?: string | null
          original_receipt_number?: string | null
          is_using_recycled_number?: boolean
          revenue_recognition_status?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          receipt_number?: string
          invoice_id?: string | null
          booking_id?: string | null
          client_id?: string | null
          client_name?: string
          receipt_date?: string
          reference?: string | null
          boat_id?: string | null
          charter_type?: string | null
          charter_date_from?: string | null
          charter_date_to?: string | null
          charter_time?: string | null
          charter_period_from?: string | null
          charter_period_to?: string | null
          pricing_type?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          total_received?: number | null
          currency?: string
          fx_rate?: number | null
          fx_rate_source?: string | null
          fx_base_currency?: string | null
          fx_target_currency?: string | null
          fx_rate_date?: string | null
          status?: string
          notes?: string | null
          original_receipt_number?: string | null
          is_using_recycled_number?: boolean
          revenue_recognition_status?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      receipt_line_items: {
        Row: {
          id: string
          receipt_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          wht_rate: string
          custom_wht_amount: number | null
          amount: number
          line_order: number | null
          revenue_recognized: boolean
          recognition_date: string | null
          revenue_recognition_id: string | null
        }
        Insert: {
          id?: string
          receipt_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate?: number
          wht_rate?: string
          custom_wht_amount?: number | null
          amount: number
          line_order?: number | null
          revenue_recognized?: boolean
          recognition_date?: string | null
          revenue_recognition_id?: string | null
        }
        Update: {
          id?: string
          receipt_id?: string
          project_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          wht_rate?: string
          custom_wht_amount?: number | null
          amount?: number
          line_order?: number | null
          revenue_recognized?: boolean
          recognition_date?: string | null
          revenue_recognition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      receipt_payment_records: {
        Row: {
          id: string
          receipt_id: string
          payment_date: string
          amount: number
          received_at: string // 'cash' or bank_account_id
          remark: string | null
          fx_rate: number | null
          thb_amount: number | null
        }
        Insert: {
          id?: string
          receipt_id: string
          payment_date: string
          amount: number
          received_at: string // 'cash' or bank_account_id
          remark?: string | null
          fx_rate?: number | null
          thb_amount?: number | null
        }
        Update: {
          id?: string
          receipt_id?: string
          payment_date?: string
          amount?: number
          received_at?: string
          remark?: string | null
          fx_rate?: number | null
          thb_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_payment_records_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_payment_records_bank_account_id_fkey"
            columns: ["bank_account_id"]
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      recycled_receipt_numbers: {
        Row: {
          id: string
          company_id: string
          receipt_number: string
          voided_receipt_id: string
          voided_at: string
          reused_by_receipt_id: string | null
          reused_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          receipt_number: string
          voided_receipt_id: string
          voided_at?: string
          reused_by_receipt_id?: string | null
          reused_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          receipt_number?: string
          voided_receipt_id?: string
          voided_at?: string
          reused_by_receipt_id?: string | null
          reused_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recycled_receipt_numbers_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recycled_receipt_numbers_voided_receipt_id_fkey"
            columns: ["voided_receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recycled_receipt_numbers_reused_by_receipt_id_fkey"
            columns: ["reused_by_receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_notes: {
        Row: {
          id: string
          company_id: string
          credit_note_number: string
          invoice_id: string
          client_id: string | null
          client_name: string
          credit_note_date: string
          reason: string
          subtotal: number
          tax_amount: number
          total_amount: number
          currency: string
          fx_rate: number | null
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          credit_note_number: string
          invoice_id: string
          client_id?: string | null
          client_name: string
          credit_note_date: string
          reason: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          credit_note_number?: string
          invoice_id?: string
          client_id?: string | null
          client_name?: string
          credit_note_date?: string
          reason?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_note_line_items: {
        Row: {
          id: string
          credit_note_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          amount: number
          line_order: number | null
        }
        Insert: {
          id?: string
          credit_note_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate?: number
          amount: number
          line_order?: number | null
        }
        Update: {
          id?: string
          credit_note_id?: string
          project_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          amount?: number
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_line_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      debit_notes: {
        Row: {
          id: string
          company_id: string
          debit_note_number: string
          invoice_id: string
          client_id: string | null
          client_name: string
          debit_note_date: string
          reason: string
          subtotal: number
          tax_amount: number
          total_amount: number
          currency: string
          fx_rate: number | null
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          debit_note_number: string
          invoice_id: string
          client_id?: string | null
          client_name: string
          debit_note_date: string
          reason: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          debit_note_number?: string
          invoice_id?: string
          client_id?: string | null
          client_name?: string
          debit_note_date?: string
          reason?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          currency?: string
          fx_rate?: number | null
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      debit_note_line_items: {
        Row: {
          id: string
          debit_note_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          amount: number
          line_order: number | null
        }
        Insert: {
          id?: string
          debit_note_id: string
          project_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate?: number
          amount: number
          line_order?: number | null
        }
        Update: {
          id?: string
          debit_note_id?: string
          project_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          amount?: number
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_note_line_items_debit_note_id_fkey"
            columns: ["debit_note_id"]
            referencedRelation: "debit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          expense_number: string
          vendor_id: string | null
          vendor_name: string
          supplier_invoice_number: string | null
          expense_date: string
          due_date: string | null
          subtotal: number | null
          vat_amount: number | null
          total_amount: number | null
          wht_amount: number | null
          net_payable: number | null
          payment_status: string
          status: string
          currency: string
          fx_rate: number | null
          fx_rate_source: string | null
          fx_base_currency: string | null
          fx_target_currency: string | null
          fx_rate_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          attachments: unknown | null
        }
        Insert: {
          id?: string
          company_id: string
          expense_number: string
          vendor_id?: string | null
          vendor_name?: string
          supplier_invoice_number?: string | null
          expense_date: string
          due_date?: string | null
          subtotal?: number | null
          vat_amount?: number | null
          total_amount?: number | null
          wht_amount?: number | null
          net_payable?: number | null
          payment_status?: string
          status?: string
          currency?: string
          fx_rate?: number | null
          fx_rate_source?: string | null
          fx_base_currency?: string | null
          fx_target_currency?: string | null
          fx_rate_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          attachments?: unknown | null
        }
        Update: {
          id?: string
          company_id?: string
          expense_number?: string
          vendor_id?: string | null
          vendor_name?: string
          supplier_invoice_number?: string | null
          expense_date?: string
          due_date?: string | null
          subtotal?: number | null
          vat_amount?: number | null
          total_amount?: number | null
          wht_amount?: number | null
          net_payable?: number | null
          payment_status?: string
          status?: string
          currency?: string
          fx_rate?: number | null
          fx_rate_source?: string | null
          fx_base_currency?: string | null
          fx_target_currency?: string | null
          fx_rate_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          attachments?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_line_items: {
        Row: {
          id: string
          expense_id: string
          project_id: string
          description: string
          quantity: number | null
          unit_price: number | null
          tax_rate: number | null
          wht_rate: string | null
          amount: number | null
          account_code: string | null
          line_order: number | null
        }
        Insert: {
          id?: string
          expense_id: string
          project_id: string
          description: string
          quantity?: number | null
          unit_price?: number | null
          tax_rate?: number | null
          wht_rate?: string | null
          amount?: number | null
          account_code?: string | null
          line_order?: number | null
        }
        Update: {
          id?: string
          expense_id?: string
          project_id?: string
          description?: string
          quantity?: number | null
          unit_price?: number | null
          tax_rate?: number | null
          wht_rate?: string | null
          amount?: number | null
          account_code?: string | null
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_line_items_expense_id_fkey"
            columns: ["expense_id"]
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_line_items_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_payments: {
        Row: {
          id: string
          expense_id: string
          payment_date: string
          amount: number
          paid_from: string
          reference: string | null
          remark: string | null
        }
        Insert: {
          id?: string
          expense_id: string
          payment_date: string
          amount: number
          paid_from: string
          reference?: string | null
          remark?: string | null
        }
        Update: {
          id?: string
          expense_id?: string
          payment_date?: string
          amount?: number
          paid_from?: string
          reference?: string | null
          remark?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          }
        ]
      }
      petty_cash_wallets: {
        Row: {
          id: string
          wallet_name: string
          user_id: string | null
          user_name: string
          company_id: string
          balance: number
          currency: string
          status: string
          balance_limit: number | null
          low_balance_threshold: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_name: string
          user_id?: string | null
          user_name: string
          company_id: string
          balance?: number
          currency?: string
          status?: string
          balance_limit?: number | null
          low_balance_threshold?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_name?: string
          user_id?: string | null
          user_name?: string
          company_id?: string
          balance?: number
          currency?: string
          status?: string
          balance_limit?: number | null
          low_balance_threshold?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_wallets_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      petty_cash_expenses: {
        Row: {
          id: string
          expense_number: string
          wallet_id: string
          company_id: string | null
          expense_date: string
          description: string | null
          project_id: string
          amount: number | null
          status: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          expense_number: string
          wallet_id: string
          company_id?: string | null
          expense_date: string
          description?: string | null
          project_id: string
          amount?: number | null
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          expense_number?: string
          wallet_id?: string
          company_id?: string | null
          expense_date?: string
          description?: string | null
          project_id?: string
          amount?: number | null
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_expenses_wallet_id_fkey"
            columns: ["wallet_id"]
            referencedRelation: "petty_cash_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_expenses_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_expenses_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      petty_cash_topups: {
        Row: {
          id: string
          wallet_id: string
          amount: number
          bank_account_id: string | null
          topup_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          amount: number
          bank_account_id?: string | null
          topup_date: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          amount?: number
          bank_account_id?: string | null
          topup_date?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_topups_wallet_id_fkey"
            columns: ["wallet_id"]
            referencedRelation: "petty_cash_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_topups_bank_account_id_fkey"
            columns: ["bank_account_id"]
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      chart_of_accounts: {
        Row: {
          id: string
          code: string
          name: string
          account_type: string
          normal_balance: string
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          name: string
          account_type: string
          normal_balance: string
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          name?: string
          account_type?: string
          normal_balance?: string
          is_active?: boolean
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          reference_number: string
          entry_date: string
          company_id: string
          description: string
          status: string
          total_debit: number | null
          total_credit: number | null
          created_by: string | null
          created_at: string
          source_document_type: string | null
          source_document_id: string | null
          is_auto_generated: boolean
        }
        Insert: {
          id?: string
          reference_number: string
          entry_date: string
          company_id: string
          description: string
          status?: string
          total_debit?: number | null
          total_credit?: number | null
          created_by?: string | null
          created_at?: string
          source_document_type?: string | null
          source_document_id?: string | null
          is_auto_generated?: boolean
        }
        Update: {
          id?: string
          reference_number?: string
          entry_date?: string
          company_id?: string
          description?: string
          status?: string
          total_debit?: number | null
          total_credit?: number | null
          created_by?: string | null
          created_at?: string
          source_document_type?: string | null
          source_document_id?: string | null
          is_auto_generated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      journal_entry_lines: {
        Row: {
          id: string
          journal_entry_id: string
          account_code: string
          entry_type: string
          amount: number
          description: string | null
          line_order: number | null
        }
        Insert: {
          id?: string
          journal_entry_id: string
          account_code: string
          entry_type: string
          amount: number
          description?: string | null
          line_order?: number | null
        }
        Update: {
          id?: string
          journal_entry_id?: string
          account_code?: string
          entry_type?: string
          amount?: number
          description?: string | null
          line_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          }
        ]
      }
      wht_certificates: {
        Row: {
          id: string
          company_id: string
          certificate_number: string
          form_type: 'pnd3' | 'pnd53'
          payer_name: string
          payer_address: string | null
          payer_tax_id: string
          payee_vendor_id: string | null
          payee_name: string
          payee_address: string | null
          payee_tax_id: string | null
          payee_is_company: boolean
          payment_date: string
          income_type: string
          income_type_description: string | null
          amount_paid: number
          wht_rate: number
          wht_amount: number
          tax_period: string
          status: 'draft' | 'issued' | 'filed'
          issued_date: string | null
          filed_date: string | null
          submission_reference: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          certificate_number: string
          form_type: 'pnd3' | 'pnd53'
          payer_name: string
          payer_address?: string | null
          payer_tax_id: string
          payee_vendor_id?: string | null
          payee_name: string
          payee_address?: string | null
          payee_tax_id?: string | null
          payee_is_company?: boolean
          payment_date: string
          income_type: string
          income_type_description?: string | null
          amount_paid: number
          wht_rate: number
          wht_amount: number
          tax_period: string
          status?: 'draft' | 'issued' | 'filed'
          issued_date?: string | null
          filed_date?: string | null
          submission_reference?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          certificate_number?: string
          form_type?: 'pnd3' | 'pnd53'
          payer_name?: string
          payer_address?: string | null
          payer_tax_id?: string
          payee_vendor_id?: string | null
          payee_name?: string
          payee_address?: string | null
          payee_tax_id?: string | null
          payee_is_company?: boolean
          payment_date?: string
          income_type?: string
          income_type_description?: string | null
          amount_paid?: number
          wht_rate?: number
          wht_amount?: number
          tax_period?: string
          status?: 'draft' | 'issued' | 'filed'
          issued_date?: string | null
          filed_date?: string | null
          submission_reference?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wht_certificates_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificates_payee_vendor_id_fkey"
            columns: ["payee_vendor_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_wht_certificates: {
        Row: {
          expense_id: string
          wht_certificate_id: string
          created_at: string
        }
        Insert: {
          expense_id: string
          wht_certificate_id: string
          created_at?: string
        }
        Update: {
          expense_id?: string
          wht_certificate_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_wht_certificates_expense_id_fkey"
            columns: ["expense_id"]
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_wht_certificates_wht_certificate_id_fkey"
            columns: ["wht_certificate_id"]
            referencedRelation: "wht_certificates"
            referencedColumns: ["id"]
          }
        ]
      }
      number_format_settings: {
        Row: {
          id: string
          company_id: string
          document_type: 'quotation' | 'invoice' | 'receipt' | 'creditNote' | 'debitNote'
          prefix: string
          date_format: 'YYMM' | 'YYYYMM' | 'MMYY' | 'none'
          sequence_digits: number
          separator: '-' | '/' | ''
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          document_type: 'quotation' | 'invoice' | 'receipt' | 'creditNote' | 'debitNote'
          prefix: string
          date_format?: 'YYMM' | 'YYYYMM' | 'MMYY' | 'none'
          sequence_digits?: number
          separator?: '-' | '/' | ''
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          document_type?: 'quotation' | 'invoice' | 'receipt' | 'creditNote' | 'debitNote'
          prefix?: string
          date_format?: 'YYMM' | 'YYYYMM' | 'MMYY' | 'none'
          sequence_digits?: number
          separator?: '-' | '/' | ''
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_format_settings_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      pdf_settings: {
        Row: {
          id: string
          quotation: Json
          invoice: Json
          receipt: Json
          updated_at: string | null
        }
        Insert: {
          id?: string
          quotation?: Json
          invoice?: Json
          receipt?: Json
          updated_at?: string | null
        }
        Update: {
          id?: string
          quotation?: Json
          invoice?: Json
          receipt?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      accounting_events: {
        Row: {
          id: string
          event_type: string
          event_date: string
          status: 'pending' | 'processed' | 'failed' | 'cancelled'
          source_document_type: string | null
          source_document_id: string | null
          affected_companies: string[]
          event_data: Json
          processed_at: string | null
          error_message: string | null
          retry_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_type: string
          event_date: string
          status?: 'pending' | 'processed' | 'failed' | 'cancelled'
          source_document_type?: string | null
          source_document_id?: string | null
          affected_companies: string[]
          event_data?: Json
          processed_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          event_date?: string
          status?: 'pending' | 'processed' | 'failed' | 'cancelled'
          source_document_type?: string | null
          source_document_id?: string | null
          affected_companies?: string[]
          event_data?: Json
          processed_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_journal_entries: {
        Row: {
          id: string
          event_id: string
          journal_entry_id: string
          company_id: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          journal_entry_id: string
          company_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          journal_entry_id?: string
          company_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_journal_entries_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "accounting_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_journal_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_journal_entries_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      journal_event_settings: {
        Row: {
          id: string
          company_id: string
          event_type: string
          is_enabled: boolean
          auto_post: boolean
          default_debit_account: string | null
          default_credit_account: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          event_type: string
          is_enabled?: boolean
          auto_post?: boolean
          default_debit_account?: string | null
          default_credit_account?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          event_type?: string
          is_enabled?: boolean
          auto_post?: boolean
          default_debit_account?: string | null
          default_credit_account?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_event_settings_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      wht_from_customer: {
        Row: {
          id: string
          receipt_id: string
          receipt_line_item_id: string | null
          company_id: string
          customer_id: string | null
          customer_name: string
          customer_tax_id: string | null
          receipt_date: string
          base_amount: number
          wht_rate: number
          wht_amount: number
          currency: string
          status: 'pending' | 'received' | 'reconciled'
          certificate_number: string | null
          certificate_date: string | null
          certificate_file_url: string | null
          certificate_file_name: string | null
          period: string
          notes: string | null
          created_at: string
          updated_at: string
          received_at: string | null
          received_by: string | null
        }
        Insert: {
          id?: string
          receipt_id: string
          receipt_line_item_id?: string | null
          company_id: string
          customer_id?: string | null
          customer_name: string
          customer_tax_id?: string | null
          receipt_date: string
          base_amount: number
          wht_rate: number
          wht_amount: number
          currency?: string
          status?: 'pending' | 'received' | 'reconciled'
          certificate_number?: string | null
          certificate_date?: string | null
          certificate_file_url?: string | null
          certificate_file_name?: string | null
          period: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          received_at?: string | null
          received_by?: string | null
        }
        Update: {
          id?: string
          receipt_id?: string
          receipt_line_item_id?: string | null
          company_id?: string
          customer_id?: string | null
          customer_name?: string
          customer_tax_id?: string | null
          receipt_date?: string
          base_amount?: number
          wht_rate?: number
          wht_amount?: number
          currency?: string
          status?: 'pending' | 'received' | 'reconciled'
          certificate_number?: string | null
          certificate_date?: string | null
          certificate_file_url?: string | null
          certificate_file_name?: string | null
          period?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          received_at?: string | null
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wht_from_customer_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_from_customer_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_from_customer_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      yacht_products: {
        Row: {
          id: string
          yacht_source: 'own' | 'external'
          project_id: string | null
          external_yacht_id: string | null
          name: string
          charter_type: 'full_day_charter' | 'half_day_charter' | 'overnight_charter' | 'cabin_charter' | 'bareboat_charter' | 'other_charter'
          duration: string
          depart_from: string | null
          destination: string | null
          price: number | null
          currency: string
          default_time: string | null
          display_order: number
          is_active: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          yacht_source: 'own' | 'external'
          project_id?: string | null
          external_yacht_id?: string | null
          name: string
          charter_type: 'full_day_charter' | 'half_day_charter' | 'overnight_charter' | 'cabin_charter' | 'bareboat_charter' | 'other_charter'
          duration: string
          depart_from?: string | null
          destination?: string | null
          price?: number | null
          currency?: string
          default_time?: string | null
          display_order?: number
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          yacht_source?: 'own' | 'external'
          project_id?: string | null
          external_yacht_id?: string | null
          name?: string
          charter_type?: 'full_day_charter' | 'half_day_charter' | 'overnight_charter' | 'cabin_charter' | 'bareboat_charter' | 'other_charter'
          duration?: string
          depart_from?: string | null
          destination?: string | null
          price?: number | null
          currency?: string
          default_time?: string | null
          display_order?: number
          is_active?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yacht_products_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      public_calendar_links: {
        Row: {
          id: string
          token: string
          label: string
          project_ids: string[]
          visible_statuses: string[]
          is_active: boolean
          expires_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token: string
          label: string
          project_ids: string[]
          visible_statuses?: string[]
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          token?: string
          label?: string
          project_ids?: string[]
          visible_statuses?: string[]
          is_active?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_journals_atomic: {
        Args: {
          p_event_id: string
          p_journals: Json
        }
        Returns: Json
      }
      search_records: {
        Args: {
          p_table: string
          p_query: string
          p_limit?: number
        }
        Returns: Json[]
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
