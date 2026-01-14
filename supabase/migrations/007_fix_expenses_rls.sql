-- Fix RLS policies for expenses table
-- Similar to 004_fix_rls_policies.sql, we need to allow authenticated users
-- to manage expenses across companies (for multi-company accounting)

-- Drop the restrictive company-based policies
DROP POLICY IF EXISTS "Users view expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can manage expenses from their company" ON expenses;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can view expenses"
  ON expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expenses"
  ON expenses FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix expense_line_items RLS
DROP POLICY IF EXISTS "Users can view expense line items" ON expense_line_items;
DROP POLICY IF EXISTS "Users can manage expense line items" ON expense_line_items;

CREATE POLICY "Authenticated users can view expense line items"
  ON expense_line_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expense line items"
  ON expense_line_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix expense_payments RLS
DROP POLICY IF EXISTS "Users can view expense payments" ON expense_payments;
DROP POLICY IF EXISTS "Users can manage expense payments" ON expense_payments;

CREATE POLICY "Authenticated users can view expense payments"
  ON expense_payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expense payments"
  ON expense_payments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
