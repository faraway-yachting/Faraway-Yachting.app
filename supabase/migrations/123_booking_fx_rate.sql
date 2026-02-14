-- Add exchange rate fields to bookings for multi-currency support
-- When currency != THB, store the FX rate and THB equivalent of total price
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(15,6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fx_rate_source TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS thb_total_price NUMERIC(15,2);
