-- Migration 086: Fix RLS Policy Performance Issues
-- Problem: Using auth.uid() directly causes per-row re-evaluation
-- Solution: Wrap in subquery (select auth.uid()) for single evaluation per query
--
-- This is a critical performance fix that can improve query performance by 10-100x
-- on tables with many rows.

-- ============================================================================
-- PART 1: User Profiles RLS (Most Critical - queried on every request)
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;

CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (
    id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (select auth.uid()) AND up.is_super_admin = true
    )
  );

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 2: User Module Roles RLS (Queried on every page load)
-- ============================================================================

DROP POLICY IF EXISTS "user_module_roles_select" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_insert" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_update" ON user_module_roles;
DROP POLICY IF EXISTS "user_module_roles_delete" ON user_module_roles;
DROP POLICY IF EXISTS "Users can view their own module roles" ON user_module_roles;
DROP POLICY IF EXISTS "Admins can manage all module roles" ON user_module_roles;

CREATE POLICY "user_module_roles_select" ON user_module_roles
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_insert" ON user_module_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_update" ON user_module_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_module_roles_delete" ON user_module_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 3: User Company Access RLS
-- ============================================================================

DROP POLICY IF EXISTS "user_company_access_select" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_insert" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_update" ON user_company_access;
DROP POLICY IF EXISTS "user_company_access_delete" ON user_company_access;

CREATE POLICY "user_company_access_select" ON user_company_access
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_insert" ON user_company_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_update" ON user_company_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_company_access_delete" ON user_company_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 4: User Project Access RLS
-- ============================================================================

DROP POLICY IF EXISTS "user_project_access_select" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_insert" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_update" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_delete" ON user_project_access;

CREATE POLICY "user_project_access_select" ON user_project_access
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_insert" ON user_project_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_update" ON user_project_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

CREATE POLICY "user_project_access_delete" ON user_project_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_super_admin = true
    )
  );

-- ============================================================================
-- PART 5: Expenses RLS
-- ============================================================================

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = expenses.company_id)
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 6: Expense Line Items RLS
-- ============================================================================

DROP POLICY IF EXISTS "expense_line_items_select" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_delete" ON expense_line_items;

CREATE POLICY "expense_line_items_select" ON expense_line_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
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
-- PART 7: Receipts RLS
-- ============================================================================

DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
DROP POLICY IF EXISTS "receipts_update" ON receipts;
DROP POLICY IF EXISTS "receipts_delete" ON receipts;

CREATE POLICY "receipts_select" ON receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = receipts.company_id)
  );

CREATE POLICY "receipts_insert" ON receipts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_update" ON receipts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_delete" ON receipts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 8: Invoices RLS
-- ============================================================================

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = invoices.company_id)
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 9: Journal Entries RLS (Heavy table - often queried)
-- ============================================================================

DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON journal_entries;

CREATE POLICY "journal_entries_select" ON journal_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = journal_entries.company_id)
  );

CREATE POLICY "journal_entries_insert" ON journal_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "journal_entries_update" ON journal_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "journal_entries_delete" ON journal_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 10: Journal Entry Lines RLS
-- ============================================================================

DROP POLICY IF EXISTS "journal_entry_lines_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete" ON journal_entry_lines;

CREATE POLICY "journal_entry_lines_select" ON journal_entry_lines
  FOR SELECT USING (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_insert" ON journal_entry_lines
  FOR INSERT WITH CHECK (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_update" ON journal_entry_lines
  FOR UPDATE USING (journal_entry_id IN (SELECT id FROM journal_entries));

CREATE POLICY "journal_entry_lines_delete" ON journal_entry_lines
  FOR DELETE USING (journal_entry_id IN (SELECT id FROM journal_entries));

-- ============================================================================
-- PART 11: Petty Cash Wallets RLS
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_wallets_select" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_insert" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_update" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_delete" ON petty_cash_wallets;

CREATE POLICY "petty_cash_wallets_select" ON petty_cash_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = (select auth.uid())
      AND uca.company_id = petty_cash_wallets.company_id
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_insert" ON petty_cash_wallets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_update" ON petty_cash_wallets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_delete" ON petty_cash_wallets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 12: Petty Cash Expenses RLS
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_expenses_select" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_insert" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_update" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_delete" ON petty_cash_expenses;

CREATE POLICY "petty_cash_expenses_select" ON petty_cash_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR wallet_id IN (SELECT id FROM petty_cash_wallets)
  );

CREATE POLICY "petty_cash_expenses_insert" ON petty_cash_expenses
  FOR INSERT WITH CHECK (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_expenses_update" ON petty_cash_expenses
  FOR UPDATE USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets WHERE user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_expenses_delete" ON petty_cash_expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 13: Petty Cash Topups RLS
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_topups_select" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_insert" ON petty_cash_topups;

CREATE POLICY "petty_cash_topups_select" ON petty_cash_topups
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM petty_cash_wallets)
  );

CREATE POLICY "petty_cash_topups_insert" ON petty_cash_topups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR wallet_id IN (
      SELECT pcw.id FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 14: Bank Accounts RLS
-- ============================================================================

DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts;

CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = bank_accounts.company_id)
  );

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 15: Companies RLS
-- ============================================================================

DROP POLICY IF EXISTS "companies_select" ON companies;

CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = companies.id)
  );

-- ============================================================================
-- PART 16: Projects RLS
-- ============================================================================

DROP POLICY IF EXISTS "projects_select" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = projects.company_id)
    OR EXISTS (SELECT 1 FROM user_project_access WHERE user_id = (select auth.uid()) AND project_id = projects.id)
  );

-- ============================================================================
-- PART 17: Contacts RLS (Global table - no company_id, all authenticated users can access)
-- ============================================================================

-- Contacts table doesn't have company_id - it's a global table
-- Keep existing simple policies but optimize auth.uid() calls
DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can manage contacts" ON contacts;

CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PART 18: Bookings RLS (if table exists)
-- Bookings table doesn't have company_id - uses simple authenticated user policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DROP POLICY IF EXISTS "bookings_select" ON bookings;
    DROP POLICY IF EXISTS "bookings_insert" ON bookings;
    DROP POLICY IF EXISTS "bookings_update" ON bookings;
    DROP POLICY IF EXISTS "bookings_delete" ON bookings;

    -- Simple authenticated user policies (same as before, just optimized auth.uid())
    EXECUTE 'CREATE POLICY "bookings_select" ON bookings
      FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "bookings_insert" ON bookings
      FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "bookings_update" ON bookings
      FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL)
      WITH CHECK ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "bookings_delete" ON bookings
      FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL)';
  END IF;
END $$;

-- ============================================================================
-- PART 19: Commission Records RLS (if table exists)
-- Commission records table doesn't have company_id - uses simple authenticated user policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commission_records') THEN
    DROP POLICY IF EXISTS "commission_records_select" ON commission_records;
    DROP POLICY IF EXISTS "commission_records_insert" ON commission_records;
    DROP POLICY IF EXISTS "commission_records_update" ON commission_records;
    DROP POLICY IF EXISTS "commission_records_delete" ON commission_records;
    DROP POLICY IF EXISTS "Authenticated users can manage commission_records" ON commission_records;

    -- Simple authenticated user policies (same as before, just optimized auth.uid())
    EXECUTE 'CREATE POLICY "commission_records_select" ON commission_records
      FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "commission_records_insert" ON commission_records
      FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "commission_records_update" ON commission_records
      FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL)';

    EXECUTE 'CREATE POLICY "commission_records_delete" ON commission_records
      FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL)';
  END IF;
END $$;

-- ============================================================================
-- PART 20: Revenue Recognition RLS (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revenue_recognition') THEN
    DROP POLICY IF EXISTS "revenue_recognition_select" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_insert" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_update" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_delete" ON revenue_recognition;

    EXECUTE 'CREATE POLICY "revenue_recognition_select" ON revenue_recognition
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
        OR EXISTS (SELECT 1 FROM user_company_access WHERE user_id = (select auth.uid()) AND company_id = revenue_recognition.company_id)
      )';

    EXECUTE 'CREATE POLICY "revenue_recognition_insert" ON revenue_recognition
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN (''admin'', ''manager'')
        )
      )';

    EXECUTE 'CREATE POLICY "revenue_recognition_update" ON revenue_recognition
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN (''admin'', ''manager'')
        )
      )';

    EXECUTE 'CREATE POLICY "revenue_recognition_delete" ON revenue_recognition
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_super_admin = true)
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN (''admin'', ''manager'')
        )
      )';
  END IF;
END $$;

-- ============================================================================
-- PART 21: Bank Transactions RLS (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_transactions') THEN
    DROP POLICY IF EXISTS "bank_transactions_select" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_insert" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_update" ON bank_transactions;

    EXECUTE 'CREATE POLICY "bank_transactions_select" ON bank_transactions
      FOR SELECT USING (bank_account_id IN (SELECT id FROM bank_accounts))';

    EXECUTE 'CREATE POLICY "bank_transactions_insert" ON bank_transactions
      FOR INSERT WITH CHECK (bank_account_id IN (SELECT id FROM bank_accounts))';

    EXECUTE 'CREATE POLICY "bank_transactions_update" ON bank_transactions
      FOR UPDATE USING (bank_account_id IN (SELECT id FROM bank_accounts))';
  END IF;
END $$;

-- ============================================================================
-- PART 22: Receipt Line Items RLS
-- ============================================================================

DROP POLICY IF EXISTS "receipt_line_items_select" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_insert" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_update" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_delete" ON receipt_line_items;

CREATE POLICY "receipt_line_items_select" ON receipt_line_items
  FOR SELECT USING (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_insert" ON receipt_line_items
  FOR INSERT WITH CHECK (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_update" ON receipt_line_items
  FOR UPDATE USING (receipt_id IN (SELECT id FROM receipts));

CREATE POLICY "receipt_line_items_delete" ON receipt_line_items
  FOR DELETE USING (receipt_id IN (SELECT id FROM receipts));

-- ============================================================================
-- PART 23: Invoice Line Items RLS
-- ============================================================================

DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;

CREATE POLICY "invoice_line_items_select" ON invoice_line_items
  FOR SELECT USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_insert" ON invoice_line_items
  FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_update" ON invoice_line_items
  FOR UPDATE USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "invoice_line_items_delete" ON invoice_line_items
  FOR DELETE USING (invoice_id IN (SELECT id FROM invoices));

-- ============================================================================
-- Done! This migration fixes the auth.uid() re-evaluation performance issue.
-- Performance improvement: auth.uid() is now evaluated once per query instead
-- of once per row, which can be a 10-100x improvement on large tables.
-- ============================================================================
