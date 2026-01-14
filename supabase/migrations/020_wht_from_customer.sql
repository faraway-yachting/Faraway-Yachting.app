-- Migration: Track WHT from customers (when customers withhold tax from payments to us)
-- This table tracks WHT certificates we need to receive from customers

-- Create WHT from customer tracking table
CREATE TABLE IF NOT EXISTS wht_from_customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to source receipt
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  receipt_line_item_id UUID REFERENCES receipt_line_items(id) ON DELETE SET NULL,

  -- Company info (our company receiving the payment)
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Customer info (who withholds the tax)
  customer_id UUID REFERENCES contacts(id),
  customer_name TEXT NOT NULL,
  customer_tax_id TEXT,

  -- WHT details (derived from receipt line items)
  receipt_date DATE NOT NULL,
  base_amount NUMERIC(15, 2) NOT NULL,  -- Amount before WHT
  wht_rate NUMERIC(5, 2) NOT NULL,       -- WHT percentage
  wht_amount NUMERIC(15, 2) NOT NULL,    -- Actual WHT amount
  currency TEXT NOT NULL DEFAULT 'THB',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'reconciled')),

  -- WHT certificate from customer (when received)
  certificate_number TEXT,              -- Certificate number from customer
  certificate_date DATE,                -- Date on the certificate
  certificate_file_url TEXT,            -- Uploaded file URL
  certificate_file_name TEXT,           -- Original file name

  -- Period for reporting
  period TEXT NOT NULL,                 -- YYYY-MM format

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,              -- When certificate was marked as received
  received_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_receipt ON wht_from_customer(receipt_id);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_company ON wht_from_customer(company_id);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_customer ON wht_from_customer(customer_id);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_status ON wht_from_customer(status);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_period ON wht_from_customer(period);
CREATE INDEX IF NOT EXISTS idx_wht_from_customer_receipt_date ON wht_from_customer(receipt_date);

-- Enable RLS
ALTER TABLE wht_from_customer ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view WHT from customer for their companies"
  ON wht_from_customer FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.company_id = wht_from_customer.company_id OR up.role IN ('admin', 'manager'))
    )
  );

CREATE POLICY "Users can insert WHT from customer for their companies"
  ON wht_from_customer FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.company_id = wht_from_customer.company_id OR up.role IN ('admin', 'manager', 'accountant'))
    )
  );

CREATE POLICY "Users can update WHT from customer for their companies"
  ON wht_from_customer FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.company_id = wht_from_customer.company_id OR up.role IN ('admin', 'manager', 'accountant'))
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_wht_from_customer_updated_at
  BEFORE UPDATE ON wht_from_customer
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for WHT certificates (if not exists)
-- Note: Run this in Supabase dashboard or via storage API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wht-certificates', 'wht-certificates', false);

-- Comment
COMMENT ON TABLE wht_from_customer IS 'Tracks WHT certificates we need to receive from customers when they withhold tax from their payments to us';
