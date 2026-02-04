-- Migration 090: Cleanup Duplicate RLS Policies
-- Previous migrations created new optimized policies but didn't drop all old ones.
-- This migration removes ALL old policy names to eliminate duplicates.

-- ============================================================================
-- PART 1: Fix remaining functions without SET search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_profiles WHERE id = auth.uid()),
    'viewer'
  );
$$;

-- ============================================================================
-- PART 2: Drop ALL old/duplicate policies on user_profiles
-- ============================================================================

DROP POLICY IF EXISTS "Allow insert for authenticated" ON user_profiles;
DROP POLICY IF EXISTS "Allow select for authenticated" ON user_profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles" ON user_profiles;

-- ============================================================================
-- PART 3: Drop ALL old/duplicate policies on companies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can select companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view active companies" ON companies;
DROP POLICY IF EXISTS "Staff can view companies" ON companies;
DROP POLICY IF EXISTS "Staff can insert companies" ON companies;
DROP POLICY IF EXISTS "Staff can update companies" ON companies;
DROP POLICY IF EXISTS "Staff can delete companies" ON companies;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- Recreate single optimized policy
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 4: Drop ALL old/duplicate policies on projects
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 5: Drop ALL old/duplicate policies on bank_accounts
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Authenticated users can view bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete" ON bank_accounts;

CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_accounts_delete" ON bank_accounts
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 6: Drop ALL old/duplicate policies on invoices
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 7: Drop ALL old/duplicate policies on invoice_line_items
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Authenticated users can view invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;

CREATE POLICY "invoice_line_items_select" ON invoice_line_items
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoice_line_items_insert" ON invoice_line_items
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoice_line_items_update" ON invoice_line_items
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "invoice_line_items_delete" ON invoice_line_items
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 8: Drop ALL old/duplicate policies on quotations
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage quotations" ON quotations;
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON quotations;
DROP POLICY IF EXISTS "quotations_select" ON quotations;
DROP POLICY IF EXISTS "quotations_insert" ON quotations;
DROP POLICY IF EXISTS "quotations_update" ON quotations;
DROP POLICY IF EXISTS "quotations_delete" ON quotations;

CREATE POLICY "quotations_select" ON quotations
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotations_insert" ON quotations
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotations_update" ON quotations
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotations_delete" ON quotations
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 9: Drop ALL old/duplicate policies on quotation_line_items
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage quotation line items" ON quotation_line_items;
DROP POLICY IF EXISTS "Authenticated users can view quotation line items" ON quotation_line_items;
DROP POLICY IF EXISTS "quotation_line_items_select" ON quotation_line_items;
DROP POLICY IF EXISTS "quotation_line_items_insert" ON quotation_line_items;
DROP POLICY IF EXISTS "quotation_line_items_update" ON quotation_line_items;
DROP POLICY IF EXISTS "quotation_line_items_delete" ON quotation_line_items;

CREATE POLICY "quotation_line_items_select" ON quotation_line_items
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotation_line_items_insert" ON quotation_line_items
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotation_line_items_update" ON quotation_line_items
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "quotation_line_items_delete" ON quotation_line_items
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 10: Drop ALL old/duplicate policies on receipts
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage receipts" ON receipts;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON receipts;
DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
DROP POLICY IF EXISTS "receipts_update" ON receipts;
DROP POLICY IF EXISTS "receipts_delete" ON receipts;

CREATE POLICY "receipts_select" ON receipts
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipts_insert" ON receipts
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipts_update" ON receipts
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipts_delete" ON receipts
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 11: Drop ALL old/duplicate policies on receipt_line_items
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage receipt line items" ON receipt_line_items;
DROP POLICY IF EXISTS "Authenticated users can view receipt line items" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_select" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_insert" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_update" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_delete" ON receipt_line_items;

CREATE POLICY "receipt_line_items_select" ON receipt_line_items
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_line_items_insert" ON receipt_line_items
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_line_items_update" ON receipt_line_items
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_line_items_delete" ON receipt_line_items
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 12: Drop ALL old/duplicate policies on receipt_payment_records
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage receipt payments" ON receipt_payment_records;
DROP POLICY IF EXISTS "Users view receipt payments" ON receipt_payment_records;
DROP POLICY IF EXISTS "authenticated_select_receipt_payment_records" ON receipt_payment_records;
DROP POLICY IF EXISTS "authenticated_insert_receipt_payment_records" ON receipt_payment_records;
DROP POLICY IF EXISTS "authenticated_update_receipt_payment_records" ON receipt_payment_records;
DROP POLICY IF EXISTS "authenticated_delete_receipt_payment_records" ON receipt_payment_records;

CREATE POLICY "receipt_payment_records_select" ON receipt_payment_records
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_payment_records_insert" ON receipt_payment_records
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_payment_records_update" ON receipt_payment_records
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "receipt_payment_records_delete" ON receipt_payment_records
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 13: Drop ALL old/duplicate policies on expenses
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON expenses;
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 14: Drop ALL old/duplicate policies on expense_line_items
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Authenticated users can view expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Users view expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_select" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_delete" ON expense_line_items;

CREATE POLICY "expense_line_items_select" ON expense_line_items
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_line_items_insert" ON expense_line_items
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_line_items_update" ON expense_line_items
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_line_items_delete" ON expense_line_items
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 15: Drop ALL old/duplicate policies on expense_payments
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage expense payments" ON expense_payments;
DROP POLICY IF EXISTS "Authenticated users can view expense payments" ON expense_payments;
DROP POLICY IF EXISTS "Users view expense payments" ON expense_payments;
DROP POLICY IF EXISTS "expense_payments_select" ON expense_payments;
DROP POLICY IF EXISTS "expense_payments_insert" ON expense_payments;
DROP POLICY IF EXISTS "expense_payments_update" ON expense_payments;
DROP POLICY IF EXISTS "expense_payments_delete" ON expense_payments;

CREATE POLICY "expense_payments_select" ON expense_payments
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_payments_insert" ON expense_payments
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_payments_update" ON expense_payments
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_payments_delete" ON expense_payments
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 16: Drop ALL old/duplicate policies on petty_cash_wallets
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage petty cash wallets" ON petty_cash_wallets;
DROP POLICY IF EXISTS "Authenticated users can view petty cash wallets" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_select" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_insert" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_update" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_delete" ON petty_cash_wallets;

CREATE POLICY "petty_cash_wallets_select" ON petty_cash_wallets
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_wallets_insert" ON petty_cash_wallets
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_wallets_update" ON petty_cash_wallets
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_wallets_delete" ON petty_cash_wallets
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 17: Drop ALL old/duplicate policies on petty_cash_expenses
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage petty cash expenses" ON petty_cash_expenses;
DROP POLICY IF EXISTS "Authenticated users can view petty cash expenses" ON petty_cash_expenses;
DROP POLICY IF EXISTS "Managers can manage petty cash expenses" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_select" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_insert" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_update" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_delete" ON petty_cash_expenses;

CREATE POLICY "petty_cash_expenses_select" ON petty_cash_expenses
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_expenses_insert" ON petty_cash_expenses
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_expenses_update" ON petty_cash_expenses
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_expenses_delete" ON petty_cash_expenses
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 18: Drop ALL old/duplicate policies on petty_cash_topups
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage petty cash topups" ON petty_cash_topups;
DROP POLICY IF EXISTS "Authenticated users can view petty cash topups" ON petty_cash_topups;
DROP POLICY IF EXISTS "Users view topups" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_select" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_insert" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_update" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_delete" ON petty_cash_topups;

CREATE POLICY "petty_cash_topups_select" ON petty_cash_topups
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_topups_insert" ON petty_cash_topups
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_topups_update" ON petty_cash_topups
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "petty_cash_topups_delete" ON petty_cash_topups
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 19: Drop ALL old/duplicate policies on chart_of_accounts
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage chart of accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Anyone can view chart of accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_select" ON chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_insert" ON chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_update" ON chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_delete" ON chart_of_accounts;

CREATE POLICY "chart_of_accounts_select" ON chart_of_accounts
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "chart_of_accounts_insert" ON chart_of_accounts
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "chart_of_accounts_update" ON chart_of_accounts
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "chart_of_accounts_delete" ON chart_of_accounts
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 20: Drop ALL old/duplicate policies on journal_entries
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Authenticated users can view journal entries" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON journal_entries;

CREATE POLICY "journal_entries_select" ON journal_entries
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entries_insert" ON journal_entries
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entries_update" ON journal_entries
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entries_delete" ON journal_entries
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 21: Drop ALL old/duplicate policies on journal_entry_lines
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Authenticated users can view journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete" ON journal_entry_lines;

CREATE POLICY "journal_entry_lines_select" ON journal_entry_lines
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entry_lines_insert" ON journal_entry_lines
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entry_lines_update" ON journal_entry_lines
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_entry_lines_delete" ON journal_entry_lines
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 22: Drop ALL old/duplicate policies on wht_certificates
-- ============================================================================

DROP POLICY IF EXISTS "Accountants can manage WHT certificates" ON wht_certificates;
DROP POLICY IF EXISTS "Users view WHT certificates from their company" ON wht_certificates;
DROP POLICY IF EXISTS "wht_certificates_select" ON wht_certificates;
DROP POLICY IF EXISTS "wht_certificates_insert" ON wht_certificates;
DROP POLICY IF EXISTS "wht_certificates_update" ON wht_certificates;
DROP POLICY IF EXISTS "wht_certificates_delete" ON wht_certificates;

CREATE POLICY "wht_certificates_select" ON wht_certificates
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_certificates_insert" ON wht_certificates
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_certificates_update" ON wht_certificates
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_certificates_delete" ON wht_certificates
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 23: Drop ALL old/duplicate policies on expense_wht_certificates
-- ============================================================================

DROP POLICY IF EXISTS "Accountants can manage expense WHT links" ON expense_wht_certificates;
DROP POLICY IF EXISTS "Users view expense WHT links" ON expense_wht_certificates;
DROP POLICY IF EXISTS "expense_wht_certificates_select" ON expense_wht_certificates;
DROP POLICY IF EXISTS "expense_wht_certificates_insert" ON expense_wht_certificates;
DROP POLICY IF EXISTS "expense_wht_certificates_update" ON expense_wht_certificates;
DROP POLICY IF EXISTS "expense_wht_certificates_delete" ON expense_wht_certificates;

CREATE POLICY "expense_wht_certificates_select" ON expense_wht_certificates
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_wht_certificates_insert" ON expense_wht_certificates
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_wht_certificates_update" ON expense_wht_certificates
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "expense_wht_certificates_delete" ON expense_wht_certificates
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 24: Drop ALL old/duplicate policies on user_module_roles
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_module_roles;
DROP POLICY IF EXISTS "Authenticated users can view module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Users can view their own module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can view all module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can insert module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can update module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can delete module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Admins can manage all module roles" ON user_module_roles;

-- ============================================================================
-- PART 25: Drop ALL old/duplicate policies on number_format_settings
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage number formats" ON number_format_settings;
DROP POLICY IF EXISTS "Users view number formats from their company" ON number_format_settings;
DROP POLICY IF EXISTS "number_format_settings_select" ON number_format_settings;
DROP POLICY IF EXISTS "number_format_settings_insert" ON number_format_settings;
DROP POLICY IF EXISTS "number_format_settings_update" ON number_format_settings;
DROP POLICY IF EXISTS "number_format_settings_delete" ON number_format_settings;

CREATE POLICY "number_format_settings_select" ON number_format_settings
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "number_format_settings_insert" ON number_format_settings
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "number_format_settings_update" ON number_format_settings
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "number_format_settings_delete" ON number_format_settings
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 26: Drop ALL old/duplicate policies on pdf_settings
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage PDF settings" ON pdf_settings;
DROP POLICY IF EXISTS "Users view PDF settings" ON pdf_settings;
DROP POLICY IF EXISTS "pdf_settings_select" ON pdf_settings;
DROP POLICY IF EXISTS "pdf_settings_insert" ON pdf_settings;
DROP POLICY IF EXISTS "pdf_settings_update" ON pdf_settings;
DROP POLICY IF EXISTS "pdf_settings_delete" ON pdf_settings;

CREATE POLICY "pdf_settings_select" ON pdf_settings
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "pdf_settings_insert" ON pdf_settings
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "pdf_settings_update" ON pdf_settings
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "pdf_settings_delete" ON pdf_settings
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 27: Drop ALL old/duplicate policies on cash_collections
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage cash collections" ON cash_collections;
DROP POLICY IF EXISTS "Authenticated users can view cash collections" ON cash_collections;
DROP POLICY IF EXISTS "cash_collections_select" ON cash_collections;
DROP POLICY IF EXISTS "cash_collections_insert" ON cash_collections;
DROP POLICY IF EXISTS "cash_collections_update" ON cash_collections;
DROP POLICY IF EXISTS "cash_collections_delete" ON cash_collections;

CREATE POLICY "cash_collections_select" ON cash_collections
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "cash_collections_insert" ON cash_collections
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "cash_collections_update" ON cash_collections
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "cash_collections_delete" ON cash_collections
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 28: Drop ALL old/duplicate policies on financial_periods
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage financial periods" ON financial_periods;
DROP POLICY IF EXISTS "Authenticated users can view financial periods" ON financial_periods;
DROP POLICY IF EXISTS "financial_periods_select" ON financial_periods;
DROP POLICY IF EXISTS "financial_periods_insert" ON financial_periods;
DROP POLICY IF EXISTS "financial_periods_update" ON financial_periods;
DROP POLICY IF EXISTS "financial_periods_delete" ON financial_periods;

CREATE POLICY "financial_periods_select" ON financial_periods
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "financial_periods_insert" ON financial_periods
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "financial_periods_update" ON financial_periods
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "financial_periods_delete" ON financial_periods
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 29: Drop ALL old/duplicate policies on permissions
-- ============================================================================

DROP POLICY IF EXISTS "permissions_read_all" ON permissions;
DROP POLICY IF EXISTS "permissions_write_super_admin" ON permissions;
DROP POLICY IF EXISTS "permissions_select" ON permissions;
DROP POLICY IF EXISTS "permissions_insert" ON permissions;
DROP POLICY IF EXISTS "permissions_update" ON permissions;
DROP POLICY IF EXISTS "permissions_delete" ON permissions;

CREATE POLICY "permissions_select" ON permissions
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "permissions_insert" ON permissions
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "permissions_update" ON permissions
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "permissions_delete" ON permissions
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 30: Drop ALL old/duplicate policies on bank_feed_lines
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can delete bank feed lines" ON bank_feed_lines;
DROP POLICY IF EXISTS "Authenticated users can insert bank feed lines" ON bank_feed_lines;
DROP POLICY IF EXISTS "Authenticated users can update bank feed lines" ON bank_feed_lines;
DROP POLICY IF EXISTS "Authenticated users can view bank feed lines" ON bank_feed_lines;
DROP POLICY IF EXISTS "bank_feed_lines_select" ON bank_feed_lines;
DROP POLICY IF EXISTS "bank_feed_lines_insert" ON bank_feed_lines;
DROP POLICY IF EXISTS "bank_feed_lines_update" ON bank_feed_lines;
DROP POLICY IF EXISTS "bank_feed_lines_delete" ON bank_feed_lines;

CREATE POLICY "bank_feed_lines_select" ON bank_feed_lines
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_feed_lines_insert" ON bank_feed_lines
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_feed_lines_update" ON bank_feed_lines
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_feed_lines_delete" ON bank_feed_lines
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 31: Drop ALL old/duplicate policies on bank_matches
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can delete bank matches" ON bank_matches;
DROP POLICY IF EXISTS "Authenticated users can insert bank matches" ON bank_matches;
DROP POLICY IF EXISTS "Authenticated users can update bank matches" ON bank_matches;
DROP POLICY IF EXISTS "Authenticated users can view bank matches" ON bank_matches;
DROP POLICY IF EXISTS "bank_matches_select" ON bank_matches;
DROP POLICY IF EXISTS "bank_matches_insert" ON bank_matches;
DROP POLICY IF EXISTS "bank_matches_update" ON bank_matches;
DROP POLICY IF EXISTS "bank_matches_delete" ON bank_matches;

CREATE POLICY "bank_matches_select" ON bank_matches
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_matches_insert" ON bank_matches
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_matches_update" ON bank_matches
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "bank_matches_delete" ON bank_matches
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 32: Drop ALL old/duplicate policies on journal_event_settings
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete settings for their companies" ON journal_event_settings;
DROP POLICY IF EXISTS "Users can insert settings for their companies" ON journal_event_settings;
DROP POLICY IF EXISTS "Users can update settings for their companies" ON journal_event_settings;
DROP POLICY IF EXISTS "Users can view settings for their companies" ON journal_event_settings;
DROP POLICY IF EXISTS "journal_event_settings_select" ON journal_event_settings;
DROP POLICY IF EXISTS "journal_event_settings_insert" ON journal_event_settings;
DROP POLICY IF EXISTS "journal_event_settings_update" ON journal_event_settings;
DROP POLICY IF EXISTS "journal_event_settings_delete" ON journal_event_settings;

CREATE POLICY "journal_event_settings_select" ON journal_event_settings
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_event_settings_insert" ON journal_event_settings
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_event_settings_update" ON journal_event_settings
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "journal_event_settings_delete" ON journal_event_settings
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 33: Drop ALL old/duplicate policies on accounting_events
-- ============================================================================

DROP POLICY IF EXISTS "Accountants can create events" ON accounting_events;
DROP POLICY IF EXISTS "Accountants can update events" ON accounting_events;
DROP POLICY IF EXISTS "Users can view events for their companies" ON accounting_events;
DROP POLICY IF EXISTS "accounting_events_select" ON accounting_events;
DROP POLICY IF EXISTS "accounting_events_insert" ON accounting_events;
DROP POLICY IF EXISTS "accounting_events_update" ON accounting_events;
DROP POLICY IF EXISTS "accounting_events_delete" ON accounting_events;

CREATE POLICY "accounting_events_select" ON accounting_events
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "accounting_events_insert" ON accounting_events
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "accounting_events_update" ON accounting_events
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "accounting_events_delete" ON accounting_events
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 34: Drop ALL old/duplicate policies on event_journal_entries
-- ============================================================================

DROP POLICY IF EXISTS "System can create event journal links" ON event_journal_entries;
DROP POLICY IF EXISTS "Users can view event journal links for their companies" ON event_journal_entries;
DROP POLICY IF EXISTS "event_journal_entries_select" ON event_journal_entries;
DROP POLICY IF EXISTS "event_journal_entries_insert" ON event_journal_entries;
DROP POLICY IF EXISTS "event_journal_entries_update" ON event_journal_entries;
DROP POLICY IF EXISTS "event_journal_entries_delete" ON event_journal_entries;

CREATE POLICY "event_journal_entries_select" ON event_journal_entries
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "event_journal_entries_insert" ON event_journal_entries
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "event_journal_entries_update" ON event_journal_entries
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "event_journal_entries_delete" ON event_journal_entries
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 35: Drop ALL old/duplicate policies on wht_from_customer
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert WHT from customer for their companies" ON wht_from_customer;
DROP POLICY IF EXISTS "Users can update WHT from customer for their companies" ON wht_from_customer;
DROP POLICY IF EXISTS "Users can view WHT from customer for their companies" ON wht_from_customer;
DROP POLICY IF EXISTS "wht_from_customer_select" ON wht_from_customer;
DROP POLICY IF EXISTS "wht_from_customer_insert" ON wht_from_customer;
DROP POLICY IF EXISTS "wht_from_customer_update" ON wht_from_customer;
DROP POLICY IF EXISTS "wht_from_customer_delete" ON wht_from_customer;

CREATE POLICY "wht_from_customer_select" ON wht_from_customer
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_from_customer_insert" ON wht_from_customer
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_from_customer_update" ON wht_from_customer
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "wht_from_customer_delete" ON wht_from_customer
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 36: Drop ALL old/duplicate policies on yacht_products
-- ============================================================================

DROP POLICY IF EXISTS "yacht_products_delete" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_insert" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_update" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_select" ON yacht_products;

CREATE POLICY "yacht_products_select" ON yacht_products
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "yacht_products_insert" ON yacht_products
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "yacht_products_update" ON yacht_products
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "yacht_products_delete" ON yacht_products
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 37: Drop ALL old/duplicate policies on role_permissions
-- ============================================================================

DROP POLICY IF EXISTS "role_permissions_delete" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_insert" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;

CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "role_permissions_insert" ON role_permissions
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "role_permissions_update" ON role_permissions
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "role_permissions_delete" ON role_permissions
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 38: Drop ALL old/duplicate policies on role_definitions
-- ============================================================================

DROP POLICY IF EXISTS "role_definitions_delete" ON role_definitions;
DROP POLICY IF EXISTS "role_definitions_insert" ON role_definitions;
DROP POLICY IF EXISTS "role_definitions_update" ON role_definitions;
DROP POLICY IF EXISTS "role_definitions_select" ON role_definitions;

CREATE POLICY "role_definitions_select" ON role_definitions
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "role_definitions_insert" ON role_definitions
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "role_definitions_update" ON role_definitions
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "role_definitions_delete" ON role_definitions
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 39: Drop ALL old/duplicate policies on role_menu_visibility
-- ============================================================================

DROP POLICY IF EXISTS "role_menu_visibility_delete" ON role_menu_visibility;
DROP POLICY IF EXISTS "role_menu_visibility_insert" ON role_menu_visibility;
DROP POLICY IF EXISTS "role_menu_visibility_update" ON role_menu_visibility;
DROP POLICY IF EXISTS "role_menu_visibility_select" ON role_menu_visibility;

CREATE POLICY "role_menu_visibility_select" ON role_menu_visibility
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "role_menu_visibility_insert" ON role_menu_visibility
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "role_menu_visibility_update" ON role_menu_visibility
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "role_menu_visibility_delete" ON role_menu_visibility
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 40: Drop ALL old/duplicate policies on role_data_scope
-- ============================================================================

DROP POLICY IF EXISTS "role_data_scope_delete" ON role_data_scope;
DROP POLICY IF EXISTS "role_data_scope_insert" ON role_data_scope;
DROP POLICY IF EXISTS "role_data_scope_update" ON role_data_scope;
DROP POLICY IF EXISTS "role_data_scope_select" ON role_data_scope;

CREATE POLICY "role_data_scope_select" ON role_data_scope
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "role_data_scope_insert" ON role_data_scope
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "role_data_scope_update" ON role_data_scope
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "role_data_scope_delete" ON role_data_scope
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 41: Drop duplicate policies on user_company_access
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete company access" ON user_company_access;

-- ============================================================================
-- PART 42: Drop duplicate policies on user_project_access
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete project access" ON user_project_access;

-- ============================================================================
-- Done! All duplicate policies removed, functions fixed.
-- ============================================================================
