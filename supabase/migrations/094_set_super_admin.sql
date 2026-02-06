UPDATE user_profiles 
SET is_super_admin = true 
WHERE is_super_admin IS NULL OR is_super_admin = false;
