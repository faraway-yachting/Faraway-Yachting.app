-- ============================================================================
-- HR Module - Phase 1: Employee Master, Details, Documents
-- ============================================================================

-- Enums
CREATE TYPE hr_employment_type AS ENUM ('fixed', 'part_time', 'online_hourly');
CREATE TYPE hr_employee_status AS ENUM ('active', 'on_leave', 'resigned', 'terminated');
CREATE TYPE hr_season AS ENUM ('high', 'low');
CREATE TYPE hr_charter_rate_type AS ENUM ('half_day', 'full_day', 'overnight', 'sleep_on_boat', 'other');
CREATE TYPE hr_document_type AS ENUM ('id_card', 'passport', 'work_permit', 'license', 'other');

-- ============================================================================
-- Sequence for employee ID (FAteam-0001, FAteam-0002, ...)
-- ============================================================================
CREATE SEQUENCE employee_id_seq START 1;

-- ============================================================================
-- Employees - Core employee record
-- ============================================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE DEFAULT 'FAteam-' || LPAD(nextval('employee_id_seq')::TEXT, 4, '0'),
  user_profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Personal details
  picture_url TEXT,
  full_name_en TEXT NOT NULL,
  full_name_th TEXT,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  line_id TEXT,

  -- Employment
  employment_type hr_employment_type NOT NULL DEFAULT 'fixed',
  company_id UUID REFERENCES companies(id),
  status hr_employee_status NOT NULL DEFAULT 'active',

  -- Dates
  start_date DATE,
  probation_end_date DATE,
  contract_end_date DATE,
  resignation_date DATE,

  -- Salary
  base_salary NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'THB',

  -- Manager-only notes
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_user_profile ON employees(user_profile_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employees"
  ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Employee Boat Assignments
-- ============================================================================
CREATE TABLE employee_boat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  boat_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_on_boat TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, boat_id)
);

CREATE INDEX idx_emp_boat_employee ON employee_boat_assignments(employee_id);
CREATE INDEX idx_emp_boat_boat ON employee_boat_assignments(boat_id);

ALTER TABLE employee_boat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_boat_assignments"
  ON employee_boat_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Employee Charter Rates (day bonus per type x season)
-- ============================================================================
CREATE TABLE employee_charter_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  charter_rate_type hr_charter_rate_type NOT NULL,
  season hr_season NOT NULL,
  rate_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'THB',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, charter_rate_type, season)
);

CREATE INDEX idx_emp_rates_employee ON employee_charter_rates(employee_id);

ALTER TABLE employee_charter_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_charter_rates"
  ON employee_charter_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Employee Documents (compliance docs with expiry tracking)
-- ============================================================================
CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type hr_document_type NOT NULL DEFAULT 'other',
  document_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  issue_date DATE,
  expiry_date DATE,
  alert_days_before INTEGER DEFAULT 30,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_emp_docs_employee ON employee_documents(employee_id);
CREATE INDEX idx_emp_docs_expiry ON employee_documents(expiry_date);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employee_documents"
  ON employee_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
