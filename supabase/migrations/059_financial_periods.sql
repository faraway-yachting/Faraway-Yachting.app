-- Financial Period Locking
-- Prevents posting journal entries to closed periods

CREATE TABLE financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  period TEXT NOT NULL, -- 'YYYY-MM' format
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period)
);

CREATE INDEX idx_financial_periods_company ON financial_periods(company_id);
CREATE INDEX idx_financial_periods_status ON financial_periods(status);

-- RLS
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view financial periods"
  ON financial_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage financial periods"
  ON financial_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_financial_periods_updated_at
  BEFORE UPDATE ON financial_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
