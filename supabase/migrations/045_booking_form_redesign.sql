-- ============================================================================
-- Booking Form Redesign
-- New columns, booking_payments table, booking_crew table, storage bucket
-- ============================================================================

-- 1. New columns on bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_channel TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS charter_fee DECIMAL(15, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_charges DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS departure_from TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS arrival_to TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS charter_time TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_commission DECIMAL(15, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_deduction DECIMAL(15, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_received DECIMAL(15, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS finance_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS finance_attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_note_attachments JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data to new columns
UPDATE bookings SET departure_from = pickup_location WHERE pickup_location IS NOT NULL AND departure_from IS NULL;
UPDATE bookings SET charter_fee = total_price WHERE total_price IS NOT NULL AND charter_fee IS NULL;

-- 2. Booking payments table (multiple deposits/balances in multiple currencies)
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'deposit', -- 'deposit' or 'balance'
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  due_date DATE,
  paid_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_payments_booking_id ON booking_payments(booking_id);

CREATE TRIGGER set_booking_payments_updated_at
  BEFORE UPDATE ON booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 3. Booking crew table (many-to-many bookings <-> employees)
CREATE TABLE booking_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, employee_id)
);

CREATE INDEX idx_booking_crew_booking_id ON booking_crew(booking_id);
CREATE INDEX idx_booking_crew_employee_id ON booking_crew(employee_id);

-- 4. RLS for new tables
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_crew ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage booking_payments"
  ON booking_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage booking_crew"
  ON booking_crew FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Storage bucket for booking attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-attachments', 'booking-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload booking attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'booking-attachments');

CREATE POLICY "Authenticated users can read booking attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'booking-attachments');

CREATE POLICY "Authenticated users can delete booking attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'booking-attachments');
