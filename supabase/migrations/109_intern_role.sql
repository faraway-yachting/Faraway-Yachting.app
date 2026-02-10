-- ============================================================================
-- Intern Accounting Role
-- Formalizes the 'intern' role in the RBAC system with expense + petty cash
-- access, and fixes company access for existing intern users.
-- ============================================================================

-- 1. Role definition
INSERT INTO role_definitions (module, role_key, display_name, description, sort_order) VALUES
('accounting', 'intern', 'Intern', 'Expense entry and petty cash access for interns', 7)
ON CONFLICT (module, role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 2. Permissions (expenses + petty cash + supporting resources)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'intern', 'accounting.dashboard.view'),
('accounting', 'intern', 'accounting.expenses.view'),
('accounting', 'intern', 'accounting.expenses.create'),
('accounting', 'intern', 'accounting.expenses.edit'),
('accounting', 'intern', 'accounting.pettycash.view_own'),
('accounting', 'intern', 'accounting.pettycash.create_expense'),
('accounting', 'intern', 'accounting.contacts.view'),
('accounting', 'intern', 'accounting.chartofaccounts.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- 3. Menu visibility (dashboard, expenses, petty cash, contacts only)
INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
('accounting', 'intern', 'dashboard', true),
('accounting', 'intern', 'income', false),
('accounting', 'intern', 'expenses', true),
('accounting', 'intern', 'gl-categorization', false),
('accounting', 'intern', 'journal-entries', false),
('accounting', 'intern', 'bank-reconciliation', false),
('accounting', 'intern', 'finances', false),
('accounting', 'intern', 'petty-cash', true),
('accounting', 'intern', 'chart-of-accounts', false),
('accounting', 'intern', 'contacts', true),
('accounting', 'intern', 'companies', false),
('accounting', 'intern', 'reports', false),
('accounting', 'intern', 'settings', false)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET
  is_visible = EXCLUDED.is_visible;

-- 4. Data scopes
INSERT INTO role_data_scope (module, role_key, resource, scope_type) VALUES
('accounting', 'intern', 'expenses', 'company'),
('accounting', 'intern', 'income', 'own'),
('accounting', 'intern', 'invoices', 'own'),
('accounting', 'intern', 'journal', 'own'),
('accounting', 'intern', 'petty-cash', 'own'),
('accounting', 'intern', 'reports', 'own')
ON CONFLICT (module, role_key, resource) DO UPDATE SET
  scope_type = EXCLUDED.scope_type;

-- 5. Fix company access for existing intern users (viewer -> member)
-- The expenses INSERT RLS policy requires access_type IN ('admin','manager','member')
UPDATE user_company_access uca
SET access_type = 'member', updated_at = NOW()
FROM user_module_roles umr
WHERE umr.user_id = uca.user_id
  AND umr.module = 'accounting'
  AND umr.role = 'intern'
  AND uca.access_type = 'viewer';

-- 6. Fix petty_cash_wallets SELECT — add 'member' so interns can see company wallets
-- Previously only ('admin', 'manager') could see wallets at company level
DROP POLICY IF EXISTS "petty_cash_wallets_select" ON petty_cash_wallets;
CREATE POLICY "petty_cash_wallets_select" ON petty_cash_wallets
  FOR SELECT TO authenticated
  USING (
    is_current_user_super_admin()
    OR user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = (select auth.uid())
      AND uca.company_id = petty_cash_wallets.company_id
      AND uca.access_type IN ('admin', 'manager', 'member')
    )
  );

-- 7. Fix petty_cash_expenses INSERT — add 'member' so interns can add expenses on behalf
-- Previously only wallet owners, super admins, or ('admin', 'manager') could insert
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

-- 8. Fix get_wallets_with_balances() RPC — add 'member' to access check
-- This SECURITY DEFINER function bypasses RLS and has its own hardcoded access check.
-- The page uses this RPC (not direct table query), so the RLS fix alone doesn't help.
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
    is_current_user_super_admin()
    OR w.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = auth.uid()
      AND uca.company_id = w.company_id
      AND uca.access_type IN ('admin', 'manager', 'member')
    )
  )
  ORDER BY w.wallet_name;
$$;
