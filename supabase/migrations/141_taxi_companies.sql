-- Migration 141: Taxi companies registry
-- Reusable taxi company entities used across taxi transfers

CREATE TABLE taxi_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  line_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_taxi_companies_updated_at
  BEFORE UPDATE ON taxi_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi companies"
  ON taxi_companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi companies"
  ON taxi_companies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi companies"
  ON taxi_companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi companies"
  ON taxi_companies FOR DELETE TO authenticated USING (true);
