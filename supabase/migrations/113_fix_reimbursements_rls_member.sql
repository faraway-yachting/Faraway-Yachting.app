-- Fix: Add 'member' to petty_cash_reimbursements INSERT policy
-- so interns (who have 'member' company access) can create reimbursements
-- when submitting expenses.
--
-- The expense creation flow creates both an expense and a reimbursement.
-- Migration 109 added 'member' to petty_cash_expenses INSERT but missed
-- petty_cash_reimbursements INSERT.

DROP POLICY IF EXISTS "petty_cash_reimbursements_insert" ON petty_cash_reimbursements;
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
          AND uca.access_type IN ('admin', 'manager', 'member')
        )
      )
    )
  );
