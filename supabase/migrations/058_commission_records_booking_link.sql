-- Add booking link and source tracking to commission_records

ALTER TABLE commission_records ADD COLUMN booking_id UUID REFERENCES bookings(id);
ALTER TABLE commission_records ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE commission_records ADD COLUMN management_fee_overridden BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_commission_records_booking_id ON commission_records(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_commission_records_source ON commission_records(source);
