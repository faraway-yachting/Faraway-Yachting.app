-- Add Charter Fee, Admin Fee, FX Rate fields to cabin allocations
-- Replaces single "price" field with structured finance fields
-- like regular bookings (Charter Fee + Admin Fee + Total Cost)

ALTER TABLE cabin_allocations
  ADD COLUMN IF NOT EXISTS charter_fee numeric,
  ADD COLUMN IF NOT EXISTS admin_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fx_rate numeric,
  ADD COLUMN IF NOT EXISTS fx_rate_source text,
  ADD COLUMN IF NOT EXISTS thb_total_price numeric;

-- Backfill: existing price becomes charter_fee
UPDATE cabin_allocations
SET charter_fee = price
WHERE price IS NOT NULL AND charter_fee IS NULL;
