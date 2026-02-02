-- ============================================================================
-- 070: HR Departments lookup + employee department field
-- ============================================================================

CREATE TABLE hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hr_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hr_departments"
  ON hr_departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO hr_departments (name, sort_order) VALUES
  ('Operations', 1),
  ('Office', 2),
  ('Sales', 3),
  ('Accounting', 4),
  ('Management', 5);

-- Add department column to employees
ALTER TABLE employees ADD COLUMN department TEXT;
