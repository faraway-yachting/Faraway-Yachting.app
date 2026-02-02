-- Add thai_registered_salary to payroll_slips for payment split calculation
ALTER TABLE payroll_slips ADD COLUMN thai_registered_salary NUMERIC(15,2) DEFAULT 0;
