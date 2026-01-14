-- Migration: Make invoice_id nullable in receipts table
-- Receipts should be allowed to be created independently, not just from invoices

-- Check if invoice_id column exists, if not add it as nullable
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'receipts' AND column_name = 'invoice_id'
    ) THEN
        -- Add column if it doesn't exist
        ALTER TABLE receipts ADD COLUMN invoice_id UUID REFERENCES invoices(id);
    ELSE
        -- If column exists, make it nullable (drop NOT NULL if present)
        ALTER TABLE receipts ALTER COLUMN invoice_id DROP NOT NULL;
    END IF;
END $$;

-- Create index for invoice_id lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
