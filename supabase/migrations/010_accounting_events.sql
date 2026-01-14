-- Migration: Add accounting_events table for event-driven journal entry system
-- This enables automatic journal generation from business events

-- ============================================================================
-- Core Events Table
-- ============================================================================

CREATE TABLE accounting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),

  -- Source document reference (optional - some events are standalone)
  source_document_type TEXT,
  source_document_id UUID,

  -- Multi-company support: which companies are affected by this event
  affected_companies UUID[] NOT NULL,

  -- Event-specific data (varies by event type)
  event_data JSONB NOT NULL DEFAULT '{}',

  -- Processing metadata
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE accounting_events IS 'Core table for event-driven journal entry generation';
COMMENT ON COLUMN accounting_events.event_type IS 'Type: EXPENSE_APPROVED, EXPENSE_PAID, RECEIPT_RECEIVED, MANAGEMENT_FEE_RECOGNIZED, etc.';
COMMENT ON COLUMN accounting_events.status IS 'pending=awaiting processing, processed=journals created, failed=error occurred, cancelled=manually cancelled';
COMMENT ON COLUMN accounting_events.affected_companies IS 'Array of company UUIDs that will have journal entries generated';
COMMENT ON COLUMN accounting_events.event_data IS 'Event-specific data in JSON format (amounts, accounts, descriptions, etc.)';

-- ============================================================================
-- Event to Journal Entry Link Table
-- ============================================================================

CREATE TABLE event_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES accounting_events(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(event_id, journal_entry_id)
);

COMMENT ON TABLE event_journal_entries IS 'Links accounting events to their generated journal entries (supports multi-company events)';

-- ============================================================================
-- Indexes
-- ============================================================================

-- Event lookups
CREATE INDEX idx_accounting_events_status ON accounting_events(status);
CREATE INDEX idx_accounting_events_type ON accounting_events(event_type);
CREATE INDEX idx_accounting_events_date ON accounting_events(event_date);
CREATE INDEX idx_accounting_events_created_at ON accounting_events(created_at);

-- Source document lookup (for finding events related to a document)
CREATE INDEX idx_accounting_events_source ON accounting_events(source_document_type, source_document_id)
WHERE source_document_type IS NOT NULL;

-- Failed events queue
CREATE INDEX idx_accounting_events_failed ON accounting_events(created_at)
WHERE status = 'failed';

-- Pending events queue
CREATE INDEX idx_accounting_events_pending ON accounting_events(created_at)
WHERE status = 'pending';

-- Event journal entry lookups
CREATE INDEX idx_event_journal_entries_event ON event_journal_entries(event_id);
CREATE INDEX idx_event_journal_entries_journal ON event_journal_entries(journal_entry_id);
CREATE INDEX idx_event_journal_entries_company ON event_journal_entries(company_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE accounting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_journal_entries ENABLE ROW LEVEL SECURITY;

-- Events are visible to users who belong to any of the affected companies
CREATE POLICY "Users can view events for their companies"
  ON accounting_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = ANY(accounting_events.affected_companies)
    )
  );

-- Only accountants and managers can create events
CREATE POLICY "Accountants can create events"
  ON accounting_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('accountant', 'manager', 'admin')
    )
  );

-- Only accountants and managers can update events (for retry/cancel)
CREATE POLICY "Accountants can update events"
  ON accounting_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('accountant', 'manager', 'admin')
    )
  );

-- Event journal entries follow same rules
CREATE POLICY "Users can view event journal links for their companies"
  ON event_journal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.company_id = event_journal_entries.company_id
    )
  );

CREATE POLICY "System can create event journal links"
  ON event_journal_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('accountant', 'manager', 'admin')
    )
  );

-- ============================================================================
-- Updated_at Trigger
-- ============================================================================

CREATE TRIGGER update_accounting_events_updated_at
  BEFORE UPDATE ON accounting_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add New Chart of Accounts Entries
-- ============================================================================

-- Insert new accounts needed for event-driven system
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, is_active)
VALUES
  ('1180', 'Intercompany Receivable', 'Asset', 'Debit', true),
  ('2300', 'Deferred Revenue', 'Liability', 'Credit', true),
  ('2700', 'Intercompany Payable', 'Liability', 'Credit', true),
  ('2750', 'Partner Payables', 'Liability', 'Credit', true),
  ('4800', 'Management Fee Income', 'Revenue', 'Credit', true),
  ('6800', 'Management Fee Expense', 'Expense', 'Debit', true)
ON CONFLICT (code) DO NOTHING;
