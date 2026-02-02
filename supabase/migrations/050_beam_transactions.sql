-- Beam Transactions
-- Stores imported Beam payment gateway transactions for reconciliation

CREATE TABLE IF NOT EXISTS beam_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_account_id UUID NOT NULL REFERENCES beam_merchant_accounts(id) ON DELETE CASCADE,

  -- Beam identifiers
  charge_id TEXT NOT NULL UNIQUE,
  source_id TEXT,
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  settlement_date DATE,
  settlement_status TEXT,
  invoice_no TEXT,
  invoice_date DATE,

  -- Amounts
  currency TEXT NOT NULL DEFAULT 'THB',
  gross_amount DECIMAL(12,2) NOT NULL,
  fee_rate DECIMAL(6,4),
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,

  -- Payment info
  payment_method TEXT,
  card_brand TEXT,
  card_country TEXT,
  card_holder_name TEXT,

  -- Matching
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence DECIMAL(3,2),

  -- Beam CSV data
  payment_link_description TEXT,
  reference_id TEXT,

  -- Import tracking
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_beam_transactions_merchant ON beam_transactions(merchant_account_id);
CREATE INDEX idx_beam_transactions_booking ON beam_transactions(booking_id);
CREATE INDEX idx_beam_transactions_receipt ON beam_transactions(receipt_id);
CREATE INDEX idx_beam_transactions_match_status ON beam_transactions(match_status);
CREATE INDEX idx_beam_transactions_date ON beam_transactions(transaction_date);
CREATE INDEX idx_beam_transactions_settlement ON beam_transactions(settlement_date);

-- Updated_at trigger
CREATE TRIGGER set_beam_transactions_updated_at
  BEFORE UPDATE ON beam_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE beam_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beam_transactions_select" ON beam_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "beam_transactions_insert" ON beam_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "beam_transactions_update" ON beam_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "beam_transactions_delete" ON beam_transactions FOR DELETE TO authenticated USING (true);
