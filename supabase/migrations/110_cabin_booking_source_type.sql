-- Add booking_source_type to cabin_allocations
-- Tracks whether each cabin is a direct booking or via an agency
ALTER TABLE cabin_allocations
  ADD COLUMN IF NOT EXISTS booking_source_type TEXT DEFAULT 'direct'
    CHECK (booking_source_type IN ('direct', 'agency'));
