-- Migration 148: Per-booking taxi guest links
-- Allows sharing taxi transfer details per booking with guests

CREATE TABLE IF NOT EXISTS taxi_booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taxi_booking_links_token ON taxi_booking_links(token);
CREATE INDEX IF NOT EXISTS idx_taxi_booking_links_booking ON taxi_booking_links(booking_id);

-- RLS
ALTER TABLE taxi_booking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage taxi booking links"
  ON taxi_booking_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_taxi_booking_links_updated_at
  BEFORE UPDATE ON taxi_booking_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
