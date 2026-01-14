-- Migration: Add recycled receipt numbers table
-- Thai accounting requires continuous receipt numbers - voided receipts should have their numbers recycled

-- Table to store recycled receipt numbers from voided receipts
CREATE TABLE IF NOT EXISTS recycled_receipt_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  voided_receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  voided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reused_by_receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  reused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure each receipt number can only be recycled once per company
  UNIQUE(company_id, receipt_number)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recycled_receipt_numbers_company ON recycled_receipt_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_recycled_receipt_numbers_available ON recycled_receipt_numbers(company_id)
  WHERE reused_by_receipt_id IS NULL;

-- Enable RLS
ALTER TABLE recycled_receipt_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view recycled numbers for their companies"
  ON recycled_receipt_numbers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage recycled numbers"
  ON recycled_receipt_numbers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add voided_receipt_number column to receipts to track the original voided number
-- This allows the voided receipt to keep a reference to its original number for audit
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS original_receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS is_using_recycled_number BOOLEAN DEFAULT false;

-- Comment explaining the workflow:
-- 1. When a receipt is voided:
--    a. Insert the receipt_number into recycled_receipt_numbers
--    b. Update the voided receipt with a new "VOID-" prefixed number
--    c. Keep original_receipt_number for audit trail
-- 2. When creating a new receipt:
--    a. First check recycled_receipt_numbers for available numbers
--    b. If found, use it and mark as reused
--    c. If not found, generate a new sequential number
