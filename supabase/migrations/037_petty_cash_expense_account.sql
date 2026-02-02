-- Migration: Add expense_account_code column to petty_cash_expenses
-- This stores the GL account code selected by manager/accountant for the expense

-- ============================================================================
-- 1. Add expense_account_code column to petty_cash_expenses table
-- ============================================================================
ALTER TABLE petty_cash_expenses
ADD COLUMN IF NOT EXISTS expense_account_code TEXT;

-- Add index for faster lookups by account code
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_expense_account_code
  ON petty_cash_expenses(expense_account_code)
  WHERE expense_account_code IS NOT NULL;

-- ============================================================================
-- 2. Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN petty_cash_expenses.expense_account_code IS
  'GL account code from chart_of_accounts selected during expense review. Used for P&L categorization and journal entry generation.';
