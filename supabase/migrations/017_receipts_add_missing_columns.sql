-- Migration: Add missing columns to receipts table
-- Adds: reference, pricing_type, total_received, charter_period_from, charter_period_to

-- Add missing columns to receipts
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'exclude_vat',
  ADD COLUMN IF NOT EXISTS total_received NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charter_period_from DATE,
  ADD COLUMN IF NOT EXISTS charter_period_to DATE;

-- Create index for reference lookups
CREATE INDEX IF NOT EXISTS idx_receipts_reference ON receipts(reference);

-- Update total_received from payment records for existing receipts
UPDATE receipts r
SET total_received = COALESCE((
  SELECT SUM(pr.amount)
  FROM receipt_payment_records pr
  WHERE pr.receipt_id = r.id
), 0)
WHERE total_received = 0 OR total_received IS NULL;
