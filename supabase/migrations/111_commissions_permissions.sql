-- Migration 111: Add Commissions permissions
-- Commissions was missing from the Permissions tab (only existed in Menu Visibility)

-- ============================================================================
-- PART 1: Insert Commission Permission Codes
-- ============================================================================

INSERT INTO permissions (code, module, resource, action, description) VALUES
('accounting.commissions.view', 'accounting', 'commissions', 'view', 'View commission records'),
('accounting.commissions.create', 'accounting', 'commissions', 'create', 'Create commission records'),
('accounting.commissions.edit', 'accounting', 'commissions', 'edit', 'Edit commission records'),
('accounting.commissions.delete', 'accounting', 'commissions', 'delete', 'Delete commission records')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 2: Grant Commission Permissions to Existing Roles
-- ============================================================================

-- Manager role gets full commission access
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'manager', 'accounting.commissions.view'),
('accounting', 'manager', 'accounting.commissions.create'),
('accounting', 'manager', 'accounting.commissions.edit'),
('accounting', 'manager', 'accounting.commissions.delete')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Accountant role gets view and edit access
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'accountant', 'accounting.commissions.view'),
('accounting', 'accountant', 'accounting.commissions.edit')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Sales role gets view access (they can see their commissions)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'sales', 'accounting.commissions.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 3: Add Menu Visibility for Commissions
-- ============================================================================
-- Without explicit entries, commissions won't appear in admin Menu Visibility
-- tab state and won't be saved when admin saves role config.

INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
('accounting', 'manager', 'commissions', true),
('accounting', 'accountant', 'commissions', true),
('accounting', 'sales', 'commissions', true),
('accounting', 'investor', 'commissions', false),
('accounting', 'petty-cash', 'commissions', false),
('accounting', 'viewer', 'commissions', false),
('accounting', 'intern', 'commissions', false)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET is_visible = EXCLUDED.is_visible;
