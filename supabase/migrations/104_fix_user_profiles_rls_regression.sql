-- Migration 104: Fix user_profiles RLS regression from migration 103
--
-- Migration 103 accidentally replaced the SECURITY DEFINER function
-- is_current_user_super_admin() with self-referential EXISTS subqueries
-- on user_profiles, reintroducing the recursive RLS bug that migration 089 fixed.
--
-- This migration restores the correct pattern: use is_current_user_super_admin()
-- for user_profiles policies to avoid infinite recursion.

-- Ensure the SECURITY DEFINER helper function exists
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
-- Fix user_profiles policies (restore SECURITY DEFINER function usage)
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;

-- Users can read their own profile, super admins can read all
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    id = (select auth.uid()) OR is_current_user_super_admin()
  );

-- Users can update their own profile only
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Only super admins can insert new profiles
CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_super_admin());

-- Only super admins can delete profiles
CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE TO authenticated
  USING (is_current_user_super_admin());
