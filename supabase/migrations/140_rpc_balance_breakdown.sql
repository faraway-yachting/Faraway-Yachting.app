-- Migration 140: Add balance breakdown fields to get_wallets_with_balances RPC
-- Returns individual components so the UI can show a tooltip with the formula

DROP FUNCTION IF EXISTS get_wallets_with_balances();

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
  calculated_balance DECIMAL(15,2),
  total_topups DECIMAL(15,2),
  total_paid_reimbursements DECIMAL(15,2),
  total_submitted_expenses DECIMAL(15,2)
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
    )::DECIMAL(15,2) AS calculated_balance,
    COALESCE((
      SELECT SUM(t.amount)
      FROM petty_cash_topups t
      WHERE t.wallet_id = w.id AND t.status = 'completed'
    ), 0)::DECIMAL(15,2) AS total_topups,
    COALESCE((
      SELECT SUM(r.final_amount)
      FROM petty_cash_reimbursements r
      WHERE r.wallet_id = w.id AND r.status = 'paid'
    ), 0)::DECIMAL(15,2) AS total_paid_reimbursements,
    COALESCE((
      SELECT SUM(e.amount)
      FROM petty_cash_expenses e
      WHERE e.wallet_id = w.id AND e.status = 'submitted'
    ), 0)::DECIMAL(15,2) AS total_submitted_expenses
  FROM petty_cash_wallets w
  WHERE (
    is_current_user_super_admin()
    OR w.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = auth.uid()
        AND uca.company_id = w.company_id
    )
  )
  ORDER BY w.wallet_name;
$$;
