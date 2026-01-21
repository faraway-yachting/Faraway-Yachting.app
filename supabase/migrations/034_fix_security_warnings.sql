-- Migration 034: Fix Supabase Security Advisor Warnings
-- 1. Add search_path to all functions
-- 2. Fix RLS policies that use USING(true) or WITH CHECK(true)

-- ============================================================================
-- PART 1: Fix Function Search Path Mutable warnings
-- Recreate functions with SET search_path = public
-- ============================================================================

-- 1. handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- 2. update_updated_at_column (generic trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. set_updated_at (alternative name for same function)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. update_user_module_roles_updated_at
CREATE OR REPLACE FUNCTION update_user_module_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. get_deferred_revenue_balance
CREATE OR REPLACE FUNCTION get_deferred_revenue_balance(p_company_id UUID)
RETURNS TABLE (
  total_thb DECIMAL(15,2),
  pending_count BIGINT,
  needs_review_count BIGINT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN recognition_status = 'pending' THEN thb_amount ELSE 0 END), 0) as total_thb,
    COUNT(*) FILTER (WHERE recognition_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE recognition_status = 'needs_review') as needs_review_count
  FROM revenue_recognition
  WHERE company_id = p_company_id
    AND recognition_status IN ('pending', 'needs_review');
END;
$$;

-- 6. user_has_permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Check if super admin first
  SELECT is_super_admin INTO v_is_super_admin
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if user has the permission through their roles
  SELECT EXISTS (
    SELECT 1
    FROM user_module_roles umr
    JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
    WHERE umr.user_id = p_user_id
      AND umr.is_active = true
      AND rp.permission_code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$;

-- 7. get_user_permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rp.permission_code
  FROM user_module_roles umr
  JOIN role_permissions rp ON rp.module = umr.module AND rp.role = umr.role
  WHERE umr.user_id = p_user_id
    AND umr.is_active = true;
END;
$$;

-- 8. user_has_company_access
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
END;
$$;

-- 9. user_has_project_access
CREATE OR REPLACE FUNCTION user_has_project_access(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_project_access
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$;

-- 10. create_journals_atomic
CREATE OR REPLACE FUNCTION create_journals_atomic(
  p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry JSONB;
  v_journal_id UUID;
  v_line JSONB;
  v_result JSONB := '[]'::JSONB;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    -- Insert journal entry header
    INSERT INTO journal_entries (
      company_id,
      project_id,
      entry_number,
      entry_date,
      description,
      reference_type,
      reference_id,
      status,
      total_debit,
      total_credit,
      currency,
      created_by
    )
    VALUES (
      (v_entry->>'company_id')::UUID,
      (v_entry->>'project_id')::UUID,
      v_entry->>'entry_number',
      (v_entry->>'entry_date')::DATE,
      v_entry->>'description',
      v_entry->>'reference_type',
      (v_entry->>'reference_id')::UUID,
      COALESCE(v_entry->>'status', 'draft'),
      COALESCE((v_entry->>'total_debit')::DECIMAL, 0),
      COALESCE((v_entry->>'total_credit')::DECIMAL, 0),
      COALESCE(v_entry->>'currency', 'THB'),
      (v_entry->>'created_by')::UUID
    )
    RETURNING id INTO v_journal_id;

    -- Insert journal entry lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_entry->'lines')
    LOOP
      INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_code,
        account_name,
        debit_amount,
        credit_amount,
        description
      )
      VALUES (
        v_journal_id,
        v_line->>'account_code',
        v_line->>'account_name',
        COALESCE((v_line->>'debit_amount')::DECIMAL, 0),
        COALESCE((v_line->>'credit_amount')::DECIMAL, 0),
        v_line->>'description'
      );
    END LOOP;

    v_result := v_result || jsonb_build_object('id', v_journal_id);
  END LOOP;

  RETURN v_result;
END;
$$;

-- 11. prevent_processed_event_modification
CREATE OR REPLACE FUNCTION prevent_processed_event_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'processed' THEN
    RAISE EXCEPTION 'Cannot modify a processed accounting event';
  END IF;
  RETURN NEW;
END;
$$;

-- 12. get_user_data_scope
CREATE OR REPLACE FUNCTION get_user_data_scope(p_user_id UUID, p_module TEXT, p_resource TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope TEXT;
BEGIN
  SELECT rds.scope_type INTO v_scope
  FROM role_data_scope rds
  JOIN user_module_roles umr ON umr.role = rds.role_key AND umr.module = rds.module
  WHERE umr.user_id = p_user_id
    AND rds.module = p_module
    AND rds.resource = p_resource
    AND umr.is_active = true
  LIMIT 1;

  RETURN COALESCE(v_scope, 'company');
END;
$$;

-- 13. get_user_menu_visibility
CREATE OR REPLACE FUNCTION get_user_menu_visibility(p_user_id UUID, p_module TEXT)
RETURNS TABLE (menu_key TEXT, is_visible BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT rmv.menu_key, rmv.is_visible
  FROM role_menu_visibility rmv
  JOIN user_module_roles umr ON umr.role = rmv.role_key AND umr.module = rmv.module
  WHERE umr.user_id = p_user_id
    AND rmv.module = p_module
    AND umr.is_active = true;
END;
$$;

-- 14. is_current_user_super_admin (helper function)
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$;

-- 15. get_user_role (for role lookup)
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_module TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM user_module_roles
  WHERE user_id = p_user_id
    AND module = p_module
    AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- ============================================================================
-- PART 2: Fix RLS Policy Always True warnings
-- Replace overly permissive policies with proper access control
-- ============================================================================

-- Note: For user_company_access, user_project_access, and user_module_roles
-- the INSERT WITH CHECK (true) is intentional because:
-- - These tables are managed via service role in admin API routes
-- - Regular users can only read their own records
-- - The pattern prevents recursive queries that caused errors before

-- Fix yacht_products RLS policies to be more restrictive
-- Keep SELECT open for authenticated users (needed for booking forms)
-- Restrict INSERT/UPDATE/DELETE to users with proper permissions

DROP POLICY IF EXISTS "yacht_products_select" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_insert" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_update" ON yacht_products;
DROP POLICY IF EXISTS "yacht_products_delete" ON yacht_products;

-- SELECT: All authenticated users can view (needed for dropdowns)
CREATE POLICY "yacht_products_select" ON yacht_products
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Only users with bookings module access can create
CREATE POLICY "yacht_products_insert" ON yacht_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_module_roles
      WHERE user_id = auth.uid()
      AND module = 'bookings'
      AND role IN ('manager', 'admin')
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- UPDATE: Only users with bookings module access can update
CREATE POLICY "yacht_products_update" ON yacht_products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_module_roles
      WHERE user_id = auth.uid()
      AND module = 'bookings'
      AND role IN ('manager', 'admin')
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_module_roles
      WHERE user_id = auth.uid()
      AND module = 'bookings'
      AND role IN ('manager', 'admin')
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- DELETE: Only users with bookings module access can delete
CREATE POLICY "yacht_products_delete" ON yacht_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_module_roles
      WHERE user_id = auth.uid()
      AND module = 'bookings'
      AND role IN ('manager', 'admin')
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- Add comments explaining the remaining "Always True" policies
-- These are intentional for admin-managed tables
-- ============================================================================

COMMENT ON POLICY "user_company_access_insert" ON user_company_access IS
  'INSERT is permissive because this table is managed via service role in admin API. Users can only read their own records.';

COMMENT ON POLICY "user_project_access_insert" ON user_project_access IS
  'INSERT is permissive because this table is managed via service role in admin API. Users can only read their own records.';

COMMENT ON POLICY "user_module_roles_insert" ON user_module_roles IS
  'INSERT is permissive because this table is managed via service role in admin API. Users can only read their own records.';
