-- Migration 095: Complete RBAC Seeds
-- Seeds HR permissions, role definitions, menu visibility, and data scopes.
-- Seeds bookings menu visibility, missing permissions, and new agencies/boats/settings permissions.
-- All statements are idempotent (ON CONFLICT DO NOTHING / DO UPDATE).

-- ============================================================================
-- PART 1: HR Permissions
-- ============================================================================

INSERT INTO permissions (code, module, resource, action, description) VALUES
-- Dashboard
('hr.dashboard.view', 'hr', 'dashboard', 'view', 'View HR dashboard'),
-- Employees
('hr.employees.view', 'hr', 'employees', 'view', 'View employee list'),
('hr.employees.create', 'hr', 'employees', 'create', 'Create new employees'),
('hr.employees.edit', 'hr', 'employees', 'edit', 'Edit employee details'),
('hr.employees.delete', 'hr', 'employees', 'delete', 'Delete employees'),
-- Leave
('hr.leave.view', 'hr', 'leave', 'view', 'View leave requests'),
('hr.leave.manage', 'hr', 'leave', 'manage', 'Approve/reject leave requests'),
('hr.leave.request', 'hr', 'leave', 'request', 'Submit own leave request'),
-- Payroll
('hr.payroll.view', 'hr', 'payroll', 'view', 'View payroll'),
('hr.payroll.manage', 'hr', 'payroll', 'manage', 'Process payroll'),
-- Crew Schedule
('hr.crew_schedule.view', 'hr', 'crew_schedule', 'view', 'View crew schedule'),
('hr.crew_schedule.manage', 'hr', 'crew_schedule', 'manage', 'Manage crew schedule'),
-- Charter Bonus
('hr.charter_bonus.view', 'hr', 'charter_bonus', 'view', 'View charter bonuses'),
('hr.charter_bonus.manage', 'hr', 'charter_bonus', 'manage', 'Manage charter bonuses'),
-- Settings
('hr.settings.view', 'hr', 'settings', 'view', 'View HR settings'),
('hr.settings.manage', 'hr', 'settings', 'manage', 'Manage HR settings'),
-- Documents
('hr.documents.view_own', 'hr', 'documents', 'view_own', 'View own documents'),
('hr.documents.view_all', 'hr', 'documents', 'view_all', 'View all employee documents'),
-- Payslips
('hr.payslips.view_own', 'hr', 'payslips', 'view_own', 'View own payslips'),
('hr.payslips.view_all', 'hr', 'payslips', 'view_all', 'View all payslips')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 2: New Bookings Permissions (agencies, boats, settings)
-- ============================================================================

INSERT INTO permissions (code, module, resource, action, description) VALUES
('bookings.agencies.view', 'bookings', 'agencies', 'view', 'View agencies'),
('bookings.agencies.edit', 'bookings', 'agencies', 'edit', 'Edit agencies'),
('bookings.boats.view', 'bookings', 'boats', 'view', 'View boat register'),
('bookings.boats.edit', 'bookings', 'boats', 'edit', 'Edit boat register'),
('bookings.settings.view', 'bookings', 'settings', 'view', 'View bookings settings'),
('bookings.settings.manage', 'bookings', 'settings', 'manage', 'Manage bookings settings')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 3: HR Role Definitions
-- ============================================================================

INSERT INTO role_definitions (module, role_key, display_name, description, sort_order) VALUES
('hr', 'manager', 'Manager', 'Full access to all HR features', 1),
('hr', 'hr_staff', 'HR Staff', 'Operational HR - employees, leave, crew schedule', 2),
('hr', 'employee', 'Employee', 'Self-service: own payslips, leave, documents', 3),
('hr', 'viewer', 'Viewer', 'Read-only access to HR dashboard and employee list', 4)
ON CONFLICT (module, role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- PART 4: HR Role Permission Mappings
-- ============================================================================

-- HR Manager (full access)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('hr', 'manager', 'hr.dashboard.view'),
('hr', 'manager', 'hr.employees.view'),
('hr', 'manager', 'hr.employees.create'),
('hr', 'manager', 'hr.employees.edit'),
('hr', 'manager', 'hr.employees.delete'),
('hr', 'manager', 'hr.leave.view'),
('hr', 'manager', 'hr.leave.manage'),
('hr', 'manager', 'hr.leave.request'),
('hr', 'manager', 'hr.payroll.view'),
('hr', 'manager', 'hr.payroll.manage'),
('hr', 'manager', 'hr.crew_schedule.view'),
('hr', 'manager', 'hr.crew_schedule.manage'),
('hr', 'manager', 'hr.charter_bonus.view'),
('hr', 'manager', 'hr.charter_bonus.manage'),
('hr', 'manager', 'hr.settings.view'),
('hr', 'manager', 'hr.settings.manage'),
('hr', 'manager', 'hr.documents.view_own'),
('hr', 'manager', 'hr.documents.view_all'),
('hr', 'manager', 'hr.payslips.view_own'),
('hr', 'manager', 'hr.payslips.view_all')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- HR Staff (operational - no payroll, no settings, no delete)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('hr', 'hr_staff', 'hr.dashboard.view'),
('hr', 'hr_staff', 'hr.employees.view'),
('hr', 'hr_staff', 'hr.employees.create'),
('hr', 'hr_staff', 'hr.employees.edit'),
('hr', 'hr_staff', 'hr.leave.view'),
('hr', 'hr_staff', 'hr.leave.manage'),
('hr', 'hr_staff', 'hr.leave.request'),
('hr', 'hr_staff', 'hr.crew_schedule.view'),
('hr', 'hr_staff', 'hr.crew_schedule.manage'),
('hr', 'hr_staff', 'hr.charter_bonus.view'),
('hr', 'hr_staff', 'hr.charter_bonus.manage'),
('hr', 'hr_staff', 'hr.documents.view_own'),
('hr', 'hr_staff', 'hr.documents.view_all'),
('hr', 'hr_staff', 'hr.payslips.view_own'),
('hr', 'hr_staff', 'hr.payslips.view_all')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- HR Employee (self-service only)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('hr', 'employee', 'hr.leave.request'),
('hr', 'employee', 'hr.documents.view_own'),
('hr', 'employee', 'hr.payslips.view_own')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- HR Viewer (read-only dashboard, employees, crew schedule)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('hr', 'viewer', 'hr.dashboard.view'),
('hr', 'viewer', 'hr.employees.view'),
('hr', 'viewer', 'hr.crew_schedule.view')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 5: Bookings Manager - new permissions for agencies/boats/settings
-- ============================================================================

INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'manager', 'bookings.agencies.view'),
('bookings', 'manager', 'bookings.agencies.edit'),
('bookings', 'manager', 'bookings.boats.view'),
('bookings', 'manager', 'bookings.boats.edit'),
('bookings', 'manager', 'bookings.settings.view'),
('bookings', 'manager', 'bookings.settings.manage')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Bookings Viewer (missing permissions)
INSERT INTO role_permissions (module, role, permission_code) VALUES
('bookings', 'viewer', 'bookings.calendar.view_status_only'),
('bookings', 'viewer', 'bookings.booking.view_no_financial')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- ============================================================================
-- PART 6: HR Menu Visibility
-- ============================================================================

INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
-- Manager sees everything
('hr', 'manager', 'dashboard', true),
('hr', 'manager', 'employees', true),
('hr', 'manager', 'leave', true),
('hr', 'manager', 'payroll', true),
('hr', 'manager', 'crew-schedule', true),
('hr', 'manager', 'charter-bonus', true),
('hr', 'manager', 'settings', true),

-- HR Staff - no payroll, no settings
('hr', 'hr_staff', 'dashboard', true),
('hr', 'hr_staff', 'employees', true),
('hr', 'hr_staff', 'leave', true),
('hr', 'hr_staff', 'payroll', false),
('hr', 'hr_staff', 'crew-schedule', true),
('hr', 'hr_staff', 'charter-bonus', true),
('hr', 'hr_staff', 'settings', false),

-- Viewer - dashboard, employees, crew schedule only
('hr', 'viewer', 'dashboard', true),
('hr', 'viewer', 'employees', true),
('hr', 'viewer', 'leave', false),
('hr', 'viewer', 'payroll', false),
('hr', 'viewer', 'crew-schedule', true),
('hr', 'viewer', 'charter-bonus', false),
('hr', 'viewer', 'settings', false)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET
  is_visible = EXCLUDED.is_visible;

-- ============================================================================
-- PART 7: Bookings Menu Visibility
-- ============================================================================

INSERT INTO role_menu_visibility (module, role_key, menu_key, is_visible) VALUES
-- Manager sees everything
('bookings', 'manager', 'calendar', true),
('bookings', 'manager', 'list', true),
('bookings', 'manager', 'agencies', true),
('bookings', 'manager', 'boats', true),
('bookings', 'manager', 'settings', true),

-- Agent - calendar and list only
('bookings', 'agent', 'calendar', true),
('bookings', 'agent', 'list', true),
('bookings', 'agent', 'agencies', false),
('bookings', 'agent', 'boats', false),
('bookings', 'agent', 'settings', false),

-- Crew - calendar and list only
('bookings', 'crew', 'calendar', true),
('bookings', 'crew', 'list', true),
('bookings', 'crew', 'agencies', false),
('bookings', 'crew', 'boats', false),
('bookings', 'crew', 'settings', false),

-- Investor - calendar and list only (project-scoped)
('bookings', 'investor', 'calendar', true),
('bookings', 'investor', 'list', true),
('bookings', 'investor', 'agencies', false),
('bookings', 'investor', 'boats', false),
('bookings', 'investor', 'settings', false),

-- Viewer - calendar and list only
('bookings', 'viewer', 'calendar', true),
('bookings', 'viewer', 'list', true),
('bookings', 'viewer', 'agencies', false),
('bookings', 'viewer', 'boats', false),
('bookings', 'viewer', 'settings', false)
ON CONFLICT (module, role_key, menu_key) DO UPDATE SET
  is_visible = EXCLUDED.is_visible;

-- ============================================================================
-- PART 8: HR Data Scopes
-- ============================================================================

INSERT INTO role_data_scope (module, role_key, resource, scope_type) VALUES
-- Manager: company scope for all
('hr', 'manager', 'employees', 'company'),
('hr', 'manager', 'leave', 'company'),
('hr', 'manager', 'payroll', 'company'),
('hr', 'manager', 'crew_schedule', 'company'),
('hr', 'manager', 'documents', 'company'),

-- HR Staff: company scope for employees/leave/crew, own for payroll
('hr', 'hr_staff', 'employees', 'company'),
('hr', 'hr_staff', 'leave', 'company'),
('hr', 'hr_staff', 'payroll', 'own'),
('hr', 'hr_staff', 'crew_schedule', 'company'),
('hr', 'hr_staff', 'documents', 'company'),

-- Employee: own scope for everything
('hr', 'employee', 'employees', 'own'),
('hr', 'employee', 'leave', 'own'),
('hr', 'employee', 'payroll', 'own'),
('hr', 'employee', 'crew_schedule', 'own'),
('hr', 'employee', 'documents', 'own'),

-- Viewer: company scope (read-only enforced at permission level)
('hr', 'viewer', 'employees', 'company'),
('hr', 'viewer', 'crew_schedule', 'company')
ON CONFLICT (module, role_key, resource) DO UPDATE SET
  scope_type = EXCLUDED.scope_type;
