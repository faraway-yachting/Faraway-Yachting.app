-- Migration: Add charter information columns to quotations, invoices, and receipts
-- This adds boat_id, charter_type, charter_date_from, charter_date_to, and charter_time

-- ============= QUOTATIONS =============

-- Add charter info columns to quotations
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS charter_type TEXT,
  ADD COLUMN IF NOT EXISTS charter_date_from DATE,
  ADD COLUMN IF NOT EXISTS charter_date_to DATE,
  ADD COLUMN IF NOT EXISTS charter_time TEXT;

-- Migrate existing data (charter_period_* to charter_date_*)
UPDATE quotations SET
  charter_date_from = charter_period_from,
  charter_date_to = charter_period_to
WHERE charter_period_from IS NOT NULL AND charter_date_from IS NULL;

-- Create index for boat lookups
CREATE INDEX IF NOT EXISTS idx_quotations_boat_id ON quotations(boat_id);

-- ============= INVOICES =============

-- Add charter info columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS charter_type TEXT,
  ADD COLUMN IF NOT EXISTS charter_date_from DATE,
  ADD COLUMN IF NOT EXISTS charter_date_to DATE,
  ADD COLUMN IF NOT EXISTS charter_time TEXT;

-- Migrate existing data
UPDATE invoices SET
  charter_date_from = charter_period_from,
  charter_date_to = charter_period_to
WHERE charter_period_from IS NOT NULL AND charter_date_from IS NULL;

-- Create index for boat lookups
CREATE INDEX IF NOT EXISTS idx_invoices_boat_id ON invoices(boat_id);

-- ============= RECEIPTS =============

-- Add charter info columns to receipts
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS charter_type TEXT,
  ADD COLUMN IF NOT EXISTS charter_date_from DATE,
  ADD COLUMN IF NOT EXISTS charter_date_to DATE,
  ADD COLUMN IF NOT EXISTS charter_time TEXT;

-- Create index for boat lookups
CREATE INDEX IF NOT EXISTS idx_receipts_boat_id ON receipts(boat_id);

-- ============= COMMENTS =============
-- Charter Type values (aligned with Chart of Accounts):
--   'day_charter'         -> 4010: Charter Revenue - Day Charters
--   'overnight_charter'   -> 4020: Charter Revenue - Overnight charter
--   'cabin_charter'       -> 4030: Charter Revenue - Cabin charter
--   'other_charter'       -> 4040: Other charter Revenue
--   'bareboat_charter'    -> 4050: Commission Revenue - Bareboat charter
--   'crewed_charter'      -> 4060: Commission Revenue - Crewed charter
--   'outsource_commission'-> 4070: Commission Revenue - Outsource services Commission
