-- Migration 147: Link drivers to their default vehicle
-- When a driver is selected, their default vehicle auto-fills

ALTER TABLE taxi_drivers
  ADD COLUMN IF NOT EXISTS default_vehicle_id UUID REFERENCES taxi_vehicles(id) ON DELETE SET NULL;
