-- ============================================================================
-- HR Document Types lookup table + change document_type to TEXT
-- ============================================================================

-- 1. Dynamic document types table
CREATE TABLE hr_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hr_document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hr_document_types"
  ON hr_document_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default types
INSERT INTO hr_document_types (name, sort_order) VALUES
  ('ID Card', 1),
  ('Passport', 2),
  ('Work Permit', 3),
  ('License', 4),
  ('Seaman Book', 5),
  ('Certificate', 6),
  ('Contract', 7),
  ('Other', 8);

-- 2. Change employee_documents.document_type from enum to TEXT
ALTER TABLE employee_documents ALTER COLUMN document_type TYPE TEXT USING document_type::TEXT;
ALTER TABLE employee_documents ALTER COLUMN document_type SET DEFAULT 'Other';
