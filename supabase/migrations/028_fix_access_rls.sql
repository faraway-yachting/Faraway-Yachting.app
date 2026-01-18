-- Migration 028: Fix RLS policies for access control tables
-- Removes recursive super admin checks that cause query failures

-- ============================================================================
-- Fix user_company_access policies
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "user_company_access_read_own" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_read_super_admin" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_write_super_admin" ON user_company_access;

-- Simple policy: users can read their own access records
-- This returns empty array (not error) if no records exist
CREATE POLICY "user_company_access_select" ON user_company_access
  FOR SELECT USING (user_id = auth.uid());

-- Write policy uses WITH CHECK instead of recursive USING
-- Super admins are handled by service role in admin API routes
CREATE POLICY "user_company_access_insert" ON user_company_access
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_company_access_update" ON user_company_access
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_company_access_delete" ON user_company_access
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Fix user_project_access policies
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "user_project_access_read_own" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_read_super_admin" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_write_super_admin" ON user_project_access;

-- Simple policy: users can read their own access records
CREATE POLICY "user_project_access_select" ON user_project_access
  FOR SELECT USING (user_id = auth.uid());

-- Write policies
CREATE POLICY "user_project_access_insert" ON user_project_access
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_project_access_update" ON user_project_access
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_project_access_delete" ON user_project_access
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Fix user_profiles policies (ensure no recursion)
-- ============================================================================

-- Drop any problematic policies
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_admin" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Simple non-recursive policies
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- Fix user_module_roles policies
-- ============================================================================

DROP POLICY IF EXISTS "user_module_roles_read_own" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_read_super_admin" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_write_super_admin" ON user_module_roles;

-- Users can read their own module roles
CREATE POLICY "user_module_roles_select" ON user_module_roles
  FOR SELECT USING (user_id = auth.uid());

-- Write policies (managed by admin API with service role)
CREATE POLICY "user_module_roles_insert" ON user_module_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_module_roles_update" ON user_module_roles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_module_roles_delete" ON user_module_roles
  FOR DELETE USING (user_id = auth.uid());
