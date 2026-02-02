-- Migration: Add intercompany charter fee management
-- Tracks money distribution between company entities (no P&L impact)

-- Add intercompany configuration to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intercompany_owner_company_id UUID REFERENCES companies(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intercompany_fee_day_charter DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intercompany_fee_overnight DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intercompany_fee_cabin DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intercompany_fee_other DECIMAL(12,2);

-- Intercompany charter fee tracking table
CREATE TABLE IF NOT EXISTS intercompany_charter_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id),
  receipt_number TEXT,
  agency_company_id UUID REFERENCES companies(id),
  owner_company_id UUID REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  charter_type VARCHAR(50),
  charter_date DATE,
  charter_fee_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_date DATE,
  settlement_reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intercompany_charter_fees_status ON intercompany_charter_fees(status);
CREATE INDEX IF NOT EXISTS idx_intercompany_charter_fees_owner ON intercompany_charter_fees(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_charter_fees_receipt ON intercompany_charter_fees(receipt_id);

-- RLS
ALTER TABLE intercompany_charter_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intercompany charter fees"
  ON intercompany_charter_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert intercompany charter fees"
  ON intercompany_charter_fees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update intercompany charter fees"
  ON intercompany_charter_fees FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete intercompany charter fees"
  ON intercompany_charter_fees FOR DELETE
  TO authenticated
  USING (true);
