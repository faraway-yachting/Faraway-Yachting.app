-- Migration 025: Permission System
-- Implements granular permission-based access control with RLS enforcement
-- This replaces the URL-based role selection with database-enforced permissions

-- ============================================================================
-- PART 1: Core Permission Tables
-- ============================================================================

-- Permissions catalog - defines all available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- e.g., 'accounting.expenses.create'
  module TEXT NOT NULL,                 -- 'accounting', 'bookings', etc.
  resource TEXT NOT NULL,               -- 'expenses', 'receipts', 'reports'
  action TEXT NOT NULL,                 -- 'view', 'create', 'edit', 'delete'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

-- Role-permission mapping - which roles have which permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  role TEXT NOT NULL,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, role, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_module_role ON role_permissions(module, role);

-- ============================================================================
-- PART 2: Access Control Tables
-- ============================================================================

-- User-Company access - controls which companies a user can access
CREATE TABLE IF NOT EXISTS user_company_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('admin', 'manager', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_company_access_user ON user_company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_access_company ON user_company_access(company_id);

-- User-Project access - controls which projects (yachts) a user can access
CREATE TABLE IF NOT EXISTS user_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('investor', 'crew', 'manager', 'full')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_project_access_user ON user_project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_access_project ON user_project_access(project_id);

-- ============================================================================
-- PART 3: Booking Financials Table (Column-Level Security)
-- RLS cannot hide columns, so we separate financial data from bookings
-- NOTE: Only created if bookings table exists
-- ============================================================================

DO $$
BEGIN
  -- Only create if bookings table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE TABLE IF NOT EXISTS booking_financials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      charter_fee DECIMAL(15,2),
      deposit_amount DECIMAL(15,2),
      deposit_due_date DATE,
      balance_amount DECIMAL(15,2),
      balance_due_date DATE,
      commission_rate DECIMAL(5,2),
      commission_amount DECIMAL(15,2),
      apa_amount DECIMAL(15,2),
      payment_status TEXT CHECK (payment_status IN ('pending', 'deposit_paid', 'fully_paid', 'refunded')),
      internal_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(booking_id)
    );

    CREATE INDEX IF NOT EXISTS idx_booking_financials_booking ON booking_financials(booking_id);
  END IF;
END $$;

-- ============================================================================
-- PART 4: Update Petty Cash Wallets
-- Rename user_id to owner_user_id for clarity and ensure proper access control
-- ============================================================================

-- Add owner_user_id if it doesn't exist (user_id already exists, so we'll use that)
-- The existing user_id column serves as the owner reference

-- ============================================================================
-- PART 5: Enable RLS on New Tables
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- Only enable RLS on booking_financials if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_financials') THEN
    ALTER TABLE booking_financials ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- PART 6: RLS Policies for Permission Tables (Read-only for most users)
-- ============================================================================

-- Permissions table - everyone can read (needed for permission checks)
CREATE POLICY "permissions_read_all" ON permissions
  FOR SELECT USING (true);

-- Role permissions - everyone can read (needed for permission checks)
CREATE POLICY "role_permissions_read_all" ON role_permissions
  FOR SELECT USING (true);

-- Only super admin can modify permissions and role_permissions
CREATE POLICY "permissions_write_super_admin" ON permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "role_permissions_write_super_admin" ON role_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- PART 7: RLS Policies for Access Control Tables
-- ============================================================================

-- User Company Access
-- Users can see their own company access
CREATE POLICY "user_company_access_read_own" ON user_company_access
  FOR SELECT USING (user_id = auth.uid());

-- Super admin can see all
CREATE POLICY "user_company_access_read_super_admin" ON user_company_access
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Only super admin can modify
CREATE POLICY "user_company_access_write_super_admin" ON user_company_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- User Project Access
-- Users can see their own project access
CREATE POLICY "user_project_access_read_own" ON user_project_access
  FOR SELECT USING (user_id = auth.uid());

-- Super admin can see all
CREATE POLICY "user_project_access_read_super_admin" ON user_project_access
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Only super admin can modify
CREATE POLICY "user_project_access_write_super_admin" ON user_project_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- PART 8: RLS Policy for Booking Financials (Manager/Accountant Only)
-- Agency and Crew have ZERO access to this table
-- NOTE: Only created if booking_financials table exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_financials') THEN
    -- Drop existing policies first
    DROP POLICY IF EXISTS "booking_financials_access" ON booking_financials;
    DROP POLICY IF EXISTS "booking_financials_write" ON booking_financials;

    CREATE POLICY "booking_financials_access" ON booking_financials
      FOR SELECT USING (
        -- Super admin
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR
        -- Manager/Accountant in bookings or accounting module
        EXISTS (
          SELECT 1 FROM user_module_roles umr
          WHERE umr.user_id = auth.uid()
          AND umr.module IN ('bookings', 'accounting')
          AND umr.role IN ('manager', 'admin', 'accountant')
          AND umr.is_active = true
        )
      );

    CREATE POLICY "booking_financials_write" ON booking_financials
      FOR ALL USING (
        -- Super admin
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR
        -- Manager in bookings or accounting module
        EXISTS (
          SELECT 1 FROM user_module_roles umr
          WHERE umr.user_id = auth.uid()
          AND umr.module IN ('bookings', 'accounting')
          AND umr.role IN ('manager', 'admin')
          AND umr.is_active = true
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 9: Helper Functions for Permission Checks
-- ============================================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Check if super admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM user_profiles WHERE id = p_user_id;

  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check role permissions
  SELECT EXISTS (
    SELECT 1
    FROM user_module_roles umr
    JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
    WHERE umr.user_id = p_user_id
    AND umr.is_active = true
    AND rp.permission_code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_code TEXT) AS $$
BEGIN
  -- Check if super admin (return all permissions)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN QUERY SELECT code FROM permissions;
    RETURN;
  END IF;

  -- Return permissions based on user's roles
  RETURN QUERY
  SELECT DISTINCT rp.permission_code
  FROM user_module_roles umr
  JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
  WHERE umr.user_id = p_user_id
  AND umr.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a company
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin has access to all
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN TRUE;
  END IF;

  -- Check user_company_access table
  RETURN EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a project
CREATE OR REPLACE FUNCTION user_has_project_access(
  p_user_id UUID,
  p_project_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin has access to all
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has company-level manager access (sees all projects in company)
  IF EXISTS (
    SELECT 1 FROM user_company_access uca
    JOIN projects p ON p.company_id = uca.company_id
    WHERE uca.user_id = p_user_id
    AND p.id = p_project_id
    AND uca.access_type IN ('admin', 'manager')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check specific project access
  RETURN EXISTS (
    SELECT 1 FROM user_project_access
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_company_access_updated_at ON user_company_access;
CREATE TRIGGER user_company_access_updated_at
  BEFORE UPDATE ON user_company_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_project_access_updated_at ON user_project_access;
CREATE TRIGGER user_project_access_updated_at
  BEFORE UPDATE ON user_project_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only create trigger if booking_financials exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_financials') THEN
    DROP TRIGGER IF EXISTS booking_financials_updated_at ON booking_financials;
    CREATE TRIGGER booking_financials_updated_at
      BEFORE UPDATE ON booking_financials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- PART 11: Comments
-- ============================================================================

COMMENT ON TABLE permissions IS 'Catalog of all permissions in the system. Format: module.resource.action';
COMMENT ON TABLE role_permissions IS 'Maps roles to permissions. Each module+role combination has specific permissions.';
COMMENT ON TABLE user_company_access IS 'Controls which companies a user can access. Managers see all data in their companies.';
COMMENT ON TABLE user_project_access IS 'Controls which projects (yachts) a user can access. For investors/crew with limited access.';

-- Only add comment if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_financials') THEN
    COMMENT ON TABLE booking_financials IS 'Financial data for bookings, separated for column-level security. Only managers/accountants can access.';
  END IF;
END $$;
