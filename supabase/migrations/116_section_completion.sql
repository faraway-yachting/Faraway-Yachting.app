-- Add section completion tracking to bookings and cabin allocations
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_sections jsonb DEFAULT '{}';
ALTER TABLE cabin_allocations ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;
