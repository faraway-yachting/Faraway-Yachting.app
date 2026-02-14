-- Add commission note field to bookings and cabin allocations
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_note text;
ALTER TABLE cabin_allocations ADD COLUMN IF NOT EXISTS commission_note text;
