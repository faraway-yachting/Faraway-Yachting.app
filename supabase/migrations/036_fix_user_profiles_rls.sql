-- Migration 036: Fix user_profiles RLS policies for super admin
-- The existing policy checks role='admin' but we use is_super_admin=true

-- Drop the old policy that checks role='admin'
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Create new policy that checks is_super_admin
CREATE POLICY "Super admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Also update the SELECT policy to include super admins
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
