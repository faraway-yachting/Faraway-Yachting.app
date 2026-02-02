-- Commission Records table for tracking sales team commissions
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID REFERENCES projects(id),
  charter_date_from DATE,
  charter_date_to DATE,
  charter_type TEXT,
  booking_type TEXT NOT NULL DEFAULT 'direct',
  charter_fee NUMERIC(15,2) DEFAULT 0,
  management_fee NUMERIC(15,2) DEFAULT 0,
  net_income NUMERIC(15,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  total_commission NUMERIC(15,2) DEFAULT 0,
  booking_owner_id UUID REFERENCES auth.users(id),
  currency TEXT DEFAULT 'THB',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage commission_records"
  ON commission_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_commission_records_boat ON commission_records(boat_id);
CREATE INDEX idx_commission_records_owner ON commission_records(booking_owner_id);
CREATE INDEX idx_commission_records_date ON commission_records(charter_date_from);
