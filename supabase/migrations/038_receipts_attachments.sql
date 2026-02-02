-- Migration: Add attachments column to receipts table
-- This stores receipt document attachments (similar to petty_cash_expenses and bank_feed_lines)

-- ============================================================================
-- 1. Add attachments column to receipts table
-- ============================================================================
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN receipts.attachments IS
  'Array of attachment objects storing receipt documents. Each object contains: id, name, url, type (mime type), size, uploaded_at';
