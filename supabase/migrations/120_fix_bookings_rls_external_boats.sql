-- Fix bookings RLS policies to support external boats (NULL project_id)
-- The SELECT policy was missing super admin bypass, causing INSERT...RETURNING to fail

-- Drop all existing bookings policies
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "bookings_delete" ON bookings;

-- SELECT: super admin OR project company access OR external boat (null project_id) with module access
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated
  USING (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = bookings.project_id
        AND user_has_company_access((select auth.uid()), p.company_id)
      )
    )
    OR (
      bookings.project_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
  );

-- INSERT: super admin OR project access + module role OR external boat + module role
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
    OR (
      bookings.project_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
  );

-- UPDATE: same logic as INSERT
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
    OR (
      bookings.project_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
  );

-- DELETE: super admin OR project access + manager/admin role OR external boat + manager/admin
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin')
        AND is_active = true
      )
    )
    OR (
      bookings.project_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin')
        AND is_active = true
      )
    )
  );
