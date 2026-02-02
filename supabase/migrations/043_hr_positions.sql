-- ============================================================================
-- HR Positions lookup table
-- ============================================================================

CREATE TABLE hr_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hr_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hr_positions"
  ON hr_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed common positions
INSERT INTO hr_positions (name, sort_order) VALUES
  ('Captain', 1),
  ('Deckhand', 2),
  ('Engineer', 3),
  ('Stewardess', 4),
  ('Chef', 5),
  ('Office Admin', 6),
  ('Sales', 7),
  ('Accountant', 8),
  ('Manager', 9);
