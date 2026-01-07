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
          company_id: string | null
          role: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'accountant' | 'captain' | 'viewer'
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
          type: 'customer' | 'vendor' | 'both'
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
          type: 'customer' | 'vendor' | 'both'
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
          type?: 'customer' | 'vendor' | 'both'
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
          charter_period_from?: string | null
          charter_period_to?: string | null
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
          charter_period_from?: string | null
          charter_period_to?: string | null
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
          quotation_date: string
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
          quotation_date: string
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
          quotation_date?: string
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
          invoice_id: string
          client_id: string | null
          client_name: string
          receipt_date: string
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
          receipt_number: string
          invoice_id: string
          client_id?: string | null
          client_name: string
          receipt_date: string
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
          receipt_number?: string
          invoice_id?: string
          client_id?: string | null
          client_name?: string
          receipt_date?: string
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
          amount: number
          line_order: number | null
        }
        Insert: {
          id?: string
          receipt_id: string
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
          receipt_id?: string
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
          payment_method: string
          bank_account_id: string | null
          reference: string | null
          remark: string | null
        }
        Insert: {
          id?: string
          receipt_id: string
          payment_date: string
          amount: number
          payment_method: string
          bank_account_id?: string | null
          reference?: string | null
          remark?: string | null
        }
        Update: {
          id?: string
          receipt_id?: string
          payment_date?: string
          amount?: number
          payment_method?: string
          bank_account_id?: string | null
          reference?: string | null
          remark?: string | null
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
          vendor_id: string
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
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          expense_number: string
          vendor_id: string
          vendor_name: string
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
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          expense_number?: string
          vendor_id?: string
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
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
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
          company_id: string
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
          company_id: string
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
          company_id?: string
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
          company_id: string | null
          document_type: 'quotation' | 'invoice' | 'receipt'
          fields: Json
          default_terms_and_conditions: string | null
          default_validity_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          document_type: 'quotation' | 'invoice' | 'receipt'
          fields: Json
          default_terms_and_conditions?: string | null
          default_validity_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          document_type?: 'quotation' | 'invoice' | 'receipt'
          fields?: Json
          default_terms_and_conditions?: string | null
          default_validity_days?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_settings_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
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
