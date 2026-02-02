-- Recurring journal entry templates

CREATE TABLE recurring_journal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  next_run_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinite
  is_active BOOLEAN DEFAULT true,
  auto_post BOOLEAN DEFAULT false,
  template_lines JSONB NOT NULL, -- [{account_code, entry_type, amount, description}]
  last_run_date DATE,
  run_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recurring_templates_company ON recurring_journal_templates(company_id);
CREATE INDEX idx_recurring_templates_next_run ON recurring_journal_templates(next_run_date) WHERE is_active = true;

ALTER TABLE recurring_journal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage recurring templates"
  ON recurring_journal_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_recurring_templates_updated_at
  BEFORE UPDATE ON recurring_journal_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
