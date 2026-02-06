-- Set super admin for specific user only
UPDATE user_profiles SET is_super_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'oilnuttakarn@gmail.com');
