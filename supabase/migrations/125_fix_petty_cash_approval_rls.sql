-- Migration 125: Fix petty cash reimbursement & expense UPDATE RLS for Accountants
--
-- Problem: The Accountant role has access_type = 'member' in user_company_access,
-- but the UPDATE policies for petty_cash_reimbursements and petty_cash_expenses
-- only allow ('admin', 'manager'). This blocks Accountants from:
--   1. Approving reimbursement claims (UPDATE status to 'approved')
--   2. Saving accounting details on petty cash expenses
--
-- Fix: Add 'member' to the UPDATE policies so Accountants can approve claims.

-- ============================================================================
-- 1. petty_cash_reimbursements UPDATE — add 'member'
-- ============================================================================
DROP POLICY IF EXISTS "petty_cash_reimbursements_update" ON petty_cash_reimbursements;
CREATE POLICY "petty_cash_reimbursements_update" ON petty_cash_reimbursements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_reimbursements.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.company_id = pcw.company_id
          AND uca.access_type IN ('admin', 'manager', 'member')
        )
      )
    )
  );

-- ============================================================================
-- 2. petty_cash_expenses UPDATE — add 'member'
-- ============================================================================
DROP POLICY IF EXISTS "petty_cash_expenses_update" ON petty_cash_expenses;
CREATE POLICY "petty_cash_expenses_update" ON petty_cash_expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_expenses.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.company_id = pcw.company_id
          AND uca.access_type IN ('admin', 'manager', 'member')
        )
      )
    )
  );
