-- Petty Cash Reimbursement Batches
-- Groups multiple reimbursements into one bank transfer for efficiency

-- Batch table: groups reimbursements by company + wallet holder for one bank transfer
CREATE TABLE petty_cash_reimbursement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id),
  wallet_holder_id UUID REFERENCES auth.users(id), -- Nullable for grouped batches
  wallet_holder_name TEXT NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),

  -- Amounts
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  reimbursement_count INTEGER NOT NULL DEFAULT 0,

  -- Status: pending_payment → paid
  status TEXT NOT NULL DEFAULT 'pending_payment',

  -- Payment info (filled when batch is marked as paid)
  payment_date DATE,
  payment_reference TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add batch_id to reimbursements table to link them to a batch
ALTER TABLE petty_cash_reimbursements
ADD COLUMN batch_id UUID REFERENCES petty_cash_reimbursement_batches(id);

-- Index for finding reimbursements in a batch
CREATE INDEX idx_reimbursements_batch_id ON petty_cash_reimbursements(batch_id);

-- Index for finding batches by status
CREATE INDEX idx_batches_status ON petty_cash_reimbursement_batches(status);

-- Index for finding batches by company
CREATE INDEX idx_batches_company ON petty_cash_reimbursement_batches(company_id);

-- RLS policies for batches
ALTER TABLE petty_cash_reimbursement_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read batches"
  ON petty_cash_reimbursement_batches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert batches"
  ON petty_cash_reimbursement_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update batches"
  ON petty_cash_reimbursement_batches
  FOR UPDATE
  TO authenticated
  USING (true);

-- Comment on table and columns
COMMENT ON TABLE petty_cash_reimbursement_batches IS 'Groups multiple petty cash reimbursements for a single bank transfer';
COMMENT ON COLUMN petty_cash_reimbursement_batches.batch_number IS 'Format: PC-BATCH-YYMMXXXX';
COMMENT ON COLUMN petty_cash_reimbursement_batches.status IS 'Status: pending_payment (created, awaiting bank transfer) or paid (transfer completed)';
COMMENT ON COLUMN petty_cash_reimbursements.batch_id IS 'Links reimbursement to a batch for grouped bank transfer';

-- Also add a comment to document expense status values (including rejected)
COMMENT ON COLUMN petty_cash_expenses.status IS 'Status: draft (not submitted), submitted (awaiting reimbursement), rejected (reimbursement rejected)';
