-- Migration: Fix Supabase Security Advisor Warnings
-- 1. Ensure RLS is enabled on user_module_roles
-- 2. Recreate views with SECURITY INVOKER

-- ============================================================================
-- PART 1: Ensure RLS is enabled on user_module_roles
-- ============================================================================

-- Force enable RLS (this is idempotent - safe to run even if already enabled)
ALTER TABLE user_module_roles ENABLE ROW LEVEL SECURITY;

-- Also force the table to not bypass RLS for the table owner
ALTER TABLE user_module_roles FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Recreate user_effective_permissions view with SECURITY INVOKER
-- ============================================================================

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS user_effective_permissions;

CREATE VIEW user_effective_permissions
WITH (security_invoker = true)
AS
SELECT
  umr.user_id,
  umr.module,
  umr.role,
  rp.permission_code,
  p.resource,
  p.action,
  p.description
FROM user_module_roles umr
JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
JOIN permissions p ON p.code = rp.permission_code
WHERE umr.is_active = true
UNION ALL
-- Super admins get all permissions
SELECT
  up.id as user_id,
  p.module,
  'super_admin' as role,
  p.code as permission_code,
  p.resource,
  p.action,
  p.description
FROM user_profiles up
CROSS JOIN permissions p
WHERE up.is_super_admin = true;

COMMENT ON VIEW user_effective_permissions IS 'Shows all permissions a user has based on their roles. Super admins get all permissions. Uses SECURITY INVOKER to respect RLS.';

-- ============================================================================
-- PART 3: Recreate pending_revenue_recognition view with SECURITY INVOKER
-- ============================================================================

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS pending_revenue_recognition;

CREATE VIEW pending_revenue_recognition
WITH (security_invoker = true)
AS
SELECT
  rr.id,
  rr.company_id,
  rr.project_id,
  p.name as project_name,
  rr.receipt_id,
  r.receipt_number,
  rr.booking_id,
  rr.charter_date_from,
  rr.charter_date_to,
  rr.amount,
  rr.currency,
  rr.thb_amount,
  rr.revenue_account,
  rr.charter_type,
  rr.client_name,
  rr.description,
  rr.recognition_status,
  rr.created_at,
  CASE
    WHEN rr.charter_date_to IS NULL THEN 'No charter date'
    WHEN rr.charter_date_to <= CURRENT_DATE THEN 'Ready to recognize'
    ELSE 'Awaiting charter completion'
  END as status_label,
  CASE
    WHEN rr.charter_date_to IS NOT NULL THEN rr.charter_date_to - CURRENT_DATE
    ELSE NULL
  END as days_until_recognition
FROM revenue_recognition rr
LEFT JOIN projects p ON p.id = rr.project_id
LEFT JOIN receipts r ON r.id = rr.receipt_id
WHERE rr.recognition_status IN ('pending', 'needs_review')
ORDER BY
  CASE WHEN rr.charter_date_to IS NULL THEN 1 ELSE 0 END,
  rr.charter_date_to ASC;

COMMENT ON VIEW pending_revenue_recognition IS 'Shows pending revenue recognition records. Uses SECURITY INVOKER to respect RLS.';
