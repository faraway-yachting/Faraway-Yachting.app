-- Booking Agencies
-- Links agencies/agents to contacts for commission tracking

CREATE TABLE IF NOT EXISTS booking_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Agency-specific fields
  platform TEXT,
  commission_rate DECIMAL(5, 2),
  default_currency TEXT DEFAULT 'THB',

  -- Contract
  contract_url TEXT,
  contract_filename TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One agency per contact
CREATE UNIQUE INDEX idx_booking_agencies_contact_unique ON booking_agencies(contact_id);
CREATE INDEX idx_booking_agencies_platform ON booking_agencies(platform);
CREATE INDEX idx_booking_agencies_is_active ON booking_agencies(is_active);

-- Updated_at trigger
CREATE TRIGGER set_booking_agencies_updated_at
  BEFORE UPDATE ON booking_agencies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE booking_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_agencies_select" ON booking_agencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "booking_agencies_insert" ON booking_agencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "booking_agencies_update" ON booking_agencies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "booking_agencies_delete" ON booking_agencies FOR DELETE TO authenticated USING (true);
