-- Booking Lookups: Single table for all dynamic dropdown values
-- Categories: contact_channel, agent_platform, charter_type, booking_status,
--             payment_status, currency, payment_type, time_preset,
--             destination, departure_location, arrival_location

CREATE TABLE IF NOT EXISTS booking_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, value)
);

-- Trigger for updated_at
CREATE TRIGGER set_booking_lookups_updated_at
  BEFORE UPDATE ON booking_lookups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast category lookups
CREATE INDEX idx_booking_lookups_category ON booking_lookups(category, sort_order);

-- RLS
ALTER TABLE booking_lookups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read booking_lookups"
  ON booking_lookups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert booking_lookups"
  ON booking_lookups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update booking_lookups"
  ON booking_lookups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete booking_lookups"
  ON booking_lookups FOR DELETE TO authenticated USING (true);

-- Seed: Contact Channels
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('contact_channel', 'whatsapp', 'WhatsApp', 1),
  ('contact_channel', 'email', 'Email', 2),
  ('contact_channel', 'line', 'Line', 3),
  ('contact_channel', 'phone', 'Phone', 4),
  ('contact_channel', 'other', 'Other', 5);

-- Seed: Agent Platforms
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('agent_platform', 'Direct', 'Direct', 1),
  ('agent_platform', 'GetYourGuide', 'GetYourGuide', 2),
  ('agent_platform', 'Viator', 'Viator', 3),
  ('agent_platform', 'Klook', 'Klook', 4),
  ('agent_platform', 'Airbnb Experiences', 'Airbnb Experiences', 5),
  ('agent_platform', 'Charter Agency', 'Charter Agency', 6),
  ('agent_platform', 'Hotel Concierge', 'Hotel Concierge', 7),
  ('agent_platform', 'Other', 'Other', 8);

-- Seed: Charter Types
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('charter_type', 'day_charter', 'Day Charter', 1),
  ('charter_type', 'overnight_charter', 'Overnight Charter', 2),
  ('charter_type', 'cabin_charter', 'Cabin Charter', 3);

-- Seed: Booking Statuses
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('booking_status', 'enquiry', 'Enquiry', 1),
  ('booking_status', 'hold', 'Hold', 2),
  ('booking_status', 'booked', 'Booked', 3),
  ('booking_status', 'cancelled', 'Cancelled', 4),
  ('booking_status', 'completed', 'Completed', 5);

-- Seed: Payment Statuses
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('payment_status', 'unpaid', 'Unpaid', 1),
  ('payment_status', 'partial', 'Partially Paid', 2),
  ('payment_status', 'paid', 'Paid', 3);

-- Seed: Currencies
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('currency', 'THB', 'THB', 1),
  ('currency', 'USD', 'USD', 2),
  ('currency', 'EUR', 'EUR', 3),
  ('currency', 'GBP', 'GBP', 4),
  ('currency', 'SGD', 'SGD', 5),
  ('currency', 'AED', 'AED', 6);

-- Seed: Payment Types
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('payment_type', 'deposit', 'Deposit', 1),
  ('payment_type', 'balance', 'Balance', 2);

-- Seed: Time Presets
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('time_preset', '08:00 - 16:00', '08:00 - 16:00', 1),
  ('time_preset', '08:30 - 16:30', '08:30 - 16:30', 2),
  ('time_preset', '09:00 - 17:00', '09:00 - 17:00', 3),
  ('time_preset', '09:30 - 17:30', '09:30 - 17:30', 4),
  ('time_preset', '10:00 - 18:00', '10:00 - 18:00', 5),
  ('time_preset', '10:30 - 18:30', '10:30 - 18:30', 6),
  ('time_preset', '11:00 - 11:00', '11:00 - 11:00', 7),
  ('time_preset', 'To Be Confirmed', 'To Be Confirmed', 8);

-- Seed: Destinations (common ones)
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('destination', 'Phi Phi Islands', 'Phi Phi Islands', 1),
  ('destination', 'James Bond Island', 'James Bond Island', 2),
  ('destination', 'Similan Islands', 'Similan Islands', 3),
  ('destination', 'Coral Island', 'Coral Island', 4),
  ('destination', 'Racha Islands', 'Racha Islands', 5),
  ('destination', 'Maiton Island', 'Maiton Island', 6);

-- Seed: Departure Locations
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('departure_location', 'Ao Po Grand Marina', 'Ao Po Grand Marina', 1),
  ('departure_location', 'Royal Phuket Marina', 'Royal Phuket Marina', 2),
  ('departure_location', 'Yacht Haven Marina', 'Yacht Haven Marina', 3),
  ('departure_location', 'Boat Lagoon Marina', 'Boat Lagoon Marina', 4),
  ('departure_location', 'Chalong Pier', 'Chalong Pier', 5);

-- Seed: Arrival Locations (same as departure by default)
INSERT INTO booking_lookups (category, value, label, sort_order) VALUES
  ('arrival_location', 'Ao Po Grand Marina', 'Ao Po Grand Marina', 1),
  ('arrival_location', 'Royal Phuket Marina', 'Royal Phuket Marina', 2),
  ('arrival_location', 'Yacht Haven Marina', 'Yacht Haven Marina', 3),
  ('arrival_location', 'Boat Lagoon Marina', 'Boat Lagoon Marina', 4),
  ('arrival_location', 'Chalong Pier', 'Chalong Pier', 5);
