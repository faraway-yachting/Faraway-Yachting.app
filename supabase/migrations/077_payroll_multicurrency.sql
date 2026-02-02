-- Multi-currency payroll support
-- 1. Make company_id optional on payroll_runs (one run includes all employees)
ALTER TABLE payroll_runs ALTER COLUMN company_id DROP NOT NULL;

-- 2. Change unique constraint from (company_id, year, month) to (year, month)
ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_company_id_period_year_period_month_key;
ALTER TABLE payroll_runs ADD CONSTRAINT payroll_runs_period_unique UNIQUE(period_year, period_month);

-- 3. Add multi-currency fields to payroll_slips
ALTER TABLE payroll_slips ADD COLUMN employee_currency TEXT DEFAULT 'THB';
ALTER TABLE payroll_slips ADD COLUMN fx_rate NUMERIC(15,6) DEFAULT 1;
ALTER TABLE payroll_slips ADD COLUMN fx_rate_source TEXT DEFAULT 'bot';
ALTER TABLE payroll_slips ADD COLUMN base_salary_original NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_slips ADD COLUMN away_charter_original NUMERIC(15,2) DEFAULT 0;
ALTER TABLE payroll_slips ADD COLUMN away_charter_currency TEXT DEFAULT 'THB';
