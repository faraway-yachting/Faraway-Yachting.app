-- Migration: Add accounting VAT columns to petty_cash_expenses
-- These columns store the VAT settings assigned by the accountant during approval

-- Add accounting VAT type column
ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS accounting_vat_type TEXT CHECK (accounting_vat_type IN ('include', 'exclude', 'no_vat'));

-- Add accounting VAT rate column
ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS accounting_vat_rate DECIMAL(5,2) DEFAULT 0;

-- Add accounting completed by/at columns
ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS accounting_completed_by UUID REFERENCES auth.users(id);

ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS accounting_completed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN petty_cash_expenses.accounting_vat_type IS
  'VAT type (include/exclude/no_vat) assigned by accountant during expense approval';

COMMENT ON COLUMN petty_cash_expenses.accounting_vat_rate IS
  'VAT rate (e.g., 7.0) assigned by accountant during expense approval';

COMMENT ON COLUMN petty_cash_expenses.accounting_completed_by IS
  'User ID of accountant who completed the accounting details';

COMMENT ON COLUMN petty_cash_expenses.accounting_completed_at IS
  'Timestamp when accounting details were completed';
