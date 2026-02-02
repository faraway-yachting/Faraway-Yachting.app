-- ============================================================================
-- 072: Add sales_owner_id to bookings (employee-based booking owner)
-- ============================================================================

-- Add sales_owner_id referencing employees table
ALTER TABLE bookings ADD COLUMN sales_owner_id UUID REFERENCES employees(id);
CREATE INDEX idx_bookings_sales_owner ON bookings(sales_owner_id);
