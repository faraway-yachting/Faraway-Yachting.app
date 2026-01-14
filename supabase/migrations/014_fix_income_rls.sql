-- Migration: Fix RLS policies for income documents (quotations, invoices, receipts)
-- This allows authenticated users to manage income documents regardless of company_id
-- Similar to the fix applied in 004_fix_rls_policies.sql for companies/projects

-- ============= QUOTATIONS =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view quotations from their company" ON quotations;
DROP POLICY IF EXISTS "Users can manage quotations from their company" ON quotations;

-- Create more permissive policies for quotations
CREATE POLICY "Authenticated users can view quotations"
  ON quotations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage quotations"
  ON quotations FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= QUOTATION LINE ITEMS =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view quotation line items" ON quotation_line_items;
DROP POLICY IF EXISTS "Users can manage quotation line items" ON quotation_line_items;

-- Create more permissive policies for quotation line items
CREATE POLICY "Authenticated users can view quotation line items"
  ON quotation_line_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage quotation line items"
  ON quotation_line_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= INVOICES =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view invoices from their company" ON invoices;
DROP POLICY IF EXISTS "Users can manage invoices from their company" ON invoices;

-- Create more permissive policies for invoices
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage invoices"
  ON invoices FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= INVOICE LINE ITEMS =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;

-- Create more permissive policies for invoice line items
CREATE POLICY "Authenticated users can view invoice line items"
  ON invoice_line_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage invoice line items"
  ON invoice_line_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= RECEIPTS =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view receipts from their company" ON receipts;
DROP POLICY IF EXISTS "Users can manage receipts from their company" ON receipts;

-- Create more permissive policies for receipts
CREATE POLICY "Authenticated users can view receipts"
  ON receipts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage receipts"
  ON receipts FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= RECEIPT LINE ITEMS =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view receipt line items" ON receipt_line_items;
DROP POLICY IF EXISTS "Users can manage receipt line items" ON receipt_line_items;

-- Create more permissive policies for receipt line items
CREATE POLICY "Authenticated users can view receipt line items"
  ON receipt_line_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage receipt line items"
  ON receipt_line_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Note: receipt_payments table doesn't exist in this schema
-- Payment records are stored differently
