-- Connect booking payments to accounting receipts
-- Allows payments recorded in booking form to sync to receipt_payment_records

ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES receipts(id);
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'cash', 'bank_transfer', 'credit_card'
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS synced_to_receipt BOOLEAN DEFAULT false;
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS needs_accounting_action BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_booking_payments_receipt ON booking_payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_needs_action ON booking_payments(needs_accounting_action) WHERE needs_accounting_action = true;
