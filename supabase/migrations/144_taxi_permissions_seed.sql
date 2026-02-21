-- Migration 144: Seed taxi permissions and assign to roles
-- Follows the pattern from migration 111_commissions_permissions.sql

-- ============================================================================
-- PART 1: Insert Taxi Permission Codes
-- ============================================================================

INSERT INTO permissions (code, module, resource, action, description) VALUES
('bookings.taxi.view', 'bookings', 'taxi', 'view', 'View taxi transfers'),
('bookings.taxi.create', 'bookings', 'taxi', 'create', 'Create taxi transfers'),
('bookings.taxi.edit', 'bookings', 'taxi', 'edit', 'Edit taxi transfers'),
('bookings.taxi.delete', 'bookings', 'taxi', 'delete', 'Delete taxi transfers'),
('bookings.taxi_payments.view', 'bookings', 'taxi_payments', 'view', 'View taxi payment records'),
('bookings.taxi_payments.manage', 'bookings', 'taxi_payments', 'manage', 'Manage taxi payments (mark as paid)')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 2: Grant Taxi Permissions to Existing Roles
-- ============================================================================

-- Admin gets all taxi permissions
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'admin', 'bookings.taxi.view'),
('bookings', 'admin', 'bookings.taxi.create'),
('bookings', 'admin', 'bookings.taxi.edit'),
('bookings', 'admin', 'bookings.taxi.delete'),
('bookings', 'admin', 'bookings.taxi_payments.view'),
('bookings', 'admin', 'bookings.taxi_payments.manage')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Manager gets all taxi permissions
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'manager', 'bookings.taxi.view'),
('bookings', 'manager', 'bookings.taxi.create'),
('bookings', 'manager', 'bookings.taxi.edit'),
('bookings', 'manager', 'bookings.taxi.delete'),
('bookings', 'manager', 'bookings.taxi_payments.view'),
('bookings', 'manager', 'bookings.taxi_payments.manage')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Agent gets view, create, edit (not delete or payment manage)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'agent', 'bookings.taxi.view'),
('bookings', 'agent', 'bookings.taxi.create'),
('bookings', 'agent', 'bookings.taxi.edit'),
('bookings', 'agent', 'bookings.taxi_payments.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 3: Add Menu Visibility for Taxi
-- ============================================================================

INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
('bookings', 'admin', 'taxi', true),
('bookings', 'manager', 'taxi', true),
('bookings', 'agent', 'taxi', true)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET is_visible = EXCLUDED.is_visible;
