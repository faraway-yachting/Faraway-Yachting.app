-- Migration 126: Fix petty cash INSERT/UPDATE RLS for Intern (member access_type)
--
-- Problem: Migration 125 fixed UPDATE policies on petty_cash_expenses and
-- petty_cash_reimbursements, but the Intern still can't CREATE expense claims because:
--   1. petty_cash_expenses INSERT policy (migration 103) only allows ('admin', 'manager')
--   2. petty_cash_wallets UPDATE policy (migration 103) only allows ('admin', 'manager')
--
-- The Intern has access_type = 'member' (set by migration 124), so both operations fail.
--
-- Fix: Add 'member' to both policies.

-- ============================================================================
-- 1. petty_cash_expenses INSERT — add 'member'
-- ============================================================================
DROP POLICY IF EXISTS "petty_cash_expenses_insert" ON petty_cash_expenses;
CREATE POLICY "petty_cash_expenses_insert" ON petty_cash_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
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

-- ============================================================================
-- 2. petty_cash_wallets UPDATE — add 'member'
-- ============================================================================
DROP POLICY IF EXISTS "petty_cash_wallets_update" ON petty_cash_wallets;
CREATE POLICY "petty_cash_wallets_update" ON petty_cash_wallets
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );
