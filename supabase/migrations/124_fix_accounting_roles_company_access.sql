-- Migration 124: Fix user_company_access for accounting roles
--
-- Problem: When users are assigned accounting roles (intern, accountant, sales),
-- their user_company_access record may still have access_type = 'viewer'.
-- The expenses, receipts, and invoices INSERT/UPDATE RLS policies (migration 026)
-- require access_type IN ('admin', 'manager', 'member').
--
-- This causes:
--   1. Intern can't create expenses (RLS violation)
--   2. Intern can't create expense claims (petty cash RLS)
--   3. Accountant can't create receipts (RLS violation)
--
-- Fix: Upgrade all users with active accounting roles to 'member' access_type,
-- and add a trigger to auto-upgrade when new roles are assigned.

-- ============================================================================
-- PART 1: Fix existing users
-- Upgrade viewer -> member for all users who have an active accounting role
-- that requires write access (intern, accountant, sales, petty-cash)
-- ============================================================================

UPDATE user_company_access uca
SET access_type = 'member', updated_at = NOW()
FROM user_module_roles umr
WHERE umr.user_id = uca.user_id
  AND umr.module = 'accounting'
  AND umr.role IN ('intern', 'accountant', 'sales', 'petty-cash')
  AND umr.is_active = true
  AND uca.access_type = 'viewer';

-- ============================================================================
-- PART 2: Trigger to auto-set access_type when accounting roles are assigned
-- When a user_module_roles row is inserted/updated with an accounting role,
-- ensure the user has at least 'member' access for all their companies.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_company_access_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on accounting module roles that need write access
  IF NEW.module = 'accounting'
     AND NEW.role IN ('intern', 'accountant', 'sales', 'petty-cash')
     AND NEW.is_active = true THEN

    -- Upgrade viewer -> member for all company access records of this user
    UPDATE user_company_access
    SET access_type = 'member', updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND access_type = 'viewer';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_company_access_on_role_change ON user_module_roles;

-- Create trigger on INSERT or UPDATE of user_module_roles
CREATE TRIGGER trg_sync_company_access_on_role_change
  AFTER INSERT OR UPDATE ON user_module_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_access_on_role_change();
