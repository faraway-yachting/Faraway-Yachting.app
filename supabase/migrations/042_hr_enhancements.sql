-- ============================================================================
-- HR Enhancements: Position field, Dynamic employment types, Storage bucket
-- ============================================================================

-- 1. Add position field to employees
ALTER TABLE employees ADD COLUMN position TEXT;

-- 2. Dynamic employment types table (replaces enum for UI)
CREATE TABLE hr_employment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hr_employment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hr_employment_types"
  ON hr_employment_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default types
INSERT INTO hr_employment_types (name, label, sort_order) VALUES
  ('fixed', 'Fixed', 1),
  ('part_time', 'Part Time', 2),
  ('online_hourly', 'Online (Paid per Hour)', 3);

-- 3. Change employees.employment_type from enum to TEXT to support custom types
ALTER TABLE employees ALTER COLUMN employment_type TYPE TEXT USING employment_type::TEXT;
ALTER TABLE employees ALTER COLUMN employment_type SET DEFAULT 'fixed';

-- 4. Create storage bucket for employee profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-files', 'hr-files', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload hr files"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-files');
CREATE POLICY "Authenticated users can update hr files"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hr-files');
CREATE POLICY "Public can read hr files"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'hr-files');
CREATE POLICY "Authenticated users can delete hr files"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hr-files');
