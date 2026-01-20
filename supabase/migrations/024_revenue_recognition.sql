-- Revenue Recognition System
-- Migration: 024_revenue_recognition.sql
--
-- Implements proper accrual-basis revenue recognition:
-- - Revenue is only recognized in P&L when charter service is completed
-- - Payments received before charter completion go to "Charter Deposits Received" (2300)
-- - Supports automatic recognition (by date) and manual recognition (user trigger)

-- Create recognition status enum
CREATE TYPE revenue_recognition_status AS ENUM (
  'pending',           -- Waiting for charter to complete
  'recognized',        -- Revenue recognized in P&L
  'needs_review',      -- Missing charter dates, flagged for review
  'manual_recognized'  -- Manually recognized despite no charter dates
);

-- Create recognition trigger type enum
CREATE TYPE revenue_recognition_trigger AS ENUM (
  'automatic',   -- charterDateTo passed (scheduled/cron)
  'manual',      -- User marked booking as completed
  'immediate'    -- No charter dates, user approved immediate recognition
);

-- Main revenue_recognition table
CREATE TABLE revenue_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source documents
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  receipt_line_item_id UUID, -- For tracking specific line items
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  booking_id UUID, -- Reference to booking (if bookings table exists)

  -- Charter dates (copied from receipt/invoice for easier querying)
  charter_date_from DATE,
  charter_date_to DATE,

  -- Recognition tracking
  recognition_status revenue_recognition_status NOT NULL DEFAULT 'pending',

  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  fx_rate DECIMAL(15,6) DEFAULT 1,
  thb_amount DECIMAL(15,2) NOT NULL,

  -- Account codes for journal entries
  deferred_revenue_account TEXT NOT NULL DEFAULT '2300', -- Charter Deposits Received
  revenue_account TEXT NOT NULL, -- 4010-4070 based on charter type

  -- Charter type (for revenue account mapping)
  charter_type TEXT,

  -- Recognition details
  recognition_date DATE,                    -- When revenue was actually recognized
  recognition_trigger revenue_recognition_trigger,
  recognized_by UUID REFERENCES auth.users(id),

  -- Journal entry references
  -- Initial entry when payment received: Dr Bank, Cr Deferred Revenue
  deferred_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  -- Recognition entry when service completed: Dr Deferred Revenue, Cr Revenue
  recognition_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  -- Description for journal entries
  description TEXT,
  client_name TEXT,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_revenue_recognition_status ON revenue_recognition(recognition_status);
CREATE INDEX idx_revenue_recognition_company ON revenue_recognition(company_id);
CREATE INDEX idx_revenue_recognition_project ON revenue_recognition(project_id);
CREATE INDEX idx_revenue_recognition_receipt ON revenue_recognition(receipt_id);
CREATE INDEX idx_revenue_recognition_booking ON revenue_recognition(booking_id);
CREATE INDEX idx_revenue_recognition_charter_date_to ON revenue_recognition(charter_date_to);
CREATE INDEX idx_revenue_recognition_pending_date ON revenue_recognition(charter_date_to)
  WHERE recognition_status = 'pending';

-- Updated_at trigger
CREATE TRIGGER set_revenue_recognition_updated_at
  BEFORE UPDATE ON revenue_recognition
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE revenue_recognition ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "revenue_recognition_select" ON revenue_recognition
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "revenue_recognition_insert" ON revenue_recognition
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "revenue_recognition_update" ON revenue_recognition
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "revenue_recognition_delete" ON revenue_recognition
  FOR DELETE TO authenticated
  USING (true);

-- Add revenue_recognition tracking to receipts table
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS revenue_recognition_status TEXT DEFAULT 'pending';

-- Add check constraint (with named constraint for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_revenue_recognition_status_check'
  ) THEN
    ALTER TABLE receipts
      ADD CONSTRAINT receipts_revenue_recognition_status_check
      CHECK (revenue_recognition_status IN ('pending', 'partial', 'recognized', 'needs_review'));
  END IF;
END $$;

-- Add recognition tracking to receipt_line_items table
ALTER TABLE receipt_line_items
  ADD COLUMN IF NOT EXISTS revenue_recognized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recognition_date DATE,
  ADD COLUMN IF NOT EXISTS revenue_recognition_id UUID;

-- Add FK constraint if not exists (for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_line_items_revenue_recognition_id_fkey'
  ) THEN
    ALTER TABLE receipt_line_items
      ADD CONSTRAINT receipt_line_items_revenue_recognition_id_fkey
      FOREIGN KEY (revenue_recognition_id) REFERENCES revenue_recognition(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for unrecognized line items
CREATE INDEX IF NOT EXISTS idx_receipt_line_items_unrecognized
  ON receipt_line_items(revenue_recognized)
  WHERE revenue_recognized = false;

-- View for pending revenue recognition (useful for dashboard)
CREATE OR REPLACE VIEW pending_revenue_recognition AS
SELECT
  rr.id,
  rr.company_id,
  rr.project_id,
  p.name as project_name,
  rr.receipt_id,
  r.receipt_number,
  rr.booking_id,
  rr.charter_date_from,
  rr.charter_date_to,
  rr.amount,
  rr.currency,
  rr.thb_amount,
  rr.revenue_account,
  rr.charter_type,
  rr.client_name,
  rr.description,
  rr.recognition_status,
  rr.created_at,
  CASE
    WHEN rr.charter_date_to IS NULL THEN 'No charter date'
    WHEN rr.charter_date_to <= CURRENT_DATE THEN 'Ready to recognize'
    ELSE 'Awaiting charter completion'
  END as status_label,
  CASE
    WHEN rr.charter_date_to IS NOT NULL THEN rr.charter_date_to - CURRENT_DATE
    ELSE NULL
  END as days_until_recognition
FROM revenue_recognition rr
LEFT JOIN projects p ON p.id = rr.project_id
LEFT JOIN receipts r ON r.id = rr.receipt_id
WHERE rr.recognition_status IN ('pending', 'needs_review')
ORDER BY
  CASE WHEN rr.charter_date_to IS NULL THEN 1 ELSE 0 END,
  rr.charter_date_to ASC;

-- Function to get total deferred revenue by company
CREATE OR REPLACE FUNCTION get_deferred_revenue_balance(p_company_id UUID)
RETURNS TABLE (
  total_thb DECIMAL(15,2),
  pending_count BIGINT,
  needs_review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN recognition_status = 'pending' THEN thb_amount ELSE 0 END), 0) as total_thb,
    COUNT(*) FILTER (WHERE recognition_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE recognition_status = 'needs_review') as needs_review_count
  FROM revenue_recognition
  WHERE company_id = p_company_id
    AND recognition_status IN ('pending', 'needs_review');
END;
$$ LANGUAGE plpgsql;
