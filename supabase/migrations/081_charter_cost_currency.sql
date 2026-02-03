-- Add currency column for charter cost (external boat payments may be in different currency)
ALTER TABLE bookings ADD COLUMN charter_cost_currency TEXT DEFAULT 'THB';
