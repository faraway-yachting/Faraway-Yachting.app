-- Migration: Add WHT columns to receipt_line_items table
-- This allows receipts to track withholding tax at the line item level,
-- consistent with invoice_line_items

-- Add WHT columns to receipt_line_items
ALTER TABLE receipt_line_items
  ADD COLUMN IF NOT EXISTS wht_rate TEXT DEFAULT '0',
  ADD COLUMN IF NOT EXISTS custom_wht_amount NUMERIC(12, 2) DEFAULT NULL;

-- Add comment explaining the wht_rate column
COMMENT ON COLUMN receipt_line_items.wht_rate IS 'WHT rate as string: "0", "1", "2", "3", "5", or "custom" for custom amount';
COMMENT ON COLUMN receipt_line_items.custom_wht_amount IS 'Custom WHT amount when wht_rate is "custom"';
