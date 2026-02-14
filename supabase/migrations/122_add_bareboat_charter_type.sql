-- Add bareboat_charter to the booking_type enum
-- The frontend already supports it but the database enum was missing this value
ALTER TYPE booking_type ADD VALUE IF NOT EXISTS 'bareboat_charter';
