-- Fix inventory purchase RLS policies to match expenses pattern
-- Expenses use simple authenticated user check (migration 007)

-- ============================================================================
-- inventory_purchases
-- ============================================================================
DROP POLICY IF EXISTS "Users view inventory purchases from their company" ON inventory_purchases;
DROP POLICY IF EXISTS "Users can manage inventory purchases from their company" ON inventory_purchases;

CREATE POLICY "Authenticated users can view inventory purchases"
  ON inventory_purchases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage inventory purchases"
  ON inventory_purchases FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- inventory_purchase_line_items
-- ============================================================================
DROP POLICY IF EXISTS "Users view inventory purchase line items" ON inventory_purchase_line_items;
DROP POLICY IF EXISTS "Users can manage inventory purchase line items" ON inventory_purchase_line_items;

CREATE POLICY "Authenticated users can view inventory purchase line items"
  ON inventory_purchase_line_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage inventory purchase line items"
  ON inventory_purchase_line_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- inventory_consumption_records
-- ============================================================================
DROP POLICY IF EXISTS "Users view inventory consumption records" ON inventory_consumption_records;
DROP POLICY IF EXISTS "Users can manage inventory consumption records" ON inventory_consumption_records;

CREATE POLICY "Authenticated users can view inventory consumption records"
  ON inventory_consumption_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage inventory consumption records"
  ON inventory_consumption_records FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- inventory_purchase_payments
-- ============================================================================
DROP POLICY IF EXISTS "Users view inventory purchase payments" ON inventory_purchase_payments;
DROP POLICY IF EXISTS "Users can manage inventory purchase payments" ON inventory_purchase_payments;

CREATE POLICY "Authenticated users can view inventory purchase payments"
  ON inventory_purchase_payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage inventory purchase payments"
  ON inventory_purchase_payments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
