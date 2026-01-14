-- Migration: Bank Feed Lines Table
-- Description: Creates tables for storing imported bank feed transactions for reconciliation

-- Bank Feed Lines table
CREATE TABLE bank_feed_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'THB',

  -- From bank feed
  transaction_date DATE NOT NULL,
  value_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL, -- Positive = credit, Negative = debit
  running_balance DECIMAL(15,2),

  -- Reconciliation
  status VARCHAR(50) NOT NULL DEFAULT 'unmatched',
  matched_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  confidence_score INTEGER,

  -- Metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by VARCHAR(255),
  import_source VARCHAR(50) NOT NULL DEFAULT 'csv', -- 'api', 'csv', 'manual'
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Audit trail
  matched_by VARCHAR(255),
  matched_at TIMESTAMPTZ,
  ignored_by VARCHAR(255),
  ignored_at TIMESTAMPTZ,
  ignored_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint for status values
  CONSTRAINT valid_status CHECK (status IN ('missing_record', 'matched', 'partially_matched', 'needs_review', 'ignored', 'unmatched'))
);

-- Bank Matches table (links bank feed lines to system records)
CREATE TABLE bank_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_feed_line_id UUID NOT NULL REFERENCES bank_feed_lines(id) ON DELETE CASCADE,

  -- What it's matched to
  system_record_type VARCHAR(50) NOT NULL, -- 'receipt', 'expense', 'transfer', etc.
  system_record_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Match details
  matched_amount DECIMAL(15,2) NOT NULL,
  amount_difference DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Match metadata
  matched_by VARCHAR(255) NOT NULL,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  match_score INTEGER NOT NULL DEFAULT 100,
  match_method VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'rule', 'suggested'
  rule_id VARCHAR(255),

  -- For adjustments
  adjustment_required BOOLEAN NOT NULL DEFAULT false,
  adjustment_reason TEXT,
  adjustment_journal_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_bank_feed_lines_bank_account ON bank_feed_lines(bank_account_id);
CREATE INDEX idx_bank_feed_lines_company ON bank_feed_lines(company_id);
CREATE INDEX idx_bank_feed_lines_project ON bank_feed_lines(project_id);
CREATE INDEX idx_bank_feed_lines_transaction_date ON bank_feed_lines(transaction_date);
CREATE INDEX idx_bank_feed_lines_status ON bank_feed_lines(status);
CREATE INDEX idx_bank_feed_lines_import_source ON bank_feed_lines(import_source);

CREATE INDEX idx_bank_matches_bank_feed_line ON bank_matches(bank_feed_line_id);
CREATE INDEX idx_bank_matches_system_record ON bank_matches(system_record_type, system_record_id);

-- Unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX idx_bank_feed_lines_unique ON bank_feed_lines(
  bank_account_id,
  transaction_date,
  amount,
  md5(description)
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_feed_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_feed_lines_updated_at
  BEFORE UPDATE ON bank_feed_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_feed_lines_updated_at();

CREATE TRIGGER bank_matches_updated_at
  BEFORE UPDATE ON bank_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_feed_lines_updated_at();

-- RLS Policies
ALTER TABLE bank_feed_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_matches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage bank feed lines
CREATE POLICY "Authenticated users can view bank feed lines"
  ON bank_feed_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bank feed lines"
  ON bank_feed_lines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bank feed lines"
  ON bank_feed_lines FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bank feed lines"
  ON bank_feed_lines FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to manage bank matches
CREATE POLICY "Authenticated users can view bank matches"
  ON bank_matches FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bank matches"
  ON bank_matches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bank matches"
  ON bank_matches FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bank matches"
  ON bank_matches FOR DELETE
  USING (auth.uid() IS NOT NULL);
