-- External Boats
-- Replaces localStorage external yacht storage with proper database table

CREATE TABLE IF NOT EXISTS external_boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,

  -- Operator
  operator_name TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Location
  depart_from TEXT,

  -- Media
  picture_url TEXT,
  contract_url TEXT,
  contract_filename TEXT,

  -- Contact Info
  contact_person TEXT,
  contact_channel TEXT,
  contact_value TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_external_boats_name ON external_boats(name);
CREATE INDEX idx_external_boats_is_active ON external_boats(is_active);

-- Updated_at trigger
CREATE TRIGGER set_external_boats_updated_at
  BEFORE UPDATE ON external_boats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE external_boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_boats_select" ON external_boats FOR SELECT TO authenticated USING (true);
CREATE POLICY "external_boats_insert" ON external_boats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "external_boats_update" ON external_boats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "external_boats_delete" ON external_boats FOR DELETE TO authenticated USING (true);
