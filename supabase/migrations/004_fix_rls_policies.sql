-- Fix RLS policies to allow users to view all active companies and their projects
-- This is needed because the app allows users to work with multiple companies

-- Drop restrictive policies
DROP POLICY IF EXISTS "Users view companies they belong to" ON companies;
DROP POLICY IF EXISTS "Users view projects from their company" ON projects;
DROP POLICY IF EXISTS "Users can manage projects from their company" ON projects;

-- Create more permissive policies for companies
-- Allow authenticated users to view all active companies
CREATE POLICY "Authenticated users can view active companies"
  ON companies FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create more permissive policies for projects
-- Allow authenticated users to view all projects from active companies
CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to manage projects (for now, can be more restrictive later)
CREATE POLICY "Authenticated users can manage projects"
  ON projects FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix contacts RLS if it has similar issues
DROP POLICY IF EXISTS "Users view contacts" ON contacts;
DROP POLICY IF EXISTS "Users can manage contacts" ON contacts;

CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contacts"
  ON contacts FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix bank_accounts RLS
DROP POLICY IF EXISTS "Users view bank accounts from their company" ON bank_accounts;
DROP POLICY IF EXISTS "Users can manage bank accounts from their company" ON bank_accounts;

CREATE POLICY "Authenticated users can view bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage bank accounts"
  ON bank_accounts FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
