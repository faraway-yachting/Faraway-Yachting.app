-- ============================================================================
-- WHT Certificates Table - Thai Withholding Tax (50 ทวิ) Certificates
-- ============================================================================

-- WHT Certificates
CREATE TABLE IF NOT EXISTS wht_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  certificate_number TEXT NOT NULL,

  -- Form type: PND3 for individuals, PND53 for companies
  form_type TEXT CHECK (form_type IN ('pnd3', 'pnd53')) NOT NULL,

  -- Payer (Withholding Company) - ผู้หักภาษี
  payer_name TEXT NOT NULL,
  payer_address TEXT,
  payer_tax_id TEXT NOT NULL,

  -- Payee (Supplier) - ผู้ถูกหักภาษี
  payee_vendor_id UUID REFERENCES contacts(id),
  payee_name TEXT NOT NULL,
  payee_address TEXT,
  payee_tax_id TEXT,
  payee_is_company BOOLEAN DEFAULT false,

  -- Payment details
  payment_date DATE NOT NULL,
  income_type TEXT NOT NULL, -- Thai income type code (40(1), 40(2), etc.)
  income_type_description TEXT,

  -- Amounts
  amount_paid DECIMAL(15,2) NOT NULL, -- Amount paid before WHT
  wht_rate DECIMAL(5,2) NOT NULL, -- WHT rate percentage
  wht_amount DECIMAL(15,2) NOT NULL, -- Tax withheld

  -- Tax period for filing (YYYY-MM format)
  tax_period TEXT NOT NULL,

  -- Status tracking
  status TEXT CHECK (status IN ('draft', 'issued', 'filed')) DEFAULT 'draft',
  issued_date DATE,
  filed_date DATE,
  submission_reference TEXT, -- Revenue department submission reference

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique certificate number per company
  UNIQUE(company_id, certificate_number)
);

CREATE INDEX idx_wht_certificates_company_id ON wht_certificates(company_id);
CREATE INDEX idx_wht_certificates_payee_vendor_id ON wht_certificates(payee_vendor_id);
CREATE INDEX idx_wht_certificates_tax_period ON wht_certificates(tax_period);
CREATE INDEX idx_wht_certificates_status ON wht_certificates(status);
CREATE INDEX idx_wht_certificates_payment_date ON wht_certificates(payment_date);

-- RLS for WHT certificates
ALTER TABLE wht_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view WHT certificates from their company"
  ON wht_certificates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Accountants can manage WHT certificates"
  ON wht_certificates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- Junction table for linking expenses to WHT certificates
-- (One expense can generate multiple WHT certificates, one certificate can be linked to multiple expenses)
CREATE TABLE IF NOT EXISTS expense_wht_certificates (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  wht_certificate_id UUID NOT NULL REFERENCES wht_certificates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (expense_id, wht_certificate_id)
);

CREATE INDEX idx_expense_wht_certificates_expense_id ON expense_wht_certificates(expense_id);
CREATE INDEX idx_expense_wht_certificates_certificate_id ON expense_wht_certificates(wht_certificate_id);

-- RLS for junction table
ALTER TABLE expense_wht_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view expense WHT links"
  ON expense_wht_certificates FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Accountants can manage expense WHT links"
  ON expense_wht_certificates FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  );

-- Add updated_at trigger for wht_certificates
CREATE TRIGGER update_wht_certificates_updated_at
  BEFORE UPDATE ON wht_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Done!
-- ============================================================================
