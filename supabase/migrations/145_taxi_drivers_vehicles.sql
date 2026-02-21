-- Migration 145: Taxi drivers and vehicles per company
-- Reusable driver/vehicle entities linked to taxi companies

-- ============================================================================
-- PART 1: Taxi Drivers Table
-- ============================================================================

CREATE TABLE taxi_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxi_company_id UUID NOT NULL REFERENCES taxi_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taxi_drivers_company ON taxi_drivers(taxi_company_id);

CREATE TRIGGER set_taxi_drivers_updated_at
  BEFORE UPDATE ON taxi_drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi drivers"
  ON taxi_drivers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi drivers"
  ON taxi_drivers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi drivers"
  ON taxi_drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi drivers"
  ON taxi_drivers FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PART 2: Taxi Vehicles Table
-- ============================================================================

CREATE TABLE taxi_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxi_company_id UUID NOT NULL REFERENCES taxi_companies(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taxi_vehicles_company ON taxi_vehicles(taxi_company_id);

CREATE TRIGGER set_taxi_vehicles_updated_at
  BEFORE UPDATE ON taxi_vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE taxi_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taxi vehicles"
  ON taxi_vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert taxi vehicles"
  ON taxi_vehicles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update taxi vehicles"
  ON taxi_vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete taxi vehicles"
  ON taxi_vehicles FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PART 3: Add FK columns to taxi_transfers (optional link to driver/vehicle)
-- ============================================================================

ALTER TABLE taxi_transfers ADD COLUMN taxi_driver_id UUID REFERENCES taxi_drivers(id) ON DELETE SET NULL;
ALTER TABLE taxi_transfers ADD COLUMN taxi_vehicle_id UUID REFERENCES taxi_vehicles(id) ON DELETE SET NULL;

CREATE INDEX idx_taxi_transfers_driver ON taxi_transfers(taxi_driver_id);
CREATE INDEX idx_taxi_transfers_vehicle ON taxi_transfers(taxi_vehicle_id);
