-- Add itemized extras with pricing and type (internal/external) for commission tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_items jsonb DEFAULT '[]';
ALTER TABLE cabin_allocations ADD COLUMN IF NOT EXISTS extra_items jsonb DEFAULT '[]';
