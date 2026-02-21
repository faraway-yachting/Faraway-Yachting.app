-- Migration 143: Taxi public links and guest note templates

-- Public links for taxi companies (one permanent link per company)
CREATE TABLE taxi_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  taxi_company_id UUID NOT NULL REFERENCES taxi_companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taxi_public_links_token ON taxi_public_links(token);
CREATE INDEX idx_taxi_public_links_company ON taxi_public_links(taxi_company_id);

CREATE TRIGGER set_taxi_public_links_updated_at
  BEFORE UPDATE ON taxi_public_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_public_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi public links"
  ON taxi_public_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi public links"
  ON taxi_public_links FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi public links"
  ON taxi_public_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi public links"
  ON taxi_public_links FOR DELETE TO authenticated USING (true);

-- Guest note templates (reusable text templates for guest messages)
CREATE TABLE taxi_guest_note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content_en TEXT,
  content_th TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_taxi_guest_note_templates_updated_at
  BEFORE UPDATE ON taxi_guest_note_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_guest_note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi note templates"
  ON taxi_guest_note_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi note templates"
  ON taxi_guest_note_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi note templates"
  ON taxi_guest_note_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi note templates"
  ON taxi_guest_note_templates FOR DELETE TO authenticated USING (true);
