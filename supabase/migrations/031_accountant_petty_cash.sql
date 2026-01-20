-- Migration: Add petty cash permissions for accountant role
-- This allows accountants who have their own petty cash wallet to:
-- 1. See the Petty Cash menu item
-- 2. View only their own wallet
-- 3. Record expenses against their wallet

-- Add petty cash permissions to accountant role
INSERT INTO role_permissions (module, role, permission_code) VALUES
  ('accounting', 'accountant', 'accounting.pettycash.view_own'),
  ('accounting', 'accountant', 'accounting.pettycash.create_expense')
ON CONFLICT (module, role, permission_code) DO NOTHING;

-- Also add these permissions to the manager role if not already present
-- (managers should have both view_own and view_all)
INSERT INTO role_permissions (module, role, permission_code) VALUES
  ('accounting', 'manager', 'accounting.pettycash.view_own'),
  ('accounting', 'manager', 'accounting.pettycash.create_expense')
ON CONFLICT (module, role, permission_code) DO NOTHING;
