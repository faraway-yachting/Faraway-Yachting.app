-- Migration 142: Taxi transfers
-- Each row represents one taxi order (pickup, return, or both legs)

CREATE TABLE taxi_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL UNIQUE,

  -- Link to booking (optional)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Transfer type and status
  trip_type TEXT NOT NULL DEFAULT 'round_trip'
    CHECK (trip_type IN ('pickup_only', 'return_only', 'round_trip')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'assigned', 'completed', 'cancelled')),

  -- Guest info (auto-filled from booking or entered manually)
  boat_name TEXT,
  guest_name TEXT NOT NULL,
  contact_number TEXT,
  number_of_guests INTEGER,

  -- Pickup leg
  pickup_date DATE,
  pickup_time TEXT,
  pickup_location TEXT,
  pickup_location_url TEXT,
  pickup_dropoff TEXT,
  pickup_dropoff_url TEXT,

  -- Return leg
  return_date DATE,
  return_time TEXT,
  return_location TEXT,
  return_location_url TEXT,
  return_dropoff TEXT,
  return_dropoff_url TEXT,

  -- Taxi company assignment
  taxi_company_id UUID REFERENCES taxi_companies(id) ON DELETE SET NULL,

  -- Driver info (filled after taxi company confirms)
  driver_name TEXT,
  driver_phone TEXT,
  van_number_plate TEXT,

  -- Payment
  paid_by TEXT DEFAULT 'guest'
    CHECK (paid_by IN ('guest', 'agency', 'faraway')),
  amount DECIMAL(15, 2),
  currency TEXT NOT NULL DEFAULT 'THB',
  payment_note TEXT,
  faraway_paid BOOLEAN NOT NULL DEFAULT false,
  faraway_paid_date DATE,
  faraway_paid_week TEXT,

  -- Notes
  guest_note TEXT,
  driver_note TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taxi_transfers_booking ON taxi_transfers(booking_id);
CREATE INDEX idx_taxi_transfers_company ON taxi_transfers(taxi_company_id);
CREATE INDEX idx_taxi_transfers_pickup_date ON taxi_transfers(pickup_date);
CREATE INDEX idx_taxi_transfers_return_date ON taxi_transfers(return_date);
CREATE INDEX idx_taxi_transfers_number ON taxi_transfers(transfer_number);
CREATE INDEX idx_taxi_transfers_faraway_paid_week ON taxi_transfers(faraway_paid_week);

CREATE TRIGGER set_taxi_transfers_updated_at
  BEFORE UPDATE ON taxi_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi transfers"
  ON taxi_transfers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi transfers"
  ON taxi_transfers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi transfers"
  ON taxi_transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi transfers"
  ON taxi_transfers FOR DELETE TO authenticated USING (true);
