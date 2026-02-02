-- Add extras (multi-select array) and charter contract fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_note TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_attachments JSONB DEFAULT NULL;

-- Seed default extras options into booking_lookups
INSERT INTO booking_lookups (category, value, label, sort_order, is_active) VALUES
  ('extras', 'taxi', 'Taxi', 1, true),
  ('extras', 'bbq', 'BBQ', 2, true),
  ('extras', 'diving', 'Diving', 3, true)
ON CONFLICT DO NOTHING;
