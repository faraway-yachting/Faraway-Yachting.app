-- Mark user_has_company_access() as STABLE for RLS performance
-- STABLE tells Postgres the function returns the same result for the same inputs
-- within a single query, enabling result caching instead of re-executing
-- the 2 subqueries for every single row checked by RLS.
-- This function is used in 62+ RLS policies.

CREATE OR REPLACE FUNCTION user_has_company_access(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Super admin has access to all companies (fast-path)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN TRUE;
  END IF;

  -- Check user_company_access table
  RETURN EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
END;
$$;
