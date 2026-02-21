-- Migration 139: Fix corrupted petty_cash_wallets.balance column
--
-- The `balance` column was meant to be the static initial balance, used by the
-- get_wallets_with_balances() RPC as the base for: calculated_balance = w.balance + topups + reimbursements - submitted_expenses
--
-- However, the holder expense page called updateWallet() to decrement w.balance
-- on every expense creation (status='draft'). And StockPurchaseForm also called
-- updateWallet() for stock purchases. This corrupted w.balance, causing
-- double-deductions when the RPC also subtracts submitted expenses.
--
-- Fix:
-- 1. Restore w.balance by reversing all updateWallet deductions
-- 2. Set beginning_balance for audit trail
-- 3. Convert all 'draft' expenses to 'submitted' so the RPC counts them correctly

-- Step 1: Restore balance to the correct initial value
-- updateWallet was called for: (a) every 'draft' expense, (b) every PC-INV stock purchase expense
UPDATE petty_cash_wallets w
SET
  balance = w.balance
    + COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e
                WHERE e.wallet_id = w.id AND e.status = 'draft'), 0)
    + COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e
                WHERE e.wallet_id = w.id AND e.expense_number LIKE 'PC-INV%'), 0),
  beginning_balance = w.balance
    + COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e
                WHERE e.wallet_id = w.id AND e.status = 'draft'), 0)
    + COALESCE((SELECT SUM(e.amount) FROM petty_cash_expenses e
                WHERE e.wallet_id = w.id AND e.expense_number LIKE 'PC-INV%'), 0),
  updated_at = NOW();

-- Step 2: Convert draft expenses to submitted so the RPC counts them
UPDATE petty_cash_expenses
SET status = 'submitted'
WHERE status = 'draft';
