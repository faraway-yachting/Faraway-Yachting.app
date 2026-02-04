-- Migration 087: Fix Function Search Path Security Warnings
-- Functions without SET search_path are vulnerable to search path injection attacks.
-- This migration adds SET search_path = public to all remaining functions.

-- ============================================================================
-- PART 1: Fix audit_trigger_func
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_by, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', NEW.created_by, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', COALESCE(NEW.created_by, OLD.created_by), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, changed_by, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', OLD.created_by, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================================
-- PART 2: Fix check_journal_balance
-- ============================================================================

CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_debit DECIMAL(12,2);
  total_credit DECIMAL(12,2);
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF ABS(total_debit - total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced: debits (%) != credits (%)',
      total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: Fix generate_leave_request_number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_leave_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yymm TEXT;
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  prefix := 'LV-' || yymm || '-';
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(request_number FROM LENGTH(prefix) + 1) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM leave_requests
  WHERE request_number LIKE prefix || '%';
  RETURN prefix || LPAD(seq_num::TEXT, 4, '0');
END;
$$;

-- ============================================================================
-- PART 4: Fix update_leave_balance_on_status_change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_leave_balance_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- On approval: increment used_days
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO leave_balances (employee_id, leave_type_id, year, entitlement_days, used_days)
    VALUES (NEW.employee_id, NEW.leave_type_id, EXTRACT(YEAR FROM NEW.start_date)::INTEGER, 0, NEW.total_days)
    ON CONFLICT (employee_id, leave_type_id, year)
    DO UPDATE SET used_days = leave_balances.used_days + NEW.total_days,
                  updated_at = now();
  END IF;
  -- On un-approval (approved -> cancelled/rejected): decrement
  IF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
    UPDATE leave_balances
    SET used_days = GREATEST(used_days - OLD.total_days, 0), updated_at = now()
    WHERE employee_id = OLD.employee_id
      AND leave_type_id = OLD.leave_type_id
      AND year = EXTRACT(YEAR FROM OLD.start_date)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 5: Fix generate_payroll_run_number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payroll_run_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- ============================================================================
-- PART 6: Fix update_payroll_run_totals
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payroll_run_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- ============================================================================
-- Done! All functions now have SET search_path = public for security.
-- ============================================================================
