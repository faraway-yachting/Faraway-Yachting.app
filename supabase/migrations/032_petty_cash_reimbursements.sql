-- Migration: Create petty_cash_reimbursements table
-- This table tracks reimbursement requests for petty cash expenses
-- and stores bank account assignment for bank reconciliation.

-- ============================================================================
-- 1. Create petty_cash_reimbursements table
-- ============================================================================
CREATE TABLE IF NOT EXISTS petty_cash_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_number TEXT NOT NULL,
  expense_id UUID NOT NULL REFERENCES petty_cash_expenses(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES petty_cash_wallets(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Amount details
  amount DECIMAL(15,2) NOT NULL,
  adjustment_amount DECIMAL(15,2) DEFAULT 0,
  adjustment_reason TEXT,
  final_amount DECIMAL(15,2) NOT NULL,

  -- Payment details (filled by accountant when approving)
  status TEXT CHECK (status IN ('pending', 'approved', 'paid', 'rejected')) DEFAULT 'pending',
  bank_account_id UUID REFERENCES bank_accounts(id),
  payment_date DATE,
  payment_reference TEXT,

  -- Approval tracking
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- For bank reconciliation - stores which bank feed line matched this reimbursement
  bank_feed_line_id UUID,
  reconciled_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(expense_id) -- One reimbursement per expense
);

CREATE INDEX idx_petty_cash_reimbursements_expense_id ON petty_cash_reimbursements(expense_id);
CREATE INDEX idx_petty_cash_reimbursements_wallet_id ON petty_cash_reimbursements(wallet_id);
CREATE INDEX idx_petty_cash_reimbursements_company_id ON petty_cash_reimbursements(company_id);
CREATE INDEX idx_petty_cash_reimbursements_status ON petty_cash_reimbursements(status);
CREATE INDEX idx_petty_cash_reimbursements_bank_account_id ON petty_cash_reimbursements(bank_account_id);

-- RLS Policies
ALTER TABLE petty_cash_reimbursements ENABLE ROW LEVEL SECURITY;

-- Users can view reimbursements for their own wallet or company
CREATE POLICY "Users view own or company reimbursements"
  ON petty_cash_reimbursements FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid()) OR
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- Users can create reimbursements for their own wallet expenses
CREATE POLICY "Users can create reimbursements for own wallet"
  ON petty_cash_reimbursements FOR INSERT
  WITH CHECK (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid())
  );

-- Managers/Accountants can manage reimbursements
CREATE POLICY "Managers can manage reimbursements"
  ON petty_cash_reimbursements FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- ============================================================================
-- 2. Add petty_cash_expense_id column to expenses table
-- This links approved petty cash expenses to main expenses for P&L reporting
-- ============================================================================
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS petty_cash_expense_id UUID REFERENCES petty_cash_expenses(id);

CREATE INDEX IF NOT EXISTS idx_expenses_petty_cash_expense_id
ON expenses(petty_cash_expense_id) WHERE petty_cash_expense_id IS NOT NULL;

-- ============================================================================
-- 3. Add attachments column to petty_cash_expenses (for receipt photos)
-- ============================================================================
ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- ============================================================================
-- 4. Function to generate reimbursement number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_reimbursement_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  prefix TEXT;
  seq_num INTEGER;
  result TEXT;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  prefix := 'PC-RMB-' || yymm;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reimbursement_number FROM LENGTH(prefix) + 1) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM petty_cash_reimbursements
  WHERE reimbursement_number LIKE prefix || '%';

  result := prefix || LPAD(seq_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Add trigger to update wallet balance when reimbursement is paid
-- ============================================================================
CREATE OR REPLACE FUNCTION update_wallet_balance_on_reimbursement()
RETURNS TRIGGER AS $$
BEGIN
  -- When reimbursement status changes to 'paid', add amount back to wallet
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE petty_cash_wallets
    SET balance = balance + NEW.final_amount,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;

  -- If reimbursement is un-paid (status changed from paid to something else)
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    UPDATE petty_cash_wallets
    SET balance = balance - OLD.final_amount,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_on_reimbursement
  AFTER UPDATE ON petty_cash_reimbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_on_reimbursement();

-- ============================================================================
-- 6. Add trigger to deduct from wallet when expense is created
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_wallet_balance_on_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct expense amount from wallet balance
  UPDATE petty_cash_wallets
  SET balance = balance - NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.wallet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deduct_wallet_on_expense'
  ) THEN
    CREATE TRIGGER trg_deduct_wallet_on_expense
      AFTER INSERT ON petty_cash_expenses
      FOR EACH ROW
      EXECUTE FUNCTION deduct_wallet_balance_on_expense();
  END IF;
END
$$;
