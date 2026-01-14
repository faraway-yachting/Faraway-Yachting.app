-- Migration: Add additional FX rate tracking fields for BOT integration
-- This adds fields to track the base/target currency, actual rate date, and source

-- Add additional fx rate tracking fields to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS fx_base_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_target_currency TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS fx_rate_date DATE;

-- Add additional fx rate tracking fields to receipts
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS fx_base_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_target_currency TEXT DEFAULT 'THB',
  ADD COLUMN IF NOT EXISTS fx_rate_date DATE;

-- Update existing records: populate fx_base_currency from currency column
UPDATE expenses
SET fx_base_currency = currency
WHERE fx_rate IS NOT NULL AND fx_base_currency IS NULL;

UPDATE receipts
SET fx_base_currency = currency
WHERE fx_rate IS NOT NULL AND fx_base_currency IS NULL;

-- Note: fx_rate_source values will migrate from 'api' to 'bot' or 'fallback'
-- For existing records, 'api' is acceptable as legacy value
