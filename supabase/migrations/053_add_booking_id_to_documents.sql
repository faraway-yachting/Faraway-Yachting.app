-- Add booking_id to receipts and invoices for direct linking
ALTER TABLE receipts ADD COLUMN booking_id UUID REFERENCES bookings(id);
ALTER TABLE invoices ADD COLUMN booking_id UUID REFERENCES bookings(id);

CREATE INDEX idx_receipts_booking_id ON receipts(booking_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
