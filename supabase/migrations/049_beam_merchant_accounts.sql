-- Beam Merchant Accounts
-- Tracks Beam payment gateway merchant accounts for each company

CREATE TABLE IF NOT EXISTS beam_merchant_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  settlement_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_beam_merchant_accounts_company ON beam_merchant_accounts(company_id);
CREATE UNIQUE INDEX idx_beam_merchant_accounts_merchant_id ON beam_merchant_accounts(merchant_id);

-- Updated_at trigger
CREATE TRIGGER set_beam_merchant_accounts_updated_at
  BEFORE UPDATE ON beam_merchant_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE beam_merchant_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beam_merchant_accounts_select" ON beam_merchant_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "beam_merchant_accounts_insert" ON beam_merchant_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "beam_merchant_accounts_update" ON beam_merchant_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "beam_merchant_accounts_delete" ON beam_merchant_accounts FOR DELETE TO authenticated USING (true);
