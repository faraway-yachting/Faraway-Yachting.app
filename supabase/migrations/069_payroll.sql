-- ============================================================================
-- 069: Payroll Module
-- ============================================================================

-- Payroll Runs (monthly, per company)
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_label TEXT GENERATED ALWAYS AS (
    period_year || '-' || LPAD(period_month::TEXT, 2, '0')
  ) STORED,

  -- Totals (auto-updated by trigger)
  total_gross NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_net NUMERIC(15,2) DEFAULT 0,
  total_employer_ssf NUMERIC(15,2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,

  -- Workflow: draft -> approved -> paid
  status TEXT CHECK (status IN ('draft', 'approved', 'paid')) DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  payment_date DATE,
  bank_account_id UUID REFERENCES bank_accounts(id),

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payroll_runs"
  ON payroll_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);

-- Payroll Slips (one per employee per run)
CREATE TABLE payroll_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),

  -- Earnings
  base_salary NUMERIC(15,2) DEFAULT 0,
  charter_bonus NUMERIC(15,2) DEFAULT 0,
  overtime_amount NUMERIC(15,2) DEFAULT 0,
  commission_amount NUMERIC(15,2) DEFAULT 0,
  allowances NUMERIC(15,2) DEFAULT 0,
  other_earnings NUMERIC(15,2) DEFAULT 0,
  gross_pay NUMERIC(15,2) GENERATED ALWAYS AS (
    base_salary + charter_bonus + overtime_amount + commission_amount + allowances + other_earnings
  ) STORED,

  -- Deductions
  ssf_employee NUMERIC(15,2) DEFAULT 0,
  withholding_tax NUMERIC(15,2) DEFAULT 0,
  advance_deduction NUMERIC(15,2) DEFAULT 0,
  other_deductions NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) GENERATED ALWAYS AS (
    ssf_employee + withholding_tax + advance_deduction + other_deductions
  ) STORED,

  -- Employer costs
  ssf_employer NUMERIC(15,2) DEFAULT 0,

  -- Net pay
  net_pay NUMERIC(15,2) GENERATED ALWAYS AS (
    base_salary + charter_bonus + overtime_amount + commission_amount + allowances + other_earnings
    - ssf_employee - withholding_tax - advance_deduction - other_deductions
  ) STORED,

  -- Detail breakdowns
  earnings_detail JSONB DEFAULT '[]',
  deductions_detail JSONB DEFAULT '[]',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

ALTER TABLE payroll_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payroll_slips"
  ON payroll_slips FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_payroll_slips_run ON payroll_slips(payroll_run_id);
CREATE INDEX idx_payroll_slips_employee ON payroll_slips(employee_id);

-- Auto-number for payroll runs (PR-YYMM-0001)
CREATE OR REPLACE FUNCTION generate_payroll_run_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  prefix := 'PR-' || yymm || '-';
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(run_number FROM LENGTH(prefix) + 1) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM payroll_runs
  WHERE run_number LIKE prefix || '%';
  RETURN prefix || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger: update payroll_runs totals when slips change
CREATE OR REPLACE FUNCTION update_payroll_run_totals()
RETURNS TRIGGER AS $$
DECLARE
  run_id UUID;
BEGIN
  run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
  UPDATE payroll_runs SET
    total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM payroll_slips WHERE payroll_run_id = run_id),
    total_deductions = (SELECT COALESCE(SUM(total_deductions), 0) FROM payroll_slips WHERE payroll_run_id = run_id),
    total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_slips WHERE payroll_run_id = run_id),
    total_employer_ssf = (SELECT COALESCE(SUM(ssf_employer), 0) FROM payroll_slips WHERE payroll_run_id = run_id),
    employee_count = (SELECT COUNT(*) FROM payroll_slips WHERE payroll_run_id = run_id),
    updated_at = now()
  WHERE id = run_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payroll_totals
  AFTER INSERT OR UPDATE OR DELETE ON payroll_slips
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_run_totals();
