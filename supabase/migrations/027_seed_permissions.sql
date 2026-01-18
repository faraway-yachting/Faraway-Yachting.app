-- Migration 027: Seed Permissions and Role Mappings
-- This migration populates the permissions table and role_permissions mappings

-- ============================================================================
-- PART 1: Insert All Permission Codes
-- ============================================================================

INSERT INTO permissions (code, module, resource, action, description) VALUES
-- Accounting Module - Dashboard
('accounting.dashboard.view', 'accounting', 'dashboard', 'view', 'View accounting dashboard'),

-- Accounting Module - Expenses
('accounting.expenses.view', 'accounting', 'expenses', 'view', 'View expenses list'),
('accounting.expenses.create', 'accounting', 'expenses', 'create', 'Create new expenses'),
('accounting.expenses.edit', 'accounting', 'expenses', 'edit', 'Edit existing expenses'),
('accounting.expenses.delete', 'accounting', 'expenses', 'delete', 'Delete expenses'),

-- Accounting Module - Income/Receipts
('accounting.income.view', 'accounting', 'income', 'view', 'View income and receipts'),
('accounting.income.create', 'accounting', 'income', 'create', 'Create receipts'),
('accounting.income.edit', 'accounting', 'income', 'edit', 'Edit receipts'),

-- Accounting Module - Invoices
('accounting.invoices.view', 'accounting', 'invoices', 'view', 'View invoices'),
('accounting.invoices.create', 'accounting', 'invoices', 'create', 'Create invoices'),
('accounting.invoices.edit', 'accounting', 'invoices', 'edit', 'Edit invoices'),

-- Accounting Module - Journal Entries
('accounting.journal.view', 'accounting', 'journal', 'view', 'View journal entries'),
('accounting.journal.create', 'accounting', 'journal', 'create', 'Create journal entries'),

-- Accounting Module - Bank Reconciliation
('accounting.reconciliation.view', 'accounting', 'reconciliation', 'view', 'View bank reconciliation'),
('accounting.reconciliation.perform', 'accounting', 'reconciliation', 'perform', 'Perform reconciliation'),

-- Accounting Module - Petty Cash
('accounting.pettycash.view_own', 'accounting', 'pettycash', 'view_own', 'View own petty cash wallet only'),
('accounting.pettycash.view_all', 'accounting', 'pettycash', 'view_all', 'View all petty cash wallets'),
('accounting.pettycash.manage', 'accounting', 'pettycash', 'manage', 'Manage petty cash (approve, transfer)'),
('accounting.pettycash.create_expense', 'accounting', 'pettycash', 'create_expense', 'Create petty cash expenses'),

-- Accounting Module - Reports
('accounting.reports.view_basic', 'accounting', 'reports', 'view_basic', 'View basic reports'),
('accounting.reports.view_management', 'accounting', 'reports', 'view_management', 'View management reports'),
('accounting.reports.view_investor', 'accounting', 'reports', 'view_investor', 'View investor reports'),

-- Accounting Module - Chart of Accounts
('accounting.chartofaccounts.view', 'accounting', 'chartofaccounts', 'view', 'View chart of accounts'),
('accounting.chartofaccounts.edit', 'accounting', 'chartofaccounts', 'edit', 'Edit chart of accounts'),

-- Accounting Module - Contacts
('accounting.contacts.view', 'accounting', 'contacts', 'view', 'View contacts'),
('accounting.contacts.edit', 'accounting', 'contacts', 'edit', 'Edit contacts'),

-- Accounting Module - GL Categorization
('accounting.categorization.view', 'accounting', 'categorization', 'view', 'View GL categorization'),
('accounting.categorization.edit', 'accounting', 'categorization', 'edit', 'Edit GL categorization'),

-- Accounting Module - Finances
('accounting.finances.view', 'accounting', 'finances', 'view', 'View finances (bank accounts)'),
('accounting.finances.manage', 'accounting', 'finances', 'manage', 'Manage bank accounts'),

-- Accounting Module - Settings
('accounting.settings.view', 'accounting', 'settings', 'view', 'View settings'),
('accounting.settings.manage', 'accounting', 'settings', 'manage', 'Manage settings'),

-- Global - User Management
('admin.users.view', 'admin', 'users', 'view', 'View user list'),
('admin.users.manage', 'admin', 'users', 'manage', 'Manage users (create, edit, delete)'),

-- Bookings Module - Calendar
('bookings.calendar.view', 'bookings', 'calendar', 'view', 'View full booking calendar'),
('bookings.calendar.view_status_only', 'bookings', 'calendar', 'view_status_only', 'View calendar with status only (no details)'),

-- Bookings Module - Booking Details
('bookings.booking.view', 'bookings', 'booking', 'view', 'View full booking details'),
('bookings.booking.view_no_financial', 'bookings', 'booking', 'view_no_financial', 'View booking without financial info'),
('bookings.booking.create', 'bookings', 'booking', 'create', 'Create bookings'),
('bookings.booking.edit', 'bookings', 'booking', 'edit', 'Edit bookings'),
('bookings.booking.delete', 'bookings', 'booking', 'delete', 'Delete bookings'),

-- Bookings Module - Reports
('bookings.reports.view', 'bookings', 'reports', 'view', 'View booking reports'),

-- Bookings Module - Guests
('bookings.guests.view', 'bookings', 'guests', 'view', 'View guest information'),
('bookings.guests.edit', 'bookings', 'guests', 'edit', 'Edit guest information')

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 2: Role Permission Mappings - Accounting Module
-- ============================================================================

-- Manager role in Accounting (full access)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'manager', 'accounting.dashboard.view'),
('accounting', 'manager', 'accounting.expenses.view'),
('accounting', 'manager', 'accounting.expenses.create'),
('accounting', 'manager', 'accounting.expenses.edit'),
('accounting', 'manager', 'accounting.expenses.delete'),
('accounting', 'manager', 'accounting.income.view'),
('accounting', 'manager', 'accounting.income.create'),
('accounting', 'manager', 'accounting.income.edit'),
('accounting', 'manager', 'accounting.invoices.view'),
('accounting', 'manager', 'accounting.invoices.create'),
('accounting', 'manager', 'accounting.invoices.edit'),
('accounting', 'manager', 'accounting.journal.view'),
('accounting', 'manager', 'accounting.journal.create'),
('accounting', 'manager', 'accounting.reconciliation.view'),
('accounting', 'manager', 'accounting.reconciliation.perform'),
('accounting', 'manager', 'accounting.pettycash.view_own'),
('accounting', 'manager', 'accounting.pettycash.view_all'),
('accounting', 'manager', 'accounting.pettycash.manage'),
('accounting', 'manager', 'accounting.pettycash.create_expense'),
('accounting', 'manager', 'accounting.reports.view_basic'),
('accounting', 'manager', 'accounting.reports.view_management'),
('accounting', 'manager', 'accounting.reports.view_investor'),
('accounting', 'manager', 'accounting.chartofaccounts.view'),
('accounting', 'manager', 'accounting.chartofaccounts.edit'),
('accounting', 'manager', 'accounting.contacts.view'),
('accounting', 'manager', 'accounting.contacts.edit'),
('accounting', 'manager', 'accounting.categorization.view'),
('accounting', 'manager', 'accounting.categorization.edit'),
('accounting', 'manager', 'accounting.finances.view'),
('accounting', 'manager', 'accounting.finances.manage'),
('accounting', 'manager', 'accounting.settings.view'),
('accounting', 'manager', 'accounting.settings.manage'),
('accounting', 'manager', 'admin.users.view'),
('accounting', 'manager', 'admin.users.manage')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Accountant role in Accounting
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'accountant', 'accounting.dashboard.view'),
('accounting', 'accountant', 'accounting.expenses.view'),
('accounting', 'accountant', 'accounting.expenses.create'),
('accounting', 'accountant', 'accounting.expenses.edit'),
('accounting', 'accountant', 'accounting.income.view'),
('accounting', 'accountant', 'accounting.income.create'),
('accounting', 'accountant', 'accounting.income.edit'),
('accounting', 'accountant', 'accounting.invoices.view'),
('accounting', 'accountant', 'accounting.invoices.create'),
('accounting', 'accountant', 'accounting.invoices.edit'),
('accounting', 'accountant', 'accounting.journal.view'),
('accounting', 'accountant', 'accounting.journal.create'),
('accounting', 'accountant', 'accounting.reconciliation.view'),
('accounting', 'accountant', 'accounting.reconciliation.perform'),
('accounting', 'accountant', 'accounting.reports.view_basic'),
('accounting', 'accountant', 'accounting.chartofaccounts.view'),
('accounting', 'accountant', 'accounting.chartofaccounts.edit'),
('accounting', 'accountant', 'accounting.contacts.view'),
('accounting', 'accountant', 'accounting.contacts.edit'),
('accounting', 'accountant', 'accounting.categorization.view'),
('accounting', 'accountant', 'accounting.categorization.edit'),
('accounting', 'accountant', 'accounting.finances.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Sales role in Accounting
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'sales', 'accounting.dashboard.view'),
('accounting', 'sales', 'accounting.income.view'),
('accounting', 'sales', 'accounting.income.create'),
('accounting', 'sales', 'accounting.income.edit'),
('accounting', 'sales', 'accounting.invoices.view'),
('accounting', 'sales', 'accounting.invoices.create'),
('accounting', 'sales', 'accounting.invoices.edit'),
('accounting', 'sales', 'accounting.contacts.view'),
('accounting', 'sales', 'accounting.contacts.edit')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Investor role in Accounting (read-only, limited reports)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'investor', 'accounting.dashboard.view'),
('accounting', 'investor', 'accounting.reports.view_investor')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Petty Cash Holder role in Accounting
INSERT INTO role_permissions (module, role, permission_code) VALUES
('accounting', 'petty-cash', 'accounting.pettycash.view_own'),
('accounting', 'petty-cash', 'accounting.pettycash.create_expense')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 3: Role Permission Mappings - Bookings Module
-- ============================================================================

-- Manager role in Bookings (full access)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'manager', 'bookings.calendar.view'),
('bookings', 'manager', 'bookings.booking.view'),
('bookings', 'manager', 'bookings.booking.create'),
('bookings', 'manager', 'bookings.booking.edit'),
('bookings', 'manager', 'bookings.booking.delete'),
('bookings', 'manager', 'bookings.reports.view'),
('bookings', 'manager', 'bookings.guests.view'),
('bookings', 'manager', 'bookings.guests.edit')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Agent role in Bookings (status only view, can create/edit bookings)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'agent', 'bookings.calendar.view_status_only'),
('bookings', 'agent', 'bookings.booking.create'),
('bookings', 'agent', 'bookings.booking.edit')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Crew role in Bookings (view details without financial info)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'crew', 'bookings.calendar.view'),
('bookings', 'crew', 'bookings.booking.view_no_financial'),
('bookings', 'crew', 'bookings.guests.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Investor role in Bookings (calendar view for invested projects only)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'investor', 'bookings.calendar.view'),
('bookings', 'investor', 'bookings.booking.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 4: Create View for Easy Permission Checking
-- ============================================================================

CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT
  umr.user_id,
  umr.module,
  umr.role,
  rp.permission_code,
  p.resource,
  p.action,
  p.description
FROM user_module_roles umr
JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
JOIN permissions p ON p.code = rp.permission_code
WHERE umr.is_active = true

UNION ALL

-- Super admins get all permissions
SELECT
  up.id as user_id,
  p.module,
  'super_admin' as role,
  p.code as permission_code,
  p.resource,
  p.action,
  p.description
FROM user_profiles up
CROSS JOIN permissions p
WHERE up.is_super_admin = true;

COMMENT ON VIEW user_effective_permissions IS 'Shows all permissions a user has based on their roles. Super admins get all permissions.';

-- ============================================================================
-- PART 5: Migrate Existing Users
-- This gives existing users company access based on their current company_id
-- ============================================================================

-- Grant manager access to existing users with manager role
INSERT INTO user_company_access (user_id, company_id, access_type)
SELECT
  up.id,
  up.company_id,
  CASE
    WHEN up.is_super_admin THEN 'admin'
    WHEN up.role = 'manager' THEN 'manager'
    WHEN up.role = 'admin' THEN 'admin'
    WHEN up.role IN ('accountant', 'captain') THEN 'member'
    ELSE 'viewer'
  END
FROM user_profiles up
WHERE up.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;
