-- Meet & Greeters table for booking form dropdown
CREATE TABLE meet_greeters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add meet_greeter_id to bookings
ALTER TABLE bookings ADD COLUMN meet_greeter_id UUID REFERENCES meet_greeters(id);

-- RLS policies
ALTER TABLE meet_greeters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read meet_greeters" ON meet_greeters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert meet_greeters" ON meet_greeters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update meet_greeters" ON meet_greeters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete meet_greeters" ON meet_greeters FOR DELETE TO authenticated USING (true);

-- Index for active greeters
CREATE INDEX idx_meet_greeters_active ON meet_greeters (is_active) WHERE is_active = true;
