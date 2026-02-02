-- Add updated_by tracking to bookings
ALTER TABLE bookings ADD COLUMN updated_by uuid REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN updated_by_name text;
