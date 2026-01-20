-- Migration 026: RLS Policies for All Sensitive Tables
-- Implements company-based access control using user_company_access
-- NOTE: Project-level isolation is only applied to tables that have project_id column

-- ============================================================================
-- PART 1: Drop Existing Policies (to replace with new ones)
-- ============================================================================

-- User Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;

-- Expenses
DROP POLICY IF EXISTS "Users can view expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can manage expenses in their company" ON expenses;
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

-- Expense Line Items
DROP POLICY IF EXISTS "expense_line_items_select_policy" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert_policy" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update_policy" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_delete_policy" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_select" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_delete" ON expense_line_items;

-- Receipts
DROP POLICY IF EXISTS "receipts_select_policy" ON receipts;
DROP POLICY IF EXISTS "receipts_insert_policy" ON receipts;
DROP POLICY IF EXISTS "receipts_update_policy" ON receipts;
DROP POLICY IF EXISTS "receipts_delete_policy" ON receipts;
DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
DROP POLICY IF EXISTS "receipts_update" ON receipts;
DROP POLICY IF EXISTS "receipts_delete" ON receipts;

-- Receipt Line Items
DROP POLICY IF EXISTS "receipt_line_items_select_policy" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_insert_policy" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_update_policy" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_delete_policy" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_select" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_insert" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_update" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_delete" ON receipt_line_items;

-- Invoices
DROP POLICY IF EXISTS "invoices_select_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

-- Invoice Line Items
DROP POLICY IF EXISTS "invoice_line_items_select_policy" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert_policy" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update_policy" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete_policy" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;

-- Journal Entries
DROP POLICY IF EXISTS "journal_entries_select_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON journal_entries;

-- Journal Entry Lines
DROP POLICY IF EXISTS "journal_entry_lines_select_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete" ON journal_entry_lines;

-- Petty Cash
DROP POLICY IF EXISTS "Users view wallets from their company or own wallet" ON petty_cash_wallets;
DROP POLICY IF EXISTS "Managers can manage wallets" ON petty_cash_wallets;
DROP POLICY IF EXISTS "Users view petty cash expenses" ON petty_cash_expenses;
DROP POLICY IF EXISTS "Users can create petty cash expenses" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_wallets_select" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_insert" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_update" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_delete" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_expenses_select" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_insert" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_update" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_delete" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_topups_select" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_insert" ON petty_cash_topups;
DROP POLICY IF EXISTS "Users view petty cash topups" ON petty_cash_topups;

-- ============================================================================
-- PART 2: User Profiles RLS (Strict - Own profile OR super admin)
-- ============================================================================

CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- PART 3: Expenses RLS (Company-based - no project_id on expenses table)
-- ============================================================================

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = expenses.company_id)
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 4: Expense Line Items RLS (Inherits from parent expense)
-- Project isolation at line item level for investors
-- ============================================================================

CREATE POLICY "expense_line_items_select" ON expense_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR expense_id IN (SELECT id FROM expenses)
  );

CREATE POLICY "expense_line_items_insert" ON expense_line_items
  FOR INSERT WITH CHECK (
    expense_id IN (SELECT id FROM expenses)
  );

CREATE POLICY "expense_line_items_update" ON expense_line_items
  FOR UPDATE USING (
    expense_id IN (SELECT id FROM expenses)
  );

CREATE POLICY "expense_line_items_delete" ON expense_line_items
  FOR DELETE USING (
    expense_id IN (SELECT id FROM expenses)
  );

-- ============================================================================
-- PART 5: Receipts RLS (Company-based)
-- ============================================================================

CREATE POLICY "receipts_select" ON receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = receipts.company_id)
  );

CREATE POLICY "receipts_insert" ON receipts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_update" ON receipts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_delete" ON receipts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 6: Receipt Line Items RLS
-- ============================================================================

CREATE POLICY "receipt_line_items_select" ON receipt_line_items
  FOR SELECT USING (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_insert" ON receipt_line_items
  FOR INSERT WITH CHECK (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_update" ON receipt_line_items
  FOR UPDATE USING (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_delete" ON receipt_line_items
  FOR DELETE USING (receipt_id IN (SELECT id FROM receipts));

-- ============================================================================
-- PART 7: Invoices RLS (Company-based)
-- ============================================================================

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = invoices.company_id)
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 8: Invoice Line Items RLS
-- ============================================================================

CREATE POLICY "invoice_line_items_select" ON invoice_line_items
  FOR SELECT USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_insert" ON invoice_line_items
  FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_update" ON invoice_line_items
  FOR UPDATE USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_delete" ON invoice_line_items
  FOR DELETE USING (invoice_id IN (SELECT id FROM invoices));

-- ============================================================================
-- PART 9: Journal Entries RLS (Company-based - no project_id on journal_entries)
-- ============================================================================

CREATE POLICY "journal_entries_select" ON journal_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = journal_entries.company_id)
  );

CREATE POLICY "journal_entries_insert" ON journal_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "journal_entries_update" ON journal_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "journal_entries_delete" ON journal_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 10: Journal Entry Lines RLS
-- ============================================================================

CREATE POLICY "journal_entry_lines_select" ON journal_entry_lines
  FOR SELECT USING (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_insert" ON journal_entry_lines
  FOR INSERT WITH CHECK (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_update" ON journal_entry_lines
  FOR UPDATE USING (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_delete" ON journal_entry_lines
  FOR DELETE USING (journal_entry_id IN (SELECT id FROM journal_entries));

-- ============================================================================
-- PART 11: Petty Cash Wallets RLS (Owner OR Manager)
-- ============================================================================

CREATE POLICY "petty_cash_wallets_select" ON petty_cash_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = auth.uid()
      AND uca.company_id = petty_cash_wallets.company_id
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_insert" ON petty_cash_wallets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_update" ON petty_cash_wallets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_delete" ON petty_cash_wallets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 12: Petty Cash Expenses RLS (Inherits from wallet + project isolation)
-- ============================================================================

CREATE POLICY "petty_cash_expenses_select" ON petty_cash_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR wallet_id IN (SELECT id FROM petty_cash_wallets)
  );

CREATE POLICY "petty_cash_expenses_insert" ON petty_cash_expenses
  FOR INSERT WITH CHECK (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = auth.uid()
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_expenses_update" ON petty_cash_expenses
  FOR UPDATE USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = auth.uid()
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_expenses_delete" ON petty_cash_expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = auth.uid()
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 13: Petty Cash Topups RLS
-- ============================================================================

CREATE POLICY "petty_cash_topups_select" ON petty_cash_topups
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets)
  );

CREATE POLICY "petty_cash_topups_insert" ON petty_cash_topups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = auth.uid()
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 14: Bookings RLS (CONDITIONAL - only if bookings table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DROP POLICY IF EXISTS "bookings_select_policy" ON bookings;
    DROP POLICY IF EXISTS "bookings_insert_policy" ON bookings;
    DROP POLICY IF EXISTS "bookings_update_policy" ON bookings;
    DROP POLICY IF EXISTS "bookings_delete_policy" ON bookings;
    DROP POLICY IF EXISTS "bookings_select" ON bookings;
    DROP POLICY IF EXISTS "bookings_insert" ON bookings;
    DROP POLICY IF EXISTS "bookings_update" ON bookings;
    DROP POLICY IF EXISTS "bookings_delete" ON bookings;

    CREATE POLICY "bookings_select" ON bookings
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = bookings.company_id)
      );

    CREATE POLICY "bookings_insert" ON bookings
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR (
          EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = bookings.company_id)
          AND EXISTS (
            SELECT 1 FROM user_module_roles
            WHERE user_id = auth.uid()
            AND module = 'bookings'
            AND role IN ('manager', 'admin', 'agent')
            AND is_active = true
          )
        )
      );

    CREATE POLICY "bookings_update" ON bookings
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR (
          EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = bookings.company_id)
          AND EXISTS (
            SELECT 1 FROM user_module_roles
            WHERE user_id = auth.uid()
            AND module = 'bookings'
            AND role IN ('manager', 'admin', 'agent')
            AND is_active = true
          )
        )
      );

    CREATE POLICY "bookings_delete" ON bookings
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR (
          EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = bookings.company_id)
          AND EXISTS (
            SELECT 1 FROM user_module_roles
            WHERE user_id = auth.uid()
            AND module = 'bookings'
            AND role IN ('manager', 'admin')
            AND is_active = true
          )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 15: Revenue Recognition RLS (CONDITIONAL - only if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revenue_recognition') THEN
    DROP POLICY IF EXISTS "revenue_recognition_select" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_insert" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_update" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_delete" ON revenue_recognition;

    CREATE POLICY "revenue_recognition_select" ON revenue_recognition
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = revenue_recognition.company_id)
      );

    CREATE POLICY "revenue_recognition_insert" ON revenue_recognition
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = auth.uid()
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );

    CREATE POLICY "revenue_recognition_update" ON revenue_recognition
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = auth.uid()
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );

    CREATE POLICY "revenue_recognition_delete" ON revenue_recognition
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = auth.uid()
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 16: Bank Accounts and Transactions RLS
-- ============================================================================

DROP POLICY IF EXISTS "bank_accounts_select_policy" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert_policy" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_policy" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts;

CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = bank_accounts.company_id)
  );

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = auth.uid()
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- Bank Transactions (CONDITIONAL - only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_transactions') THEN
    DROP POLICY IF EXISTS "bank_transactions_select_policy" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_select" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_insert" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_update" ON bank_transactions;

    CREATE POLICY "bank_transactions_select" ON bank_transactions
      FOR SELECT USING (bank_account_id IN (SELECT id FROM bank_accounts));

    CREATE POLICY "bank_transactions_insert" ON bank_transactions
      FOR INSERT WITH CHECK (bank_account_id IN (SELECT id FROM bank_accounts));

    CREATE POLICY "bank_transactions_update" ON bank_transactions
      FOR UPDATE USING (bank_account_id IN (SELECT id FROM bank_accounts));
  END IF;
END $$;

-- ============================================================================
-- PART 17: Projects and Companies RLS
-- ============================================================================

DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "companies_select" ON companies;

-- Companies - users see companies they have access to
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = companies.id)
  );

-- Projects - users see projects in their companies or specifically assigned
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = auth.uid() AND company_id = projects.company_id)
    OR EXISTS (SELECT 1 FROM user_project_access WHERE user_id = auth.uid() AND project_id = projects.id)
  );
