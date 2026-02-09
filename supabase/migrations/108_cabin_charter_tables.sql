-- ============================================================================
-- Cabin Charter System
-- project_cabins: Cabin inventory per yacht
-- cabin_allocations: Per-cabin booking data within cabin charter bookings
-- Extends booking_payments and cash_collections with optional cabin link
-- Extends yacht_products with schedule defaults
-- ============================================================================

-- 1. Project Cabins — configurable cabin inventory per yacht
CREATE TABLE project_cabins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cabin_name TEXT NOT NULL,
  cabin_number INTEGER NOT NULL,
  position TEXT,                      -- e.g., "Bow STBD (front right)"
  max_guests INTEGER NOT NULL DEFAULT 2,
  is_ensuite BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, cabin_number)
);

CREATE INDEX idx_project_cabins_project_id ON project_cabins(project_id);

CREATE TRIGGER set_project_cabins_updated_at
  BEFORE UPDATE ON project_cabins
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_cabins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_cabins_select" ON project_cabins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_cabins_insert" ON project_cabins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "project_cabins_update" ON project_cabins
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "project_cabins_delete" ON project_cabins
  FOR DELETE TO authenticated USING (true);

-- 2. Cabin Allocations — per-cabin booking data within a cabin charter
CREATE TABLE cabin_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  project_cabin_id UUID REFERENCES project_cabins(id) ON DELETE SET NULL,
  cabin_label TEXT NOT NULL,
  cabin_number INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'held', 'booked')),

  -- Guest info
  guest_names TEXT,
  number_of_guests INTEGER DEFAULT 0,
  nationality TEXT,
  guest_notes TEXT,

  -- Booking source (per cabin — can differ from parent booking)
  agent_name TEXT,
  contact_platform TEXT,
  contact_info TEXT,

  -- Booking owner (sales person — user/employee ID, same as bookings.booking_owner)
  booking_owner TEXT,

  -- Extras (per cabin, same as bookings.extras)
  extras TEXT[] DEFAULT '{}',

  -- Charter contract (per cabin)
  contract_note TEXT,
  contract_attachments JSONB DEFAULT '[]',

  -- Commission (per cabin, same fields as bookings)
  commission_rate DECIMAL(5,2),
  total_commission DECIMAL(15,2),
  commission_deduction DECIMAL(15,2),
  commission_received DECIMAL(15,2),

  -- Notes (per cabin, same as bookings)
  internal_notes TEXT,
  internal_note_attachments JSONB DEFAULT '[]',
  customer_notes TEXT,

  -- Financial summary (synced from payments, like parent booking)
  price DECIMAL(15, 2),
  currency TEXT DEFAULT 'THB',
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'awaiting_payment', 'partial', 'paid')),

  -- Links to accounting documents
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,

  -- Meta
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cabin_allocations_booking_id ON cabin_allocations(booking_id);
CREATE INDEX idx_cabin_allocations_project_cabin_id ON cabin_allocations(project_cabin_id);

CREATE TRIGGER set_cabin_allocations_updated_at
  BEFORE UPDATE ON cabin_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE cabin_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cabin_allocations_select" ON cabin_allocations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cabin_allocations_insert" ON cabin_allocations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cabin_allocations_update" ON cabin_allocations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cabin_allocations_delete" ON cabin_allocations
  FOR DELETE TO authenticated USING (true);

-- 3. Extend booking_payments with optional cabin allocation link
-- When NULL, the payment belongs to the parent booking (existing behavior)
-- When set, it belongs to a specific cabin allocation
ALTER TABLE booking_payments
  ADD COLUMN IF NOT EXISTS cabin_allocation_id UUID REFERENCES cabin_allocations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_booking_payments_cabin_allocation_id
  ON booking_payments(cabin_allocation_id);

-- 4. Extend cash_collections with optional cabin allocation link
ALTER TABLE cash_collections
  ADD COLUMN IF NOT EXISTS cabin_allocation_id UUID REFERENCES cabin_allocations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cash_collections_cabin_allocation_id
  ON cash_collections(cabin_allocation_id);

-- 5. Extend yacht_products with flexible schedule defaults for cabin charters
ALTER TABLE yacht_products
  ADD COLUMN IF NOT EXISTS default_start_day INTEGER,   -- 0=Sunday, 1=Monday, ... 6=Saturday
  ADD COLUMN IF NOT EXISTS default_nights INTEGER;       -- Number of nights (e.g., 5 for Sun-Fri)

COMMENT ON COLUMN yacht_products.default_start_day IS 'Default start day of week for cabin charter schedule (0=Sun, 6=Sat)';
COMMENT ON COLUMN yacht_products.default_nights IS 'Default number of nights for cabin charter schedule';
