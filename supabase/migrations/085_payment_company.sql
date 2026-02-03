-- Add paid_to_company_id to booking_payments
ALTER TABLE booking_payments ADD COLUMN paid_to_company_id UUID REFERENCES companies(id);

-- Create index for company lookup
CREATE INDEX idx_booking_payments_company ON booking_payments (paid_to_company_id);
