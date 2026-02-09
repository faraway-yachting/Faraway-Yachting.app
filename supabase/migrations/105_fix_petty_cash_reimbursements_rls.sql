-- Migration 105: Fix petty_cash_reimbursements RLS policies
--
-- Problem: The original policies from migration 032 are broken:
--   1. INSERT policy only allows wallet owner, but managers auto-create reimbursements
--   2. Manager ALL policy uses obsolete user_profiles.role field (app uses user_module_roles)
--   3. Migration 092 made company_id nullable, so NULL IN (SELECT...) evaluates to false
--   4. No InitPlan optimization was applied (migration 103 skipped this table)
--
-- Fix: Replace all 3 broken policies with proper company-access-based policies
-- that go through the wallet's company_id (matching petty_cash_expenses from migration 103)

-- ============================================================================
-- Drop broken policies from migration 032
-- ============================================================================
DROP POLICY IF EXISTS "Users view own or company reimbursements" ON petty_cash_reimbursements;
DROP POLICY IF EXISTS "Users can create reimbursements for own wallet" ON petty_cash_reimbursements;
DROP POLICY IF EXISTS "Managers can manage reimbursements" ON petty_cash_reimbursements;

-- ============================================================================
-- SELECT: wallet owner OR company access through wallet
-- ============================================================================
CREATE POLICY "petty_cash_reimbursements_select" ON petty_cash_reimbursements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_reimbursements.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR user_has_company_access((select auth.uid()), pcw.company_id)
      )
    )
  );

-- ============================================================================
-- INSERT: wallet owner OR super admin OR company admin/manager
-- (managers auto-create reimbursements for submitted expenses)
-- ============================================================================
CREATE POLICY "petty_cash_reimbursements_insert" ON petty_cash_reimbursements
  FOR INSERT TO authenticated
  WITH CHECK (
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
          AND uca.access_type IN ('admin', 'manager')
        )
      )
    )
  );

-- ============================================================================
-- UPDATE: wallet owner OR super admin OR company admin/manager
-- ============================================================================
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
          AND uca.access_type IN ('admin', 'manager')
        )
      )
    )
  );

-- ============================================================================
-- DELETE: super admin OR company admin/manager (not wallet owner)
-- ============================================================================
CREATE POLICY "petty_cash_reimbursements_delete" ON petty_cash_reimbursements
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE pcw.id = petty_cash_reimbursements.wallet_id
      AND uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );
