-- Track deposit and balance payments to boat operators for external/bareboat charters
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operator_deposit_amount DECIMAL(15,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operator_deposit_paid_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operator_balance_amount DECIMAL(15,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operator_balance_paid_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operator_payment_note TEXT;
