-- Migration 134: Performance Optimization - RPC Functions & Indexes
-- Addresses: N+1 queries in accountBalances, middleware, AuthProvider
-- Also adds targeted indexes for common query patterns

-- ============================================================================
-- P3a: Account Balances - Replace N+1 loop with single aggregated query
-- Previously: 1 query per bank account for receipt_payments + expense_payments
-- Now: Single query returns all balances at once
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_balances(p_company_id uuid DEFAULT NULL)
RETURNS TABLE(
  bank_account_id uuid,
  account_name text,
  company_id uuid,
  currency text,
  opening_balance numeric,
  opening_balance_date text,
  gl_account_code text,
  is_active boolean,
  total_in numeric,
  total_out numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ba.id AS bank_account_id,
    ba.account_name,
    ba.company_id,
    ba.currency,
    COALESCE(ba.opening_balance, 0) AS opening_balance,
    ba.opening_balance_date::text,
    ba.gl_account_code,
    ba.is_active,
    COALESCE(receipt_totals.total_in, 0) AS total_in,
    COALESCE(expense_totals.total_out, 0) AS total_out
  FROM bank_accounts ba
  LEFT JOIN (
    SELECT rp.received_at AS bank_id, SUM(rp.amount) AS total_in
    FROM receipt_payment_records rp
    WHERE rp.received_at != 'cash'
    GROUP BY rp.received_at
  ) receipt_totals ON receipt_totals.bank_id = ba.id::text
  LEFT JOIN (
    SELECT ep.paid_from AS bank_id, SUM(ep.amount) AS total_out
    FROM expense_payments ep
    WHERE ep.paid_from != 'cash'
    GROUP BY ep.paid_from
  ) expense_totals ON expense_totals.bank_id = ba.id::text
  WHERE ba.is_active = true
    AND (p_company_id IS NULL OR ba.company_id = p_company_id)
  ORDER BY ba.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_balances(uuid) TO authenticated;


-- ============================================================================
-- P5: Middleware - Single RPC to check user access (replaces 2 sequential queries)
-- NOTE: SQL-only - TypeScript code NOT changed yet. Test manually first.
-- Usage: SELECT * FROM get_user_access('user-uuid', 'accounting');
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_access(p_user_id uuid, p_module text DEFAULT NULL)
RETURNS TABLE(
  is_super_admin boolean,
  can_manage_users boolean,
  has_module_access boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(up.is_super_admin, false) AS is_super_admin,
    COALESCE(up.can_manage_users, false) AS can_manage_users,
    CASE
      WHEN COALESCE(up.is_super_admin, false) THEN true
      WHEN p_module IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_module_roles umr
        WHERE umr.user_id = p_user_id
          AND umr.module = p_module
          AND umr.is_active = true
      )
    END AS has_module_access
  FROM user_profiles up
  WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_access(uuid, text) TO authenticated;


-- ============================================================================
-- P6: AuthProvider - Single RPC to fetch all auth data (replaces 7 queries)
-- NOTE: SQL-only - TypeScript code NOT changed yet. Test manually first.
-- Usage: SELECT get_user_auth_data('user-uuid');
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(p)
      FROM user_profiles p
      WHERE p.id = p_user_id
    ),
    'module_roles', COALESCE((
      SELECT json_agg(row_to_json(r))
      FROM user_module_roles r
      WHERE r.user_id = p_user_id AND r.is_active = true
    ), '[]'::json),
    'permissions', COALESCE((
      SELECT json_agg(rp.permission_code)
      FROM role_permissions rp
      INNER JOIN user_module_roles umr ON umr.module = rp.module AND umr.role = rp.role
      WHERE umr.user_id = p_user_id AND umr.is_active = true
    ), '[]'::json),
    'company_access', COALESCE((
      SELECT json_agg(row_to_json(ca))
      FROM user_company_access ca
      WHERE ca.user_id = p_user_id
    ), '[]'::json),
    'project_access', COALESCE((
      SELECT json_agg(row_to_json(pa))
      FROM user_project_access pa
      WHERE pa.user_id = p_user_id
    ), '[]'::json),
    'menu_visibility', COALESCE((
      SELECT json_agg(json_build_object(
        'module', rmv.module,
        'role_key', rmv.role_key,
        'menu_key', rmv.menu_key,
        'is_visible', rmv.is_visible
      ))
      FROM role_menu_visibility rmv
      WHERE rmv.role_key IN (
        SELECT umr.role FROM user_module_roles umr
        WHERE umr.user_id = p_user_id AND umr.is_active = true
      )
    ), '[]'::json),
    'data_scopes', COALESCE((
      SELECT json_agg(json_build_object(
        'module', rds.module,
        'role_key', rds.role_key,
        'resource', rds.resource,
        'scope_type', rds.scope_type
      ))
      FROM role_data_scope rds
      WHERE rds.role_key IN (
        SELECT umr.role FROM user_module_roles umr
        WHERE umr.user_id = p_user_id AND umr.is_active = true
      )
    ), '[]'::json)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_auth_data(uuid) TO authenticated;


-- ============================================================================
-- P8: Targeted Indexes for Common Query Patterns
-- ============================================================================

-- For receipt_payment_records joins in accountBalances (P3a)
-- Speeds up the SUM(amount) GROUP BY received_at in get_account_balances()
CREATE INDEX IF NOT EXISTS idx_receipt_payments_received_at
  ON receipt_payment_records(received_at);

-- For expense_payments joins in accountBalances (P3a)
-- Speeds up the SUM(amount) GROUP BY paid_from in get_account_balances()
CREATE INDEX IF NOT EXISTS idx_expense_payments_paid_from
  ON expense_payments(paid_from);

-- For FX gain/loss queries - partial indexes for the specific WHERE clause
CREATE INDEX IF NOT EXISTS idx_invoices_outstanding_fx
  ON invoices(status, currency)
  WHERE status = 'issued' AND amount_outstanding > 0 AND currency != 'THB';

CREATE INDEX IF NOT EXISTS idx_expenses_unpaid_fx
  ON expenses(status, payment_status, currency)
  WHERE status = 'approved' AND payment_status != 'paid' AND currency != 'THB';
