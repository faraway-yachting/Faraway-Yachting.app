-- Migration 089: Fix RLS Recursive Query Issue
-- The previous policies had recursive queries that caused failures.
-- This migration uses the SECURITY DEFINER function to check super_admin status.

-- First, ensure the helper function exists with SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- PART 1: Fix user_profiles policies (use function instead of subquery)
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;

-- Users can read their own profile, super admins can read all
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (
    id = (select auth.uid()) OR is_current_user_super_admin()
  );

-- Users can update their own profile only
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Only super admins can insert new profiles
CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT WITH CHECK (is_current_user_super_admin());

-- Only super admins can delete profiles
CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 2: Fix user_module_roles policies
-- ============================================================================

DROP POLICY IF EXISTS "user_module_roles_select" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_insert" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_update" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_delete" ON user_module_roles;

CREATE POLICY "user_module_roles_select" ON user_module_roles
  FOR SELECT USING (
    user_id = (select auth.uid()) OR is_current_user_super_admin()
  );

CREATE POLICY "user_module_roles_insert" ON user_module_roles
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "user_module_roles_update" ON user_module_roles
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "user_module_roles_delete" ON user_module_roles
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 3: Fix user_company_access policies
-- ============================================================================

DROP POLICY IF EXISTS "user_company_access_select" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_insert" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_update" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_delete" ON user_company_access;

CREATE POLICY "user_company_access_select" ON user_company_access
  FOR SELECT USING (
    user_id = (select auth.uid()) OR is_current_user_super_admin()
  );

CREATE POLICY "user_company_access_insert" ON user_company_access
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "user_company_access_update" ON user_company_access
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "user_company_access_delete" ON user_company_access
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- PART 4: Fix user_project_access policies
-- ============================================================================

DROP POLICY IF EXISTS "user_project_access_select" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_insert" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_update" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_delete" ON user_project_access;

CREATE POLICY "user_project_access_select" ON user_project_access
  FOR SELECT USING (
    user_id = (select auth.uid()) OR is_current_user_super_admin()
  );

CREATE POLICY "user_project_access_insert" ON user_project_access
  FOR INSERT WITH CHECK (is_current_user_super_admin());

CREATE POLICY "user_project_access_update" ON user_project_access
  FOR UPDATE USING (is_current_user_super_admin());

CREATE POLICY "user_project_access_delete" ON user_project_access
  FOR DELETE USING (is_current_user_super_admin());

-- ============================================================================
-- Done! Policies now use SECURITY DEFINER function to avoid recursion.
-- ============================================================================
