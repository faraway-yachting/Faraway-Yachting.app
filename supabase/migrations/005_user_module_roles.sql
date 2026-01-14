-- Migration: User Module Roles
-- Implements multi-module role-based access control
-- Each user can have different roles in different modules

-- Create user_module_roles table
CREATE TABLE IF NOT EXISTS user_module_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('accounting', 'bookings', 'inventory', 'maintenance', 'customers', 'hr')),
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One role per module per user
  UNIQUE(user_id, module)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_module_roles_user_id ON user_module_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_roles_module ON user_module_roles(module);

-- Add columns to user_profiles for super admin and last module
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_module TEXT;

-- Enable RLS on user_module_roles
ALTER TABLE user_module_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_module_roles

-- Users can view their own module roles
CREATE POLICY "Users can view their own module roles"
  ON user_module_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all module roles
CREATE POLICY "Super admins can view all module roles"
  ON user_module_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Super admins can insert module roles
CREATE POLICY "Super admins can insert module roles"
  ON user_module_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Super admins can update module roles
CREATE POLICY "Super admins can update module roles"
  ON user_module_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Super admins can delete module roles
CREATE POLICY "Super admins can delete module roles"
  ON user_module_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_module_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS user_module_roles_updated_at ON user_module_roles;
CREATE TRIGGER user_module_roles_updated_at
  BEFORE UPDATE ON user_module_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_module_roles_updated_at();

-- Comment on table
COMMENT ON TABLE user_module_roles IS 'Stores module-specific roles for users. Each user can have different roles in different modules (accounting, bookings, inventory, etc.)';
