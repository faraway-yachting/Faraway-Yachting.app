-- Migration 106: Petty Cash Performance Optimization
--
-- 1. Composite indexes for common query patterns (status + wallet_id, status + bank_account_id)
-- 2. SQL function to calculate wallet balances in a single query instead of 4

-- ============================================================================
-- PART 1: Composite indexes for petty cash query patterns
-- ============================================================================

-- Used by balance calculation: SUM(amount) WHERE wallet_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_pc_expenses_wallet_status
  ON petty_cash_expenses(wallet_id, status);

CREATE INDEX IF NOT EXISTS idx_pc_topups_wallet_status
  ON petty_cash_topups(wallet_id, status);

-- Used by reimbursement queries filtering by status + wallet or bank account
CREATE INDEX IF NOT EXISTS idx_pc_reimbursements_status_wallet
  ON petty_cash_reimbursements(status, wallet_id);

-- Partial index for approved reimbursements with bank accounts (transfer summary)
CREATE INDEX IF NOT EXISTS idx_pc_reimbursements_status_bank
  ON petty_cash_reimbursements(status, bank_account_id)
  WHERE bank_account_id IS NOT NULL;

-- ============================================================================
-- PART 2: Function to calculate wallet balances in one query
-- Replaces 4 separate queries (wallets + topups + expenses + reimbursements)
-- SECURITY DEFINER bypasses RLS for internal aggregation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_wallets_with_balances()
RETURNS TABLE (
  id UUID,
  wallet_name TEXT,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  company_id UUID,
  company_name TEXT,
  balance DECIMAL(15,2),
  beginning_balance DECIMAL(15,2),
  currency TEXT,
  status TEXT,
  balance_limit DECIMAL(15,2),
  low_balance_threshold DECIMAL(15,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  calculated_balance DECIMAL(15,2)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id,
    w.wallet_name,
    w.user_id,
    w.user_name,
    w.user_email,
    w.company_id,
    w.company_name,
    w.balance,
    w.beginning_balance,
    w.currency,
    w.status,
    w.balance_limit,
    w.low_balance_threshold,
    w.created_at,
    w.updated_at,
    (
      COALESCE(w.balance, 0)
      + COALESCE((
        SELECT SUM(t.amount)
        FROM petty_cash_topups t
        WHERE t.wallet_id = w.id AND t.status = 'completed'
      ), 0)
      + COALESCE((
        SELECT SUM(r.final_amount)
        FROM petty_cash_reimbursements r
        WHERE r.wallet_id = w.id AND r.status = 'paid'
      ), 0)
      - COALESCE((
        SELECT SUM(e.amount)
        FROM petty_cash_expenses e
        WHERE e.wallet_id = w.id AND e.status = 'submitted'
      ), 0)
    )::DECIMAL(15,2) AS calculated_balance
  FROM petty_cash_wallets w
  WHERE (
    -- Only return wallets the user can see (same logic as petty_cash_wallets_select RLS)
    is_current_user_super_admin()
    OR w.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = auth.uid()
      AND uca.company_id = w.company_id
      AND uca.access_type IN ('admin', 'manager')
    )
  )
  ORDER BY w.wallet_name;
$$;

COMMENT ON FUNCTION get_wallets_with_balances() IS 'Returns all accessible wallets with calculated balances in a single query. Replaces 4 separate queries.';
