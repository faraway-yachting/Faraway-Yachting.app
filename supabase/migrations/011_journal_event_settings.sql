-- Migration: Journal Event Settings
-- Description: Per-company configuration for journal event processing
-- Created: 2026-01-10

-- ============================================================================
-- Create journal_event_settings table
-- ============================================================================

CREATE TABLE journal_event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,

  -- Configuration
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_post BOOLEAN NOT NULL DEFAULT false,
  default_debit_account TEXT,
  default_credit_account TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one setting per event type per company
  UNIQUE(company_id, event_type)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_journal_event_settings_company ON journal_event_settings(company_id);
CREATE INDEX idx_journal_event_settings_event_type ON journal_event_settings(event_type);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE journal_event_settings ENABLE ROW LEVEL SECURITY;

-- Users can view settings for companies they have access to
CREATE POLICY "Users can view settings for their companies"
  ON journal_event_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
  ));

-- Users can insert settings for companies they have access to
CREATE POLICY "Users can insert settings for their companies"
  ON journal_event_settings FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
  ));

-- Users can update settings for companies they have access to
CREATE POLICY "Users can update settings for their companies"
  ON journal_event_settings FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
  ));

-- Users can delete settings for companies they have access to
CREATE POLICY "Users can delete settings for their companies"
  ON journal_event_settings FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
  ));

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE TRIGGER update_journal_event_settings_updated_at
  BEFORE UPDATE ON journal_event_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
