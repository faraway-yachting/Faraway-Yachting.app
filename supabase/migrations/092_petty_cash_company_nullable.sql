-- Make company_id nullable in petty cash tables
-- This allows wallet holders to submit expenses without selecting a company
-- The accountant will assign the company when reviewing/approving the claim

-- Make company_id nullable in petty_cash_expenses
ALTER TABLE petty_cash_expenses
  ALTER COLUMN company_id DROP NOT NULL;

-- Make company_id nullable in petty_cash_reimbursements
ALTER TABLE petty_cash_reimbursements
  ALTER COLUMN company_id DROP NOT NULL;

-- Add index for efficient duplicate checking (if not exists)
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_duplicate_check
  ON petty_cash_expenses(wallet_id, amount, expense_date, created_at);
