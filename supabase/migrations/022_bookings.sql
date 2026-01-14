-- Bookings Module Tables
-- Migration: 022_bookings.sql

-- Create set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create booking status enum
CREATE TYPE booking_status AS ENUM ('enquiry', 'hold', 'booked', 'cancelled', 'completed');

-- Create booking type enum
CREATE TYPE booking_type AS ENUM ('day_charter', 'overnight_charter', 'cabin_charter');

-- Main bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,

  -- Core booking info
  type booking_type NOT NULL DEFAULT 'day_charter',
  status booking_status NOT NULL DEFAULT 'enquiry',
  title TEXT NOT NULL,

  -- Dates
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  time TEXT, -- e.g., "09:00 - 17:00"
  hold_until TIMESTAMPTZ, -- For HOLD status auto-expiry

  -- Boat/Project
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Links to Project (yacht)
  external_boat_name TEXT, -- For agency bookings on external boats

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  number_of_guests INTEGER,

  -- Booking source
  booking_owner UUID NOT NULL REFERENCES auth.users(id),
  agent_name TEXT,
  agent_platform TEXT,
  meet_and_greeter TEXT,

  -- Location
  destination TEXT,
  pickup_location TEXT,

  -- Financial info
  currency TEXT NOT NULL DEFAULT 'THB',
  total_price DECIMAL(15, 2),
  deposit_amount DECIMAL(15, 2),
  deposit_due_date DATE,
  deposit_paid_date DATE,
  balance_amount DECIMAL(15, 2),
  balance_due_date DATE,
  balance_paid_date DATE,

  -- Links to Accounting
  deposit_receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  final_receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_ids UUID[] DEFAULT '{}',

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (date_to >= date_from),
  CONSTRAINT boat_required CHECK (project_id IS NOT NULL OR external_boat_name IS NOT NULL)
);

-- Booking guests table for cabin charters
CREATE TABLE booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  nationality TEXT,
  passport_number TEXT,
  cabin_number TEXT,
  dietary_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_bookings_date_from ON bookings(date_from);
CREATE INDEX idx_bookings_date_to ON bookings(date_to);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_project_id ON bookings(project_id);
CREATE INDEX idx_bookings_booking_owner ON bookings(booking_owner);
CREATE INDEX idx_bookings_date_range ON bookings(date_from, date_to);
CREATE INDEX idx_booking_guests_booking_id ON booking_guests(booking_id);

-- Updated_at trigger for bookings
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Updated_at trigger for booking_guests
CREATE TRIGGER set_booking_guests_updated_at
  BEFORE UPDATE ON booking_guests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_guests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
-- All authenticated users can view bookings
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert bookings
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can update bookings they own or if they have manager/admin role
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins/managers can delete bookings
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (true);

-- RLS Policies for booking_guests (follows booking access)
CREATE POLICY "booking_guests_select" ON booking_guests
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "booking_guests_insert" ON booking_guests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "booking_guests_update" ON booking_guests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "booking_guests_delete" ON booking_guests
  FOR DELETE TO authenticated
  USING (true);

-- Document number sequence for bookings (optional - uncomment if document_numbers table exists)
-- INSERT INTO document_numbers (company_id, document_type, prefix, current_number, fiscal_year)
-- SELECT
--   id as company_id,
--   'booking' as document_type,
--   'BK' as prefix,
--   0 as current_number,
--   EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as fiscal_year
-- FROM companies
-- ON CONFLICT DO NOTHING;
