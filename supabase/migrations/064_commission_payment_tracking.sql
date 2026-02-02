-- Commission payment tracking

ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);
ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE commission_records ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add check constraint (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commission_records_payment_status_check'
  ) THEN
    ALTER TABLE commission_records ADD CONSTRAINT commission_records_payment_status_check
      CHECK (payment_status IN ('unpaid', 'approved', 'paid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commission_records_payment_status ON commission_records(payment_status);
