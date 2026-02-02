-- Add admin fee and Beam charge tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS beam_charge_id TEXT;
