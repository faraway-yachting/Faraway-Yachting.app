-- Migration 102: Fix RLS InitPlan Performance
-- Addresses Supabase linter warning: auth_rls_initplan
-- Wraps auth.uid() in (select auth.uid()) so PostgreSQL evaluates it once
-- per query (as an InitPlan) instead of re-evaluating per row.
-- All DROP/CREATE use IF EXISTS for idempotency.

-- ============================================================================
-- PART 1: Tables with direct company_id using user_has_company_access()
-- Pattern: auth.uid() -> (select auth.uid())
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 employees
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

CREATE POLICY "employees_select" ON employees
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "employees_insert" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "employees_update" ON employees
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "employees_delete" ON employees
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.2 leave_policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "leave_policies_select" ON leave_policies;
DROP POLICY IF EXISTS "leave_policies_insert" ON leave_policies;
DROP POLICY IF EXISTS "leave_policies_update" ON leave_policies;
DROP POLICY IF EXISTS "leave_policies_delete" ON leave_policies;

CREATE POLICY "leave_policies_select" ON leave_policies
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_policies_insert" ON leave_policies
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_policies_update" ON leave_policies
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_policies_delete" ON leave_policies
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.3 leave_requests
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;

CREATE POLICY "leave_requests_select" ON leave_requests
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_requests_insert" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_requests_update" ON leave_requests
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "leave_requests_delete" ON leave_requests
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.4 payroll_runs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_runs_select" ON payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_insert" ON payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_update" ON payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_delete" ON payroll_runs;

CREATE POLICY "payroll_runs_select" ON payroll_runs
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "payroll_runs_insert" ON payroll_runs
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "payroll_runs_update" ON payroll_runs
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "payroll_runs_delete" ON payroll_runs
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.5 beam_merchant_accounts
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "beam_merchant_accounts_select" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_insert" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_update" ON beam_merchant_accounts;
DROP POLICY IF EXISTS "beam_merchant_accounts_delete" ON beam_merchant_accounts;

CREATE POLICY "beam_merchant_accounts_select" ON beam_merchant_accounts
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "beam_merchant_accounts_insert" ON beam_merchant_accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "beam_merchant_accounts_update" ON beam_merchant_accounts
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "beam_merchant_accounts_delete" ON beam_merchant_accounts
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.6 petty_cash_reimbursement_batches
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "petty_cash_reimbursement_batches_select" ON petty_cash_reimbursement_batches;
DROP POLICY IF EXISTS "petty_cash_reimbursement_batches_insert" ON petty_cash_reimbursement_batches;
DROP POLICY IF EXISTS "petty_cash_reimbursement_batches_update" ON petty_cash_reimbursement_batches;
DROP POLICY IF EXISTS "petty_cash_reimbursement_batches_delete" ON petty_cash_reimbursement_batches;

CREATE POLICY "petty_cash_reimbursement_batches_select" ON petty_cash_reimbursement_batches
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_insert" ON petty_cash_reimbursement_batches
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_update" ON petty_cash_reimbursement_batches
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "petty_cash_reimbursement_batches_delete" ON petty_cash_reimbursement_batches
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.7 recurring_journal_templates
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "recurring_journal_templates_select" ON recurring_journal_templates;
DROP POLICY IF EXISTS "recurring_journal_templates_insert" ON recurring_journal_templates;
DROP POLICY IF EXISTS "recurring_journal_templates_update" ON recurring_journal_templates;
DROP POLICY IF EXISTS "recurring_journal_templates_delete" ON recurring_journal_templates;

CREATE POLICY "recurring_journal_templates_select" ON recurring_journal_templates
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "recurring_journal_templates_insert" ON recurring_journal_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "recurring_journal_templates_update" ON recurring_journal_templates
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "recurring_journal_templates_delete" ON recurring_journal_templates
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ----------------------------------------------------------------------------
-- 1.8 vat_filings
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "vat_filings_select" ON vat_filings;
DROP POLICY IF EXISTS "vat_filings_insert" ON vat_filings;
DROP POLICY IF EXISTS "vat_filings_update" ON vat_filings;
DROP POLICY IF EXISTS "vat_filings_delete" ON vat_filings;

CREATE POLICY "vat_filings_select" ON vat_filings
  FOR SELECT TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "vat_filings_insert" ON vat_filings
  FOR INSERT TO authenticated
  WITH CHECK (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "vat_filings_update" ON vat_filings
  FOR UPDATE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

CREATE POLICY "vat_filings_delete" ON vat_filings
  FOR DELETE TO authenticated
  USING (user_has_company_access((select auth.uid()), company_id));

-- ============================================================================
-- PART 2: Booking child tables (JOIN through bookings -> projects)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 booking_crew
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "booking_crew_select" ON booking_crew;
DROP POLICY IF EXISTS "booking_crew_insert" ON booking_crew;
DROP POLICY IF EXISTS "booking_crew_update" ON booking_crew;
DROP POLICY IF EXISTS "booking_crew_delete" ON booking_crew;

CREATE POLICY "booking_crew_select" ON booking_crew
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_crew_insert" ON booking_crew
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_crew_update" ON booking_crew
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_crew_delete" ON booking_crew
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_crew.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 2.2 booking_guests
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
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_guests_insert" ON booking_guests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_guests_update" ON booking_guests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_guests_delete" ON booking_guests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_guests.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 2.3 booking_payments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "booking_payments_select" ON booking_payments;
DROP POLICY IF EXISTS "booking_payments_insert" ON booking_payments;
DROP POLICY IF EXISTS "booking_payments_update" ON booking_payments;
DROP POLICY IF EXISTS "booking_payments_delete" ON booking_payments;

CREATE POLICY "booking_payments_select" ON booking_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_payments_insert" ON booking_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_payments_update" ON booking_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "booking_payments_delete" ON booking_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = booking_payments.booking_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

-- ============================================================================
-- PART 3: Special cases
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 intercompany_charter_fees (dual company access)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "intercompany_charter_fees_select" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "intercompany_charter_fees_insert" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "intercompany_charter_fees_update" ON intercompany_charter_fees;
DROP POLICY IF EXISTS "intercompany_charter_fees_delete" ON intercompany_charter_fees;

CREATE POLICY "intercompany_charter_fees_select" ON intercompany_charter_fees
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), agency_company_id)
    OR user_has_company_access((select auth.uid()), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_insert" ON intercompany_charter_fees
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_company_access((select auth.uid()), agency_company_id)
    OR user_has_company_access((select auth.uid()), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_update" ON intercompany_charter_fees
  FOR UPDATE TO authenticated
  USING (
    user_has_company_access((select auth.uid()), agency_company_id)
    OR user_has_company_access((select auth.uid()), owner_company_id)
  );

CREATE POLICY "intercompany_charter_fees_delete" ON intercompany_charter_fees
  FOR DELETE TO authenticated
  USING (
    user_has_company_access((select auth.uid()), agency_company_id)
    OR user_has_company_access((select auth.uid()), owner_company_id)
  );

-- ----------------------------------------------------------------------------
-- 3.2 notifications (user-targeted)
-- INSERT policy already uses (select auth.uid()), so skip it.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (
    target_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
  );

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (
    target_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
  );

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE TO authenticated
  USING (
    target_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
  );
