-- ============================================================================
-- 073: Multi-company payroll split fields
-- ============================================================================

-- Employee fields for Thai company registration & Away Charter
ALTER TABLE employees ADD COLUMN thai_registered_salary NUMERIC(15,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN away_charter_description TEXT DEFAULT 'Guest service';

-- Payroll slip split tracking
ALTER TABLE payroll_slips ADD COLUMN thai_company_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_slips ADD COLUMN away_charter_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_slips ADD COLUMN thai_company_id UUID REFERENCES companies(id);
