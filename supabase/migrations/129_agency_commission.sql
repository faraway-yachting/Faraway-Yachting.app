-- Agency commission tracking: track what we owe/pay to agencies
-- and calculate sales commission from net price (after agency deduction)

-- Add agency commission fields to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS agency_commission_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_commission_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_commission_thb NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS agency_paid_date DATE,
  ADD COLUMN IF NOT EXISTS agency_payment_note TEXT;

-- Add same fields to cabin_allocations (per-cabin agency commission)
ALTER TABLE cabin_allocations
  ADD COLUMN IF NOT EXISTS agency_commission_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_commission_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_commission_thb NUMERIC,
  ADD COLUMN IF NOT EXISTS agency_payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS agency_paid_date DATE,
  ADD COLUMN IF NOT EXISTS agency_payment_note TEXT;
