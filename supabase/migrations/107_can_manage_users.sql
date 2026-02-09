-- Migration 107: Add can_manage_users flag to user_profiles
-- Allows specific non-super-admin users to invite new users from the admin panel

ALTER TABLE user_profiles ADD COLUMN can_manage_users BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.can_manage_users IS 'Allows non-super-admin users to invite new users from the admin panel';
