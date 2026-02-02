-- Migration: Add petty cash journal event types and accounts
-- This enables automatic journal generation from petty cash transactions

-- ============================================================================
-- Note: No schema changes needed for petty cash journal events
-- The accounting_events table already supports any event_type as TEXT
-- We just need to ensure the chart of accounts has the right entries
-- ============================================================================

-- The chart of accounts already has petty cash accounts (1000, 1001, 1002)
-- and a default operating expense account (6790)
-- We'll use:
-- - 1000 (Petty Cash THB) for petty cash asset
-- - 6790 (Other Operating Expenses) as default expense account
-- - 1010 (Bank Account THB) as default bank account for topups/reimbursements

-- ============================================================================
-- Add index for petty cash related event lookups (optional optimization)
-- ============================================================================

-- Index for finding petty cash related events quickly
CREATE INDEX IF NOT EXISTS idx_accounting_events_petty_cash
  ON accounting_events(source_document_type, source_document_id)
  WHERE source_document_type IN ('petty_cash_expense', 'petty_cash_topup', 'petty_cash_reimbursement');

-- ============================================================================
-- Documentation: Petty Cash Event Types
-- ============================================================================

COMMENT ON TABLE accounting_events IS
  'Core table for event-driven journal entry generation. ' ||
  'Petty cash event types: ' ||
  'PETTYCASH_EXPENSE_CREATED - When wallet holder records expense, ' ||
  'PETTYCASH_TOPUP_COMPLETED - When topup status changes to completed, ' ||
  'PETTYCASH_REIMBURSEMENT_PAID - When reimbursement is marked as paid.';
