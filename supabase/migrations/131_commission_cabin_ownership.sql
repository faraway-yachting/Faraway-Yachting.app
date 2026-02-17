-- Add cabin charter support and ownership-based commission calculation
--
-- 1. projects.management_ownership_percentage: cached from participant flagged as management company
-- 2. commission_records: cabin_allocation_id, commission_base, ownership_percentage
-- 3. Replace unique index to allow multiple records per cabin charter booking

-- 1a. Add management ownership percentage to projects (denormalized from participants JSONB)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS management_ownership_percentage NUMERIC(5,2) NOT NULL DEFAULT 100;

COMMENT ON COLUMN projects.management_ownership_percentage IS
  'Ownership % of the management company (auto-populated from participant with isManagementCompany flag). Used for commission calculations.';

-- 1b. Add columns to commission_records for cabin charter support and ownership tracking
ALTER TABLE commission_records
  ADD COLUMN IF NOT EXISTS cabin_allocation_id UUID REFERENCES cabin_allocations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS commission_base NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ownership_percentage NUMERIC(5,2) DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_commission_records_cabin_allocation
  ON commission_records(cabin_allocation_id);

-- 1c. Replace old unique index (one record per booking) with two new indexes
--     to support multiple cabin allocation records per cabin charter booking
DROP INDEX IF EXISTS idx_commission_records_booking_id;

-- For non-cabin bookings: still one commission record per booking
CREATE UNIQUE INDEX idx_commission_records_booking_no_cabin
  ON commission_records(booking_id)
  WHERE booking_id IS NOT NULL AND cabin_allocation_id IS NULL;

-- For cabin charter bookings: one commission record per cabin allocation
CREATE UNIQUE INDEX idx_commission_records_booking_cabin
  ON commission_records(booking_id, cabin_allocation_id)
  WHERE booking_id IS NOT NULL AND cabin_allocation_id IS NOT NULL;

-- 1d. Backfill existing records with defaults
UPDATE commission_records
SET commission_base = net_income,
    ownership_percentage = 100
WHERE commission_base IS NULL OR commission_base = 0;
