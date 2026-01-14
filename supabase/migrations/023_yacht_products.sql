-- Yacht Products (Charter Presets)
-- Migration: 023_yacht_products.sql

-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create product charter type enum
CREATE TYPE product_charter_type AS ENUM (
  'full_day_charter',
  'half_day_charter',
  'overnight_charter',
  'cabin_charter',
  'bareboat_charter',
  'other_charter'
);

-- Create yacht source enum
CREATE TYPE yacht_source AS ENUM ('own', 'external');

-- Main yacht_products table
CREATE TABLE yacht_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Yacht Reference (discriminated union pattern)
  yacht_source yacht_source NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  external_yacht_id TEXT, -- localStorage ID for external yachts (e.g., 'ext-1234567890')

  -- Product Details
  name TEXT NOT NULL, -- Display name (e.g., "Full Day Phi Phi")
  charter_type product_charter_type NOT NULL,
  duration TEXT NOT NULL, -- e.g., "8 hours", "Full Day", "3 nights"
  depart_from TEXT, -- Marina location
  destination TEXT, -- Charter destination

  -- Pricing
  price DECIMAL(15, 2),
  currency TEXT DEFAULT 'THB',

  -- Default time (for day charters)
  default_time TEXT, -- e.g., "09:00 - 17:00"

  -- Ordering/Active status
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: Either project_id OR external_yacht_id must be set based on yacht_source
  CONSTRAINT yacht_reference_check CHECK (
    (yacht_source = 'own' AND project_id IS NOT NULL AND external_yacht_id IS NULL) OR
    (yacht_source = 'external' AND project_id IS NULL AND external_yacht_id IS NOT NULL)
  )
);

-- Create indexes for common queries
CREATE INDEX idx_yacht_products_project_id ON yacht_products(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_yacht_products_external_yacht_id ON yacht_products(external_yacht_id) WHERE external_yacht_id IS NOT NULL;
CREATE INDEX idx_yacht_products_charter_type ON yacht_products(charter_type);
CREATE INDEX idx_yacht_products_is_active ON yacht_products(is_active);
CREATE INDEX idx_yacht_products_yacht_source ON yacht_products(yacht_source);

-- Updated_at trigger
CREATE TRIGGER set_yacht_products_updated_at
  BEFORE UPDATE ON yacht_products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE yacht_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can view yacht products
CREATE POLICY "yacht_products_select" ON yacht_products
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert yacht products
CREATE POLICY "yacht_products_insert" ON yacht_products
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated users can update yacht products
CREATE POLICY "yacht_products_update" ON yacht_products
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete yacht products
CREATE POLICY "yacht_products_delete" ON yacht_products
  FOR DELETE TO authenticated
  USING (true);
