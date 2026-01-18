-- Migration 030: Fix RLS policies for role_permissions table
-- The previous policy used FOR ALL which doesn't properly handle INSERT/DELETE

-- Drop existing policies
DROP POLICY IF EXISTS "role_permissions_read_all" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_write_super_admin" ON role_permissions;

-- Recreate policies with proper coverage
-- Everyone can read
CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT USING (true);

-- Super admin can insert
CREATE POLICY "role_permissions_insert" ON role_permissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admin can update
CREATE POLICY "role_permissions_update" ON role_permissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admin can delete
CREATE POLICY "role_permissions_delete" ON role_permissions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
