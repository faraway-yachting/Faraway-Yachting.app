-- Migration 135: Inventory Purchase Records
-- Addresses: Purchase Inventory "Coming Soon" placeholder
-- Supports: 3 payment methods (bank, cash, petty cash), partial consumption, project transfers
-- Accounting: All purchases go through GL 1200 (Inventory Asset) first,
--             then move to 5xxx expense accounts when consumed.

-- ============================================================================
-- Table 1: Inventory Purchases (header)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number          TEXT NOT NULL,                    -- Format: PO-INV-YYMM-XXXX
  company_id               UUID NOT NULL REFERENCES companies(id),
  vendor_id                UUID REFERENCES contacts(id),
  vendor_name              TEXT,
  supplier_invoice_number  TEXT,
  supplier_invoice_date    DATE,
  purchase_date            DATE NOT NULL,
  expected_delivery_date   DATE,
  actual_delivery_date     DATE,

  -- Pricing
  pricing_type             TEXT CHECK (pricing_type IN ('exclude_vat', 'include_vat', 'no_vat')) NOT NULL DEFAULT 'no_vat',
  currency                 TEXT NOT NULL DEFAULT 'THB',
  fx_rate                  DECIMAL(15,6),
  fx_rate_source           TEXT,                             -- 'bot' | 'manual' | 'fallback'
  fx_rate_date             DATE,

  -- Totals
  subtotal                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  vat_amount               DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_payable              DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- THB equivalents (for FX reporting)
  thb_subtotal             DECIMAL(15,2),
  thb_vat_amount           DECIMAL(15,2),
  thb_total_amount         DECIMAL(15,2),
  thb_net_payable          DECIMAL(15,2),

  -- Payment tracking
  payment_status           TEXT CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')) NOT NULL DEFAULT 'unpaid',
  amount_paid              DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_outstanding       DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Status: no 'approved' — purchases have no AP accrual workflow
  status                   TEXT CHECK (status IN ('draft', 'received', 'void')) NOT NULL DEFAULT 'draft',
  received_date            DATE,
  received_by              UUID REFERENCES auth.users(id),
  voided_date              DATE,
  void_reason              TEXT,

  -- Receipt tracking
  receipt_status           TEXT CHECK (receipt_status IN ('pending', 'received', 'not_required')) NOT NULL DEFAULT 'pending',
  receipt_received_date    DATE,
  receipt_received_by      UUID REFERENCES auth.users(id),

  -- Notes and attachments
  notes                    TEXT,
  attachments              JSONB DEFAULT '[]',

  -- Audit
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, purchase_number)
);

CREATE INDEX idx_inventory_purchases_company_id    ON inventory_purchases(company_id);
CREATE INDEX idx_inventory_purchases_status        ON inventory_purchases(status);
CREATE INDEX idx_inventory_purchases_vendor_id     ON inventory_purchases(vendor_id);
CREATE INDEX idx_inventory_purchases_purchase_date ON inventory_purchases(purchase_date);

ALTER TABLE inventory_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view inventory purchases from their company"
  ON inventory_purchases FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage inventory purchases from their company"
  ON inventory_purchases FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));


-- ============================================================================
-- Table 2: Inventory Purchase Line Items
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_purchase_line_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id              UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  project_id               UUID NOT NULL REFERENCES projects(id),
  description              TEXT NOT NULL,
  sku                      TEXT,                             -- Optional stock keeping unit
  unit                     TEXT,                             -- Unit of measure (pcs, liters, kg, boxes, sets, meters)
  quantity                 DECIMAL(12,4) NOT NULL DEFAULT 1,
  quantity_consumed        DECIMAL(12,4) NOT NULL DEFAULT 0, -- Running total consumed
  unit_price               DECIMAL(15,4) NOT NULL DEFAULT 0,
  tax_rate                 DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Calculated amounts
  amount                   DECIMAL(15,2) NOT NULL DEFAULT 0, -- Line total
  pre_vat_amount           DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- GL accounts
  account_code             TEXT NOT NULL DEFAULT '1200',     -- Always 1200 (Inventory) for purchase journal
  expense_account_code     TEXT,                             -- Default 5xxx account for consumption

  -- Attachments
  attachments              JSONB DEFAULT '[]',
  line_order               INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_inv_pur_line_items_purchase_id ON inventory_purchase_line_items(purchase_id);
CREATE INDEX idx_inv_pur_line_items_project_id  ON inventory_purchase_line_items(project_id);
CREATE INDEX idx_inv_pur_line_items_sku         ON inventory_purchase_line_items(sku) WHERE sku IS NOT NULL;

ALTER TABLE inventory_purchase_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view inventory purchase line items"
  ON inventory_purchase_line_items FOR SELECT
  USING (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage inventory purchase line items"
  ON inventory_purchase_line_items FOR ALL
  USING (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );


-- ============================================================================
-- Table 3: Inventory Consumption Records
-- Tracks each consumption event — enables partial consumption + project transfers
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_consumption_records (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id             UUID NOT NULL REFERENCES inventory_purchase_line_items(id) ON DELETE CASCADE,
  quantity                 DECIMAL(12,4) NOT NULL,           -- Quantity consumed in this event
  project_id               UUID NOT NULL REFERENCES projects(id), -- Can differ from purchase project (transfer)
  expense_account_code     TEXT NOT NULL,                    -- 5xxx account for this consumption
  consumed_date            DATE NOT NULL,
  consumed_by              UUID REFERENCES auth.users(id),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_consumption_line_item_id ON inventory_consumption_records(line_item_id);
CREATE INDEX idx_inv_consumption_project_id   ON inventory_consumption_records(project_id);
CREATE INDEX idx_inv_consumption_date         ON inventory_consumption_records(consumed_date);

ALTER TABLE inventory_consumption_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view inventory consumption records"
  ON inventory_consumption_records FOR SELECT
  USING (
    line_item_id IN (
      SELECT id FROM inventory_purchase_line_items WHERE purchase_id IN (
        SELECT id FROM inventory_purchases WHERE company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage inventory consumption records"
  ON inventory_consumption_records FOR ALL
  USING (
    line_item_id IN (
      SELECT id FROM inventory_purchase_line_items WHERE purchase_id IN (
        SELECT id FROM inventory_purchases WHERE company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    line_item_id IN (
      SELECT id FROM inventory_purchase_line_items WHERE purchase_id IN (
        SELECT id FROM inventory_purchases WHERE company_id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
  );


-- ============================================================================
-- Table 4: Inventory Purchase Payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_purchase_payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id              UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  payment_date             DATE NOT NULL,
  amount                   DECIMAL(15,2) NOT NULL,
  payment_type             TEXT CHECK (payment_type IN ('bank', 'cash', 'petty_cash')) NOT NULL,
  bank_account_id          UUID REFERENCES bank_accounts(id),          -- Set when payment_type = 'bank'
  bank_account_gl_code     TEXT,                                       -- Denormalized for journal generation
  petty_cash_wallet_id     UUID REFERENCES petty_cash_wallets(id),     -- Set when payment_type = 'petty_cash'
  petty_cash_expense_id    UUID REFERENCES petty_cash_expenses(id),    -- Link to auto-created PC expense
  reference                TEXT,
  remark                   TEXT,
  fx_rate                  DECIMAL(15,6),
  thb_amount               DECIMAL(15,2)
);

CREATE INDEX idx_inv_pur_payments_purchase_id ON inventory_purchase_payments(purchase_id);
CREATE INDEX idx_inv_pur_payments_wallet_id   ON inventory_purchase_payments(petty_cash_wallet_id)
  WHERE petty_cash_wallet_id IS NOT NULL;

ALTER TABLE inventory_purchase_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view inventory purchase payments"
  ON inventory_purchase_payments FOR SELECT
  USING (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage inventory purchase payments"
  ON inventory_purchase_payments FOR ALL
  USING (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    purchase_id IN (
      SELECT id FROM inventory_purchases WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );


-- ============================================================================
-- Triggers
-- ============================================================================

-- updated_at trigger for inventory_purchases
CREATE TRIGGER update_inventory_purchases_updated_at
  BEFORE UPDATE ON inventory_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
