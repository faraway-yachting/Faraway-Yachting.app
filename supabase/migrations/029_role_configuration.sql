-- Migration 029: Role Configuration Tables
-- Adds tables for customizing role permissions, menu visibility, and data scopes

-- ============================================================================
-- 1. ROLE DEFINITIONS TABLE
-- ============================================================================
-- Stores metadata about each role (display name, description)

CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, role_key)
);

-- Enable RLS
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

-- Everyone can read role definitions
CREATE POLICY "role_definitions_select" ON role_definitions
  FOR SELECT USING (true);

-- Only super admin can modify
CREATE POLICY "role_definitions_insert" ON role_definitions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_definitions_update" ON role_definitions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_definitions_delete" ON role_definitions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 2. ROLE MENU VISIBILITY TABLE
-- ============================================================================
-- Controls which menu items each role can see

CREATE TABLE IF NOT EXISTS role_menu_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  role_key TEXT NOT NULL,
  menu_key TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, role_key, menu_key)
);

-- Enable RLS
ALTER TABLE role_menu_visibility ENABLE ROW LEVEL SECURITY;

-- Everyone can read menu visibility
CREATE POLICY "role_menu_visibility_select" ON role_menu_visibility
  FOR SELECT USING (true);

-- Only super admin can modify
CREATE POLICY "role_menu_visibility_insert" ON role_menu_visibility
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_menu_visibility_update" ON role_menu_visibility
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_menu_visibility_delete" ON role_menu_visibility
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 3. ROLE DATA SCOPE TABLE
-- ============================================================================
-- Fine-grained data scope per role per resource

CREATE TABLE IF NOT EXISTS role_data_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  role_key TEXT NOT NULL,
  resource TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('own', 'project', 'company', 'all')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, role_key, resource)
);

-- Enable RLS
ALTER TABLE role_data_scope ENABLE ROW LEVEL SECURITY;

-- Everyone can read data scopes
CREATE POLICY "role_data_scope_select" ON role_data_scope
  FOR SELECT USING (true);

-- Only super admin can modify
CREATE POLICY "role_data_scope_insert" ON role_data_scope
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_data_scope_update" ON role_data_scope
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_data_scope_delete" ON role_data_scope
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 4. SEED ROLE DEFINITIONS
-- ============================================================================

INSERT INTO role_definitions (module, role_key, display_name, description, sort_order) VALUES
  -- Accounting Module Roles
  ('accounting', 'manager', 'Manager', 'Full access to all accounting features including settings and user management', 1),
  ('accounting', 'accountant', 'Accountant', 'Data entry and basic reporting - expenses, income, journal entries', 2),
  ('accounting', 'sales', 'Sales', 'Income, invoices, and contact management only', 3),
  ('accounting', 'investor', 'Investor', 'Read-only access to investor reports and project data', 4),
  ('accounting', 'petty-cash', 'Petty Cash Holder', 'Own wallet management and expense creation only', 5),
  ('accounting', 'viewer', 'Viewer', 'Read-only access to basic data', 6),

  -- Bookings Module Roles
  ('bookings', 'manager', 'Manager', 'Full access to all booking features including reports and financials', 1),
  ('bookings', 'agent', 'Agent', 'Create and edit bookings, view calendar status only', 2),
  ('bookings', 'crew', 'Crew', 'View bookings and guest details without financial information', 3),
  ('bookings', 'investor', 'Investor', 'Calendar view for invested projects only', 4),
  ('bookings', 'viewer', 'Viewer', 'Read-only calendar access', 5)
ON CONFLICT (module, role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 5. SEED DEFAULT MENU VISIBILITY
-- ============================================================================
-- By default, visibility follows the permission-based rules
-- This table allows overriding to hide menus even if permission exists

-- Accounting menu items
INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
  -- Manager sees everything
  ('accounting', 'manager', 'dashboard', true),
  ('accounting', 'manager', 'income', true),
  ('accounting', 'manager', 'expenses', true),
  ('accounting', 'manager', 'gl-categorization', true),
  ('accounting', 'manager', 'journal-entries', true),
  ('accounting', 'manager', 'bank-reconciliation', true),
  ('accounting', 'manager', 'finances', true),
  ('accounting', 'manager', 'petty-cash', true),
  ('accounting', 'manager', 'chart-of-accounts', true),
  ('accounting', 'manager', 'contacts', true),
  ('accounting', 'manager', 'companies', true),
  ('accounting', 'manager', 'reports', true),
  ('accounting', 'manager', 'settings', true),

  -- Accountant - no settings, companies, gl-categorization, bank-reconciliation
  ('accounting', 'accountant', 'dashboard', true),
  ('accounting', 'accountant', 'income', true),
  ('accounting', 'accountant', 'expenses', true),
  ('accounting', 'accountant', 'gl-categorization', false),
  ('accounting', 'accountant', 'journal-entries', true),
  ('accounting', 'accountant', 'bank-reconciliation', false),
  ('accounting', 'accountant', 'finances', false),
  ('accounting', 'accountant', 'petty-cash', false),
  ('accounting', 'accountant', 'chart-of-accounts', true),
  ('accounting', 'accountant', 'contacts', true),
  ('accounting', 'accountant', 'companies', false),
  ('accounting', 'accountant', 'reports', true),
  ('accounting', 'accountant', 'settings', false),

  -- Sales - income, invoices, contacts only
  ('accounting', 'sales', 'dashboard', true),
  ('accounting', 'sales', 'income', true),
  ('accounting', 'sales', 'expenses', false),
  ('accounting', 'sales', 'gl-categorization', false),
  ('accounting', 'sales', 'journal-entries', false),
  ('accounting', 'sales', 'bank-reconciliation', false),
  ('accounting', 'sales', 'finances', false),
  ('accounting', 'sales', 'petty-cash', false),
  ('accounting', 'sales', 'chart-of-accounts', false),
  ('accounting', 'sales', 'contacts', true),
  ('accounting', 'sales', 'companies', false),
  ('accounting', 'sales', 'reports', false),
  ('accounting', 'sales', 'settings', false),

  -- Investor - reports only
  ('accounting', 'investor', 'dashboard', true),
  ('accounting', 'investor', 'income', false),
  ('accounting', 'investor', 'expenses', false),
  ('accounting', 'investor', 'gl-categorization', false),
  ('accounting', 'investor', 'journal-entries', false),
  ('accounting', 'investor', 'bank-reconciliation', false),
  ('accounting', 'investor', 'finances', false),
  ('accounting', 'investor', 'petty-cash', false),
  ('accounting', 'investor', 'chart-of-accounts', false),
  ('accounting', 'investor', 'contacts', false),
  ('accounting', 'investor', 'companies', false),
  ('accounting', 'investor', 'reports', true),
  ('accounting', 'investor', 'settings', false),

  -- Petty Cash - own wallet only
  ('accounting', 'petty-cash', 'dashboard', false),
  ('accounting', 'petty-cash', 'income', false),
  ('accounting', 'petty-cash', 'expenses', false),
  ('accounting', 'petty-cash', 'gl-categorization', false),
  ('accounting', 'petty-cash', 'journal-entries', false),
  ('accounting', 'petty-cash', 'bank-reconciliation', false),
  ('accounting', 'petty-cash', 'finances', false),
  ('accounting', 'petty-cash', 'petty-cash', true),
  ('accounting', 'petty-cash', 'chart-of-accounts', false),
  ('accounting', 'petty-cash', 'contacts', false),
  ('accounting', 'petty-cash', 'companies', false),
  ('accounting', 'petty-cash', 'reports', false),
  ('accounting', 'petty-cash', 'settings', false)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET
  is_visible = EXCLUDED.is_visible;

-- ============================================================================
-- 6. SEED DEFAULT DATA SCOPES
-- ============================================================================

INSERT INTO role_data_scope (module, role_key, resource, scope_type) VALUES
  -- Manager: company scope for all
  ('accounting', 'manager', 'expenses', 'company'),
  ('accounting', 'manager', 'income', 'company'),
  ('accounting', 'manager', 'invoices', 'company'),
  ('accounting', 'manager', 'journal', 'company'),
  ('accounting', 'manager', 'petty-cash', 'company'),
  ('accounting', 'manager', 'reports', 'company'),

  -- Accountant: company scope
  ('accounting', 'accountant', 'expenses', 'company'),
  ('accounting', 'accountant', 'income', 'company'),
  ('accounting', 'accountant', 'invoices', 'company'),
  ('accounting', 'accountant', 'journal', 'company'),
  ('accounting', 'accountant', 'petty-cash', 'own'),
  ('accounting', 'accountant', 'reports', 'company'),

  -- Sales: company scope for income/invoices
  ('accounting', 'sales', 'expenses', 'own'),
  ('accounting', 'sales', 'income', 'company'),
  ('accounting', 'sales', 'invoices', 'company'),
  ('accounting', 'sales', 'journal', 'own'),
  ('accounting', 'sales', 'petty-cash', 'own'),
  ('accounting', 'sales', 'reports', 'own'),

  -- Investor: project scope
  ('accounting', 'investor', 'expenses', 'project'),
  ('accounting', 'investor', 'income', 'project'),
  ('accounting', 'investor', 'invoices', 'project'),
  ('accounting', 'investor', 'journal', 'project'),
  ('accounting', 'investor', 'petty-cash', 'own'),
  ('accounting', 'investor', 'reports', 'project'),

  -- Petty Cash: own scope
  ('accounting', 'petty-cash', 'expenses', 'own'),
  ('accounting', 'petty-cash', 'income', 'own'),
  ('accounting', 'petty-cash', 'invoices', 'own'),
  ('accounting', 'petty-cash', 'journal', 'own'),
  ('accounting', 'petty-cash', 'petty-cash', 'own'),
  ('accounting', 'petty-cash', 'reports', 'own'),

  -- Bookings module
  ('bookings', 'manager', 'bookings', 'company'),
  ('bookings', 'manager', 'calendar', 'company'),
  ('bookings', 'manager', 'guests', 'company'),
  ('bookings', 'manager', 'reports', 'company'),

  ('bookings', 'agent', 'bookings', 'company'),
  ('bookings', 'agent', 'calendar', 'company'),
  ('bookings', 'agent', 'guests', 'company'),
  ('bookings', 'agent', 'reports', 'own'),

  ('bookings', 'crew', 'bookings', 'project'),
  ('bookings', 'crew', 'calendar', 'project'),
  ('bookings', 'crew', 'guests', 'project'),
  ('bookings', 'crew', 'reports', 'own'),

  ('bookings', 'investor', 'bookings', 'project'),
  ('bookings', 'investor', 'calendar', 'project'),
  ('bookings', 'investor', 'guests', 'project'),
  ('bookings', 'investor', 'reports', 'project')
ON CONFLICT (module, role_key, resource) DO UPDATE SET
  scope_type = EXCLUDED.scope_type;

-- ============================================================================
-- 7. HELPER FUNCTION: GET USER DATA SCOPE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_data_scope(p_user_id UUID, p_module TEXT, p_resource TEXT)
RETURNS TEXT AS $$
DECLARE
  v_scope TEXT;
BEGIN
  -- Check if super admin (gets 'all' scope)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN 'all';
  END IF;

  -- Get scope from role_data_scope based on user's role
  SELECT rds.scope_type INTO v_scope
  FROM role_data_scope rds
  JOIN user_module_roles umr ON umr.role = rds.role_key AND umr.module = rds.module
  WHERE umr.user_id = p_user_id
    AND rds.module = p_module
    AND rds.resource = p_resource
    AND umr.is_active = true;

  -- Default to 'company' if no specific scope found
  RETURN COALESCE(v_scope, 'company');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. HELPER FUNCTION: GET USER MENU VISIBILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_menu_visibility(p_user_id UUID, p_module TEXT)
RETURNS TABLE(menu_key TEXT, is_visible BOOLEAN) AS $$
BEGIN
  -- Super admin sees everything
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN QUERY
    SELECT DISTINCT rmv.menu_key, true::BOOLEAN
    FROM role_menu_visibility rmv
    WHERE rmv.module = p_module;
    RETURN;
  END IF;

  -- Get visibility based on user's role
  RETURN QUERY
  SELECT rmv.menu_key, rmv.is_visible
  FROM role_menu_visibility rmv
  JOIN user_module_roles umr ON umr.role = rmv.role_key AND umr.module = rmv.module
  WHERE umr.user_id = p_user_id
    AND rmv.module = p_module
    AND umr.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_data_scope(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_menu_visibility(UUID, TEXT) TO authenticated;
