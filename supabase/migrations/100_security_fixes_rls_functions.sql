-- Migration 100: Security Fixes - RLS Policies, Function Search Paths, Extension
-- Fixes Supabase linter warnings for:
--   1. RLS policies using USING(true) on company-scoped tables
--   2. Function search path mutable
--   3. pg_net extension in public schema
--   4. Dangerous permissive policy on petty_cash_reimbursements
--
-- Tables intentionally left with permissive policies (global lookups/references):
--   hr_leave_types, hr_positions, hr_document_types, hr_departments,
--   hr_employment_types, booking_lookups, booking_settings, booking_agencies,
--   external_boats, meet_greeters, public_calendar_links, audit_log

-- ============================================================================
-- SAFETY CHECK: Warn about users who may lose access
-- This migration restricts data access to company members only.
-- Users without user_company_access records (and who aren't super admins)
-- will lose access to data in the affected tables.
-- ============================================================================

DO $$
DECLARE
  orphan_count INTEGER;
  orphan_list TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(up.id::text || ' (' || COALESCE(up.full_name, up.email, 'unknown') || ')', ', ')
  INTO orphan_count, orphan_list
  FROM user_profiles up
  WHERE up.is_super_admin IS NOT TRUE
    AND NOT EXISTS (
      SELECT 1 FROM user_company_access uca WHERE uca.user_id = up.id
    );

  IF orphan_count > 0 THEN
    RAISE WARNING '[Migration 100] % user(s) have NO user_company_access records and are NOT super admins. They will lose access to company-scoped data: %',
      orphan_count, orphan_list;
  ELSE
    RAISE NOTICE '[Migration 100] All non-super-admin users have user_company_access records. Safe to proceed.';
  END IF;
END $$;

-- ============================================================================
-- PART 1: Tables with direct company_id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 employees (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "employees_delete" ON employees
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.2 leave_policies (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage leave_policies" ON leave_policies;

CREATE POLICY "leave_policies_select" ON leave_policies
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_policies_insert" ON leave_policies
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_policies_update" ON leave_policies
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_policies_delete" ON leave_policies
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.3 leave_requests (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage leave_requests" ON leave_requests;

CREATE POLICY "leave_requests_select" ON leave_requests
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_requests_insert" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_requests_update" ON leave_requests
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "leave_requests_delete" ON leave_requests
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.4 payroll_runs (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage payroll_runs" ON payroll_runs;

CREATE POLICY "payroll_runs_select" ON payroll_runs
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "payroll_runs_insert" ON payroll_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "payroll_runs_update" ON payroll_runs
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "payroll_runs_delete" ON payroll_runs
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.5 beam_merchant_accounts (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "beam_merchant_accounts_select" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_insert" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_update" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_delete" ON beam_merchant_accounts;

CREATE POLICY "beam_merchant_accounts_select" ON beam_merchant_accounts
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "beam_merchant_accounts_insert" ON beam_merchant_accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "beam_merchant_accounts_update" ON beam_merchant_accounts
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "beam_merchant_accounts_delete" ON beam_merchant_accounts
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.6 petty_cash_reimbursement_batches (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read batches" ON petty_cash_reimbursement_batches;
DROP POLICY IF EXISTS "Authenticated users can insert batches" ON petty_cash_reimbursement_batches;
DROP POLICY IF EXISTS "Authenticated users can update batches" ON petty_cash_reimbursement_batches;

CREATE POLICY "petty_cash_reimbursement_batches_select" ON petty_cash_reimbursement_batches
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_insert" ON petty_cash_reimbursement_batches
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_update" ON petty_cash_reimbursement_batches
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_delete" ON petty_cash_reimbursement_batches
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.7 recurring_journal_templates (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage recurring templates" ON recurring_journal_templates;

CREATE POLICY "recurring_journal_templates_select" ON recurring_journal_templates
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "recurring_journal_templates_insert" ON recurring_journal_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "recurring_journal_templates_update" ON recurring_journal_templates
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "recurring_journal_templates_delete" ON recurring_journal_templates
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ----------------------------------------------------------------------------
-- 1.8 vat_filings (company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage vat filings" ON vat_filings;

CREATE POLICY "vat_filings_select" ON vat_filings
  FOR SELECT TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "vat_filings_insert" ON vat_filings
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "vat_filings_update" ON vat_filings
  FOR UPDATE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

CREATE POLICY "vat_filings_delete" ON vat_filings
  FOR DELETE TO authenticated
  USING (user_has_company_access(auth.uid(), company_id));

-- ============================================================================
-- PART 2: Tables inheriting security from employees
-- These use employee_id IN (SELECT id FROM employees) — employees RLS
-- filters by company_id, so child tables inherit that restriction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 employee_boat_assignments (employee_id -> employees.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage employee_boat_assignments" ON employee_boat_assignments;

CREATE POLICY "employee_boat_assignments_select" ON employee_boat_assignments
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_boat_assignments_insert" ON employee_boat_assignments
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_boat_assignments_update" ON employee_boat_assignments
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_boat_assignments_delete" ON employee_boat_assignments
  FOR DELETE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

-- ----------------------------------------------------------------------------
-- 2.2 employee_charter_rates (employee_id -> employees.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage employee_charter_rates" ON employee_charter_rates;

CREATE POLICY "employee_charter_rates_select" ON employee_charter_rates
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_charter_rates_insert" ON employee_charter_rates
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_charter_rates_update" ON employee_charter_rates
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_charter_rates_delete" ON employee_charter_rates
  FOR DELETE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

-- ----------------------------------------------------------------------------
-- 2.3 employee_documents (employee_id -> employees.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage employee_documents" ON employee_documents;

CREATE POLICY "employee_documents_select" ON employee_documents
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_documents_insert" ON employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_documents_update" ON employee_documents
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "employee_documents_delete" ON employee_documents
  FOR DELETE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

-- ----------------------------------------------------------------------------
-- 2.4 leave_balances (employee_id -> employees.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage leave_balances" ON leave_balances;

CREATE POLICY "leave_balances_select" ON leave_balances
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "leave_balances_insert" ON leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees));

CREATE POLICY "leave_balances_update" ON leave_balances
  FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

CREATE POLICY "leave_balances_delete" ON leave_balances
  FOR DELETE TO authenticated
  USING (employee_id IN (SELECT id FROM employees));

-- ============================================================================
-- PART 3: Tables inheriting from payroll_runs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 payroll_slips (payroll_run_id -> payroll_runs.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage payroll_slips" ON payroll_slips;

CREATE POLICY "payroll_slips_select" ON payroll_slips
  FOR SELECT TO authenticated
  USING (payroll_run_id IN (SELECT id FROM payroll_runs));

CREATE POLICY "payroll_slips_insert" ON payroll_slips
  FOR INSERT TO authenticated
  WITH CHECK (payroll_run_id IN (SELECT id FROM payroll_runs));

CREATE POLICY "payroll_slips_update" ON payroll_slips
  FOR UPDATE TO authenticated
  USING (payroll_run_id IN (SELECT id FROM payroll_runs));

CREATE POLICY "payroll_slips_delete" ON payroll_slips
  FOR DELETE TO authenticated
  USING (payroll_run_id IN (SELECT id FROM payroll_runs));

-- ============================================================================
-- PART 4: Tables inheriting from beam_merchant_accounts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 beam_transactions (merchant_account_id -> beam_merchant_accounts.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "beam_transactions_select" ON beam_transactions;
DROP POLICY IF EXISTS "beam_transactions_insert" ON beam_transactions;
DROP POLICY IF EXISTS "beam_transactions_update" ON beam_transactions;
DROP POLICY IF EXISTS "beam_transactions_delete" ON beam_transactions;

CREATE POLICY "beam_transactions_select" ON beam_transactions
  FOR SELECT TO authenticated
  USING (merchant_account_id IN (SELECT id FROM beam_merchant_accounts));

CREATE POLICY "beam_transactions_insert" ON beam_transactions
  FOR INSERT TO authenticated
  WITH CHECK (merchant_account_id IN (SELECT id FROM beam_merchant_accounts));

CREATE POLICY "beam_transactions_update" ON beam_transactions
  FOR UPDATE TO authenticated
  USING (merchant_account_id IN (SELECT id FROM beam_merchant_accounts));

CREATE POLICY "beam_transactions_delete" ON beam_transactions
  FOR DELETE TO authenticated
  USING (merchant_account_id IN (SELECT id FROM beam_merchant_accounts));

-- ============================================================================
-- PART 5: Booking child tables
-- bookings table does NOT have company_id, so we join through
-- bookings.project_id -> projects.company_id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 booking_crew (booking_id -> bookings.project_id -> projects.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage booking_crew" ON booking_crew;

CREATE POLICY "booking_crew_select" ON booking_crew
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_crew_insert" ON booking_crew
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_crew_update" ON booking_crew
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_crew_delete" ON booking_crew
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5.2 booking_guests (booking_id -> bookings.project_id -> projects.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "booking_guests_select" ON booking_guests;
DROP POLICY IF EXISTS "booking_guests_insert" ON booking_guests;
DROP POLICY IF EXISTS "booking_guests_update" ON booking_guests;
DROP POLICY IF EXISTS "booking_guests_delete" ON booking_guests;

CREATE POLICY "booking_guests_select" ON booking_guests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_guests_insert" ON booking_guests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_guests_update" ON booking_guests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_guests_delete" ON booking_guests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5.3 booking_payments (booking_id -> bookings.project_id -> projects.company_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage booking_payments" ON booking_payments;

CREATE POLICY "booking_payments_select" ON booking_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_payments_insert" ON booking_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_payments_update" ON booking_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "booking_payments_delete" ON booking_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access(auth.uid(), p.company_id)
    )
  );

-- ============================================================================
-- PART 6: Special cases
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 intercompany_charter_fees (dual company: agency_company_id + owner_company_id)
-- User needs access to EITHER company to see the record.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view intercompany charter fees" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "Authenticated users can insert intercompany charter fees" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "Authenticated users can update intercompany charter fees" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "Authenticated users can delete intercompany charter fees" ON intercompany_charter_fees;

CREATE POLICY "intercompany_charter_fees_select" ON intercompany_charter_fees
  FOR SELECT TO authenticated
  USING (
    user_has_company_access(auth.uid(), agency_company_id)
    OR user_has_company_access(auth.uid(), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_insert" ON intercompany_charter_fees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_company_access(auth.uid(), agency_company_id)
    OR user_has_company_access(auth.uid(), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_update" ON intercompany_charter_fees
  FOR UPDATE TO authenticated
  USING (
    user_has_company_access(auth.uid(), agency_company_id)
    OR user_has_company_access(auth.uid(), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_delete" ON intercompany_charter_fees
  FOR DELETE TO authenticated
  USING (
    user_has_company_access(auth.uid(), agency_company_id)
    OR user_has_company_access(auth.uid(), owner_company_id)
  );

-- ----------------------------------------------------------------------------
-- 6.2 notifications (user-targeted via target_user_id)
-- SELECT: users see their own notifications (keep existing or use target filter)
-- INSERT: any authenticated user can create (system-triggered notifications)
-- UPDATE/DELETE: only target user or super admin
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth users can read notifications" ON notifications;
DROP POLICY IF EXISTS "Auth users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Auth users can update notifications" ON notifications;
DROP POLICY IF EXISTS "Auth users can delete notifications" ON notifications;

-- SELECT: users see notifications targeted to them
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- INSERT: any authenticated user can create notifications (system events)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- UPDATE: only target user (e.g. mark as read) or super admin
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (
    target_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- DELETE: only target user or super admin
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE TO authenticated
  USING (
    target_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ----------------------------------------------------------------------------
-- 6.3 petty_cash_reimbursements - drop dangerous permissive policy
-- The proper policies from migration 032 remain intact.
-- This "Allow all access" policy (likely added via dashboard) overrides them.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all access to petty_cash_reimbursements" ON petty_cash_reimbursements;

-- ----------------------------------------------------------------------------
-- 6.4 project_historical_pl (conditional - may have been created via dashboard)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_historical_pl') THEN
    -- Check if the table has a company_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'project_historical_pl' AND column_name = 'company_id'
    ) THEN
      DROP POLICY IF EXISTS "project_historical_pl_select" ON project_historical_pl;
      DROP POLICY IF EXISTS "project_historical_pl_insert" ON project_historical_pl;
      DROP POLICY IF EXISTS "project_historical_pl_update" ON project_historical_pl;
      DROP POLICY IF EXISTS "project_historical_pl_delete" ON project_historical_pl;

      EXECUTE 'CREATE POLICY "project_historical_pl_select" ON project_historical_pl
        FOR SELECT TO authenticated
        USING (user_has_company_access(auth.uid(), company_id))';

      EXECUTE 'CREATE POLICY "project_historical_pl_insert" ON project_historical_pl
        FOR INSERT TO authenticated
        WITH CHECK (user_has_company_access(auth.uid(), company_id))';

      EXECUTE 'CREATE POLICY "project_historical_pl_update" ON project_historical_pl
        FOR UPDATE TO authenticated
        USING (user_has_company_access(auth.uid(), company_id))';

      EXECUTE 'CREATE POLICY "project_historical_pl_delete" ON project_historical_pl
        FOR DELETE TO authenticated
        USING (user_has_company_access(auth.uid(), company_id))';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 7: Fix function search paths
-- ============================================================================

ALTER FUNCTION public.bookings_search_vector_update() SET search_path = public;
ALTER FUNCTION public.contacts_search_vector_update() SET search_path = public;
ALTER FUNCTION public.expenses_search_vector_update() SET search_path = public;
ALTER FUNCTION public.search_records(text, text, int) SET search_path = public;

-- ============================================================================
-- PART 8: pg_net extension
-- NOTE: pg_net does not support SET SCHEMA. This is a known Supabase limitation.
-- The linter warning for "extension in public schema" can be safely ignored for pg_net.
-- ============================================================================
