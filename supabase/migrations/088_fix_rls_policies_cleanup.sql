-- Migration 088: Fix RLS Policies - Complete Cleanup
-- The previous migration missed some policy names, causing conflicts.
-- This migration drops ALL policies and recreates them cleanly.

-- ============================================================================
-- PART 1: Drop ALL policies on user_module_roles (from migration 005)
-- ============================================================================

DROP POLICY IF EXISTS "user_module_roles_select" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_insert" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_update" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_delete" ON user_module_roles;
DROP POLICY IF EXISTS "Users can view their own module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can view all module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can insert module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can update module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Super admins can delete module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Admins can manage all module roles" ON user_module_roles;

-- Recreate with optimized auth.uid()
CREATE POLICY "user_module_roles_select" ON user_module_roles
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_insert" ON user_module_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_update" ON user_module_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_delete" ON user_module_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 2: Drop ALL policies on user_company_access
-- ============================================================================

DROP POLICY IF EXISTS "user_company_access_select" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_insert" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_update" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_delete" ON user_company_access;
DROP POLICY IF EXISTS "Users can view their own company access" ON user_company_access;
DROP POLICY IF EXISTS "Super admins can view all company access" ON user_company_access;
DROP POLICY IF EXISTS "Super admins can manage company access" ON user_company_access;

-- Recreate with optimized auth.uid()
CREATE POLICY "user_company_access_select" ON user_company_access
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_insert" ON user_company_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_update" ON user_company_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_delete" ON user_company_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 3: Drop ALL policies on user_project_access
-- ============================================================================

DROP POLICY IF EXISTS "user_project_access_select" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_insert" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_update" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_delete" ON user_project_access;
DROP POLICY IF EXISTS "Users can view their own project access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can view all project access" ON user_project_access;
DROP POLICY IF EXISTS "Super admins can manage project access" ON user_project_access;

-- Recreate with optimized auth.uid()
CREATE POLICY "user_project_access_select" ON user_project_access
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_insert" ON user_project_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_update" ON user_project_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_delete" ON user_project_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 4: Drop ALL policies on user_profiles
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles" ON user_profiles;

-- Recreate with optimized auth.uid()
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (
    id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid()) AND up.is_super_admin = true
    )
  );

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- Done! All user access policies are now clean and optimized.
-- ============================================================================
