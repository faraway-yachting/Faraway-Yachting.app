-- Cash Collection & Handover Tracking
-- Tracks cash payments collected by team members and their handover to owner/manager

CREATE TABLE IF NOT EXISTS cash_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  booking_id UUID REFERENCES bookings(id),

  -- Collection
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  collected_by UUID NOT NULL REFERENCES auth.users(id),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collection_notes TEXT,

  -- Handover
  status TEXT NOT NULL DEFAULT 'collected'
    CHECK (status IN ('collected', 'pending_handover', 'accepted', 'rejected')),
  handed_over_to UUID REFERENCES auth.users(id),
  handover_initiated_at TIMESTAMPTZ,
  handover_notes TEXT,

  -- Confirmation
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_collections_company ON cash_collections(company_id);
CREATE INDEX idx_cash_collections_booking ON cash_collections(booking_id);
CREATE INDEX idx_cash_collections_status ON cash_collections(status);
CREATE INDEX idx_cash_collections_collected_by ON cash_collections(collected_by);

ALTER TABLE cash_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cash collections"
  ON cash_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage cash collections"
  ON cash_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_cash_collections_updated_at
  BEFORE UPDATE ON cash_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
