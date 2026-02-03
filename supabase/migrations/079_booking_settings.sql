-- Global booking settings (boat colors, external boats, calendar display, banner)
CREATE TABLE booking_settings (
  id text PRIMARY KEY DEFAULT 'default',
  boat_colors jsonb NOT NULL DEFAULT '[]',
  external_boats jsonb NOT NULL DEFAULT '[]',
  banner_image_url text,
  calendar_display jsonb NOT NULL DEFAULT '{"allBookingsFields":["title","customerName"],"boatTabFields":["title","customerName","bookingType"]}',
  updated_at timestamptz DEFAULT now()
);

-- Seed default row
INSERT INTO booking_settings (id) VALUES ('default');

-- Allow authenticated users to read and update
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read booking_settings" ON booking_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update booking_settings" ON booking_settings FOR UPDATE TO authenticated USING (true);
