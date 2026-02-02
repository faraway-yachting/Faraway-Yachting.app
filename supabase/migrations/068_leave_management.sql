-- ============================================================================
-- 068: Leave Management Module
-- ============================================================================

-- Leave Types lookup (dynamic, follows hr_positions pattern)
CREATE TABLE hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hr_leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hr_leave_types"
  ON hr_leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO hr_leave_types (name, is_paid, sort_order) VALUES
  ('Annual', true, 1),
  ('Sick', true, 2),
  ('Personal', true, 3),
  ('Unpaid', false, 4),
  ('Maternity', true, 5);

-- Leave Policy per company per leave type
CREATE TABLE leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  leave_type_id UUID NOT NULL REFERENCES hr_leave_types(id),
  annual_entitlement_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  carry_over_max_days NUMERIC(5,1) DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, leave_type_id)
);

ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage leave_policies"
  ON leave_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_leave_policies_company ON leave_policies(company_id);

-- Leave Requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  leave_type_id UUID NOT NULL REFERENCES hr_leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  reason TEXT,

  -- Approval workflow
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage leave_requests"
  ON leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Leave Balances (per employee per leave type per year)
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  leave_type_id UUID NOT NULL REFERENCES hr_leave_types(id),
  year INTEGER NOT NULL,
  entitlement_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(5,1) DEFAULT 0,
  used_days NUMERIC(5,1) DEFAULT 0,
  remaining_days NUMERIC(5,1) GENERATED ALWAYS AS (entitlement_days + carried_over_days - used_days) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage leave_balances"
  ON leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_leave_balances_employee_year ON leave_balances(employee_id, year);

-- Auto-number function for leave requests (LV-YYMM-0001)
CREATE OR REPLACE FUNCTION generate_leave_request_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger: update leave_balances when leave request status changes
CREATE OR REPLACE FUNCTION update_leave_balance_on_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_balance_on_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_status_change();
