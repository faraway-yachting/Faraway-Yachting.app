-- ============================================================================
-- Faraway Yachting Accounting - Initial Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================

-- ============================================================================
-- PHASE 2: Authentication & User Management
-- ============================================================================

-- User profiles extending Supabase auth
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_id UUID,
  role TEXT CHECK (role IN ('admin', 'manager', 'accountant', 'captain', 'viewer')) DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- PHASE 3: Core Tables
-- ============================================================================

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  registered_address JSONB NOT NULL DEFAULT '{}',
  billing_address JSONB NOT NULL DEFAULT '{}',
  same_as_billing_address BOOLEAN DEFAULT true,
  contact_information JSONB NOT NULL DEFAULT '{}',
  currency TEXT DEFAULT 'THB',
  is_active BOOLEAN DEFAULT true,
  is_vat_registered BOOLEAN DEFAULT false,
  vat_rate DECIMAL(5,2),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to user_profiles after companies table exists
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_company
  FOREIGN KEY (company_id) REFERENCES companies(id);

-- RLS for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view companies they belong to"
  ON companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contacts (Customers & Vendors)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('customer', 'vendor', 'both')) NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  billing_address JSONB,
  default_currency TEXT DEFAULT 'THB',
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage contacts"
  ON contacts FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  type TEXT CHECK (type IN ('yacht', 'charter', 'event', 'other')),
  description TEXT,
  participants JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  management_fee_percentage DECIMAL(5,2) DEFAULT 15,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, code)
);

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view projects from their company"
  ON projects FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage projects from their company"
  ON projects FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  bank_information JSONB NOT NULL DEFAULT '{}',
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT CHECK (currency IN ('THB','EUR','USD','SGD','GBP','AED')),
  gl_account_code TEXT NOT NULL,
  opening_balance DECIMAL(15,2),
  opening_balance_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view bank accounts from their company"
  ON bank_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Managers and above can manage bank accounts"
  ON bank_accounts FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- ============================================================================
-- PHASE 4: Settings Tables
-- ============================================================================

-- Number Format Settings
CREATE TABLE IF NOT EXISTS number_format_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  document_type TEXT CHECK (document_type IN ('quotation', 'invoice', 'receipt', 'creditNote', 'debitNote')) NOT NULL,
  prefix TEXT NOT NULL,
  date_format TEXT CHECK (date_format IN ('YYMM', 'YYYYMM', 'MMYY', 'none')) DEFAULT 'YYMM',
  sequence_digits INTEGER DEFAULT 4,
  separator TEXT CHECK (separator IN ('-', '/', '')) DEFAULT '-',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, document_type)
);

ALTER TABLE number_format_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view number formats from their company"
  ON number_format_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage number formats"
  ON number_format_settings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- PDF Settings
CREATE TABLE IF NOT EXISTS pdf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  document_type TEXT CHECK (document_type IN ('quotation', 'invoice', 'receipt')) NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}',
  default_terms_and_conditions TEXT,
  default_validity_days INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, document_type)
);

ALTER TABLE pdf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view PDF settings"
  ON pdf_settings FOR SELECT
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage PDF settings"
  ON pdf_settings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PHASE 5: Income Module Tables
-- ============================================================================

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES contacts(id),
  client_name TEXT NOT NULL,
  quotation_id UUID,
  charter_period_from DATE,
  charter_period_to DATE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_terms TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('exclude_vat', 'include_vat', 'no_vat')) DEFAULT 'exclude_vat',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_outstanding DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(15,6),
  status TEXT CHECK (status IN ('draft', 'issued', 'void')) DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, invoice_number)
);

CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view invoices from their company"
  ON invoices FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage invoices from their company"
  ON invoices FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  wht_rate TEXT DEFAULT '0',
  amount DECIMAL(15,2) NOT NULL,
  line_order INTEGER
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_project_id ON invoice_line_items(project_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view invoice line items"
  ON invoice_line_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage invoice line items"
  ON invoice_line_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  quotation_number TEXT NOT NULL,
  client_id UUID REFERENCES contacts(id),
  client_name TEXT NOT NULL,
  charter_period_from DATE,
  charter_period_to DATE,
  date_created DATE NOT NULL,
  valid_until DATE NOT NULL,
  pricing_type TEXT CHECK (pricing_type IN ('exclude_vat', 'include_vat', 'no_vat')) DEFAULT 'exclude_vat',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(15,6),
  status TEXT CHECK (status IN ('draft', 'accepted', 'void')) DEFAULT 'draft',
  terms_and_conditions TEXT,
  notes TEXT,
  converted_to_invoice_id UUID REFERENCES invoices(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, quotation_number)
);

CREATE INDEX idx_quotations_company_id ON quotations(company_id);
CREATE INDEX idx_quotations_status ON quotations(status);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view quotations from their company"
  ON quotations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage quotations from their company"
  ON quotations FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Quotation Line Items
CREATE TABLE IF NOT EXISTS quotation_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  wht_rate TEXT DEFAULT '0',
  amount DECIMAL(15,2) NOT NULL,
  line_order INTEGER
);

CREATE INDEX idx_quotation_line_items_quotation_id ON quotation_line_items(quotation_id);

ALTER TABLE quotation_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view quotation line items"
  ON quotation_line_items FOR SELECT
  USING (
    quotation_id IN (
      SELECT id FROM quotations WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage quotation line items"
  ON quotation_line_items FOR ALL
  USING (
    quotation_id IN (
      SELECT id FROM quotations WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    quotation_id IN (
      SELECT id FROM quotations WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  receipt_number TEXT NOT NULL,
  client_id UUID REFERENCES contacts(id),
  client_name TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  reference TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('exclude_vat', 'include_vat', 'no_vat')) DEFAULT 'exclude_vat',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  wht_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  adjustment_type TEXT CHECK (adjustment_type IN ('none', 'add', 'deduct')),
  adjustment_amount DECIMAL(15,2),
  adjustment_account_code TEXT,
  adjustment_remark TEXT,
  net_amount_to_pay DECIMAL(15,2) DEFAULT 0,
  total_payments DECIMAL(15,2) DEFAULT 0,
  total_received DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(15,6),
  status TEXT CHECK (status IN ('draft', 'paid', 'void')) DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, receipt_number)
);

CREATE INDEX idx_receipts_company_id ON receipts(company_id);
CREATE INDEX idx_receipts_status ON receipts(status);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view receipts from their company"
  ON receipts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage receipts from their company"
  ON receipts FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Receipt Line Items
CREATE TABLE IF NOT EXISTS receipt_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  wht_rate TEXT DEFAULT '0',
  amount DECIMAL(15,2) NOT NULL,
  line_order INTEGER
);

CREATE INDEX idx_receipt_line_items_receipt_id ON receipt_line_items(receipt_id);

ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view receipt line items"
  ON receipt_line_items FOR SELECT
  USING (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage receipt line items"
  ON receipt_line_items FOR ALL
  USING (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Receipt Payment Records
CREATE TABLE IF NOT EXISTS receipt_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  received_at TEXT NOT NULL, -- 'cash' or bank_account_id
  remark TEXT,
  fx_rate DECIMAL(15,6),
  thb_amount DECIMAL(15,2)
);

CREATE INDEX idx_receipt_payment_records_receipt_id ON receipt_payment_records(receipt_id);

ALTER TABLE receipt_payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view receipt payments"
  ON receipt_payment_records FOR SELECT
  USING (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage receipt payments"
  ON receipt_payment_records FOR ALL
  USING (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    receipt_id IN (
      SELECT id FROM receipts WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PHASE 6: Expense Module Tables
-- ============================================================================

-- Expenses (Supplier Invoices)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  expense_number TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES contacts(id),
  vendor_name TEXT NOT NULL,
  supplier_invoice_number TEXT,
  expense_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  wht_amount DECIMAL(15,2) DEFAULT 0,
  net_payable DECIMAL(15,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')) DEFAULT 'unpaid',
  status TEXT CHECK (status IN ('draft', 'approved', 'void')) DEFAULT 'draft',
  currency TEXT DEFAULT 'USD',
  fx_rate DECIMAL(15,6),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, expense_number)
);

CREATE INDEX idx_expenses_company_id ON expenses(company_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view expenses from their company"
  ON expenses FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage expenses from their company"
  ON expenses FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ))
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Expense Line Items
CREATE TABLE IF NOT EXISTS expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  quantity DECIMAL(12,4),
  unit_price DECIMAL(15,4),
  tax_rate DECIMAL(5,2),
  wht_rate TEXT,
  amount DECIMAL(15,2) NOT NULL,
  account_code TEXT,
  line_order INTEGER
);

CREATE INDEX idx_expense_line_items_expense_id ON expense_line_items(expense_id);
CREATE INDEX idx_expense_line_items_project_id ON expense_line_items(project_id);

ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view expense line items"
  ON expense_line_items FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage expense line items"
  ON expense_line_items FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Expense Payments
CREATE TABLE IF NOT EXISTS expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  paid_from TEXT NOT NULL, -- 'cash' or bank_account_id
  reference TEXT,
  remark TEXT
);

CREATE INDEX idx_expense_payments_expense_id ON expense_payments(expense_id);

ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view expense payments"
  ON expense_payments FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage expense payments"
  ON expense_payments FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    expense_id IN (
      SELECT id FROM expenses WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PHASE 7: Petty Cash Module
-- ============================================================================

-- Petty Cash Wallets
CREATE TABLE IF NOT EXISTS petty_cash_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  user_email TEXT,
  company_id UUID NOT NULL REFERENCES companies(id),
  company_name TEXT,
  balance DECIMAL(15,2) DEFAULT 0,
  beginning_balance DECIMAL(15,2),
  currency TEXT DEFAULT 'THB',
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  balance_limit DECIMAL(15,2),
  low_balance_threshold DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_petty_cash_wallets_company_id ON petty_cash_wallets(company_id);
CREATE INDEX idx_petty_cash_wallets_user_id ON petty_cash_wallets(user_id);

ALTER TABLE petty_cash_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view wallets from their company or own wallet"
  ON petty_cash_wallets FOR SELECT
  USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage wallets"
  ON petty_cash_wallets FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- Petty Cash Expenses
CREATE TABLE IF NOT EXISTS petty_cash_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL,
  wallet_id UUID NOT NULL REFERENCES petty_cash_wallets(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  expense_date DATE NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id),
  amount DECIMAL(15,2) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted')) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_petty_cash_expenses_wallet_id ON petty_cash_expenses(wallet_id);
CREATE INDEX idx_petty_cash_expenses_company_id ON petty_cash_expenses(company_id);

ALTER TABLE petty_cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view petty cash expenses"
  ON petty_cash_expenses FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid()) OR
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create petty cash expenses"
  ON petty_cash_expenses FOR INSERT
  WITH CHECK (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can manage petty cash expenses"
  ON petty_cash_expenses FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- Petty Cash Topups
CREATE TABLE IF NOT EXISTS petty_cash_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES petty_cash_wallets(id),
  amount DECIMAL(15,2) NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id),
  topup_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_petty_cash_topups_wallet_id ON petty_cash_topups(wallet_id);

ALTER TABLE petty_cash_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view topups"
  ON petty_cash_topups FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid()) OR
    wallet_id IN (
      SELECT id FROM petty_cash_wallets WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Managers can manage topups"
  ON petty_cash_topups FOR ALL
  USING (
    wallet_id IN (
      SELECT id FROM petty_cash_wallets WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  )
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM petty_cash_wallets WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  );

-- ============================================================================
-- PHASE 8: Accounting Module
-- ============================================================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')) NOT NULL,
  normal_balance TEXT CHECK (normal_balance IN ('Debit', 'Credit')) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chart of accounts"
  ON chart_of_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage chart of accounts"
  ON chart_of_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'posted')) DEFAULT 'draft',
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view journal entries from their company"
  ON journal_entries FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Accountants can manage journal entries"
  ON journal_entries FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  entry_type TEXT CHECK (entry_type IN ('debit', 'credit')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  line_order INTEGER
);

CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Accountants can manage journal entry lines"
  ON journal_entry_lines FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  )
  WITH CHECK (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
      )
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with that column
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_petty_cash_wallets_updated_at BEFORE UPDATE ON petty_cash_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_number_format_settings_updated_at BEFORE UPDATE ON number_format_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pdf_settings_updated_at BEFORE UPDATE ON pdf_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Done!
-- ============================================================================
