-- VAT filing status tracking per company per period

CREATE TABLE vat_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  period TEXT NOT NULL, -- 'YYYY-MM'
  vat_output DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_input DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid')),
  filed_date DATE,
  filed_by UUID REFERENCES auth.users(id),
  payment_date DATE,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period)
);

ALTER TABLE vat_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage vat filings"
  ON vat_filings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_vat_filings_updated_at
  BEFORE UPDATE ON vat_filings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
