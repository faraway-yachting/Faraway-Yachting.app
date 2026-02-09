-- Migration 103: Performance Optimization
-- 1. Restore super admin fast-path in user_has_company_access()
-- 2. Add missing indexes for RLS query patterns
-- 3. Backport InitPlan optimization: (select auth.uid()) for all migration 026 policies
-- 4. Fix child table RLS policies to properly filter by company access
-- All DROP/CREATE use IF EXISTS for idempotency.

-- ============================================================================
-- PART 1: Restore super admin fast-path + add missing indexes
-- ============================================================================

-- Restore super admin fast-path removed in migration 034
CREATE OR REPLACE FUNCTION user_has_company_access(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin has access to all companies (fast-path)
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN TRUE;
  END IF;

  -- Check user_company_access table
  RETURN EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
END;
$$;

-- Partial index for super admin lookups (used in 50+ RLS policies)
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_super_admin
  ON user_profiles(id) WHERE is_super_admin = true;

-- Composite index for the exact query pattern in user_has_company_access()
CREATE INDEX IF NOT EXISTS idx_user_company_access_user_company
  ON user_company_access(user_id, company_id);

-- ============================================================================
-- PART 2: Backport InitPlan optimization to user_profiles policies
-- IMPORTANT: user_profiles policies MUST use is_current_user_super_admin()
-- (SECURITY DEFINER function from migration 089) to avoid recursive RLS.
-- Direct EXISTS on user_profiles from its own policy causes infinite recursion.
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_super_admin" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_super_admin" ON user_profiles;

CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    id = (select auth.uid()) OR is_current_user_super_admin()
  );

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "user_profiles_insert_super_admin" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_current_user_super_admin());

CREATE POLICY "user_profiles_delete_super_admin" ON user_profiles
  FOR DELETE TO authenticated
  USING (is_current_user_super_admin());

-- ============================================================================
-- PART 3: Expenses - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = expenses.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 4: Expense Line Items - InitPlan + fix unfiltered parent subquery
-- Now properly filters through expenses table by company access
-- ============================================================================

DROP POLICY IF EXISTS "expense_line_items_select" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_insert" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_update" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_items_delete" ON expense_line_items;

CREATE POLICY "expense_line_items_select" ON expense_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_line_items.expense_id
      AND user_has_company_access((select auth.uid()), e.company_id)
    )
  );

CREATE POLICY "expense_line_items_insert" ON expense_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_line_items.expense_id
      AND user_has_company_access((select auth.uid()), e.company_id)
    )
  );

CREATE POLICY "expense_line_items_update" ON expense_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_line_items.expense_id
      AND user_has_company_access((select auth.uid()), e.company_id)
    )
  );

CREATE POLICY "expense_line_items_delete" ON expense_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_line_items.expense_id
      AND user_has_company_access((select auth.uid()), e.company_id)
    )
  );

-- ============================================================================
-- PART 5: Receipts - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert" ON receipts;
DROP POLICY IF EXISTS "receipts_update" ON receipts;
DROP POLICY IF EXISTS "receipts_delete" ON receipts;

CREATE POLICY "receipts_select" ON receipts
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
  );

CREATE POLICY "receipts_insert" ON receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_update" ON receipts
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "receipts_delete" ON receipts
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = receipts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 6: Receipt Line Items - InitPlan + fix unfiltered parent subquery
-- ============================================================================

DROP POLICY IF EXISTS "receipt_line_items_select" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_insert" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_update" ON receipt_line_items;
DROP POLICY IF EXISTS "receipt_line_items_delete" ON receipt_line_items;

CREATE POLICY "receipt_line_items_select" ON receipt_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts r
      WHERE r.id = receipt_line_items.receipt_id
      AND user_has_company_access((select auth.uid()), r.company_id)
    )
  );

CREATE POLICY "receipt_line_items_insert" ON receipt_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts r
      WHERE r.id = receipt_line_items.receipt_id
      AND user_has_company_access((select auth.uid()), r.company_id)
    )
  );

CREATE POLICY "receipt_line_items_update" ON receipt_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts r
      WHERE r.id = receipt_line_items.receipt_id
      AND user_has_company_access((select auth.uid()), r.company_id)
    )
  );

CREATE POLICY "receipt_line_items_delete" ON receipt_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts r
      WHERE r.id = receipt_line_items.receipt_id
      AND user_has_company_access((select auth.uid()), r.company_id)
    )
  );

-- ============================================================================
-- PART 7: Invoices - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = invoices.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 8: Invoice Line Items - InitPlan + fix unfiltered parent subquery
-- ============================================================================

DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;

CREATE POLICY "invoice_line_items_select" ON invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
      AND user_has_company_access((select auth.uid()), i.company_id)
    )
  );

CREATE POLICY "invoice_line_items_insert" ON invoice_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
      AND user_has_company_access((select auth.uid()), i.company_id)
    )
  );

CREATE POLICY "invoice_line_items_update" ON invoice_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
      AND user_has_company_access((select auth.uid()), i.company_id)
    )
  );

CREATE POLICY "invoice_line_items_delete" ON invoice_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
      AND user_has_company_access((select auth.uid()), i.company_id)
    )
  );

-- ============================================================================
-- PART 9: Journal Entries - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON journal_entries;

CREATE POLICY "journal_entries_select" ON journal_entries
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
  );

CREATE POLICY "journal_entries_insert" ON journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager', 'member')
    )
  );

CREATE POLICY "journal_entries_update" ON journal_entries
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "journal_entries_delete" ON journal_entries
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = journal_entries.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 10: Journal Entry Lines - InitPlan + fix unfiltered parent subquery
-- ============================================================================

DROP POLICY IF EXISTS "journal_entry_lines_select" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete" ON journal_entry_lines;

CREATE POLICY "journal_entry_lines_select" ON journal_entry_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND user_has_company_access((select auth.uid()), je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_insert" ON journal_entry_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND user_has_company_access((select auth.uid()), je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_update" ON journal_entry_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND user_has_company_access((select auth.uid()), je.company_id)
    )
  );

CREATE POLICY "journal_entry_lines_delete" ON journal_entry_lines
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND user_has_company_access((select auth.uid()), je.company_id)
    )
  );

-- ============================================================================
-- PART 11: Petty Cash Wallets - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_wallets_select" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_insert" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_update" ON petty_cash_wallets;
DROP POLICY IF EXISTS "petty_cash_wallets_delete" ON petty_cash_wallets;

CREATE POLICY "petty_cash_wallets_select" ON petty_cash_wallets
  FOR SELECT TO authenticated
  USING (
    is_current_user_super_admin()
    OR user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_company_access uca
      WHERE uca.user_id = (select auth.uid())
      AND uca.company_id = petty_cash_wallets.company_id
      AND uca.access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_insert" ON petty_cash_wallets
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_update" ON petty_cash_wallets
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "petty_cash_wallets_delete" ON petty_cash_wallets
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = petty_cash_wallets.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 12: Petty Cash Expenses - InitPlan + fix inheritance through wallet
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_expenses_select" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_insert" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_update" ON petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_delete" ON petty_cash_expenses;

CREATE POLICY "petty_cash_expenses_select" ON petty_cash_expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_expenses.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR user_has_company_access((select auth.uid()), pcw.company_id)
      )
    )
  );

CREATE POLICY "petty_cash_expenses_insert" ON petty_cash_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_expenses.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.company_id = pcw.company_id
          AND uca.access_type IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "petty_cash_expenses_update" ON petty_cash_expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_expenses.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.company_id = pcw.company_id
          AND uca.access_type IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "petty_cash_expenses_delete" ON petty_cash_expenses
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE pcw.id = petty_cash_expenses.wallet_id
      AND uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 13: Petty Cash Topups - InitPlan + fix inheritance through wallet
-- ============================================================================

DROP POLICY IF EXISTS "petty_cash_topups_select" ON petty_cash_topups;
DROP POLICY IF EXISTS "petty_cash_topups_insert" ON petty_cash_topups;

CREATE POLICY "petty_cash_topups_select" ON petty_cash_topups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      WHERE pcw.id = petty_cash_topups.wallet_id
      AND (
        pcw.user_id = (select auth.uid())
        OR user_has_company_access((select auth.uid()), pcw.company_id)
      )
    )
  );

CREATE POLICY "petty_cash_topups_insert" ON petty_cash_topups
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM petty_cash_wallets pcw
      JOIN user_company_access uca ON uca.company_id = pcw.company_id
      WHERE pcw.id = petty_cash_topups.wallet_id
      AND uca.user_id = (select auth.uid())
      AND uca.access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 14: Bookings - InitPlan optimization
-- Note: bookings has project_id, not company_id. Access goes through projects.
-- ============================================================================

DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "bookings_delete" ON bookings;

CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = bookings.project_id
      AND user_has_company_access((select auth.uid()), p.company_id)
    )
  );

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
  );

CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin', 'agent')
        AND is_active = true
      )
    )
  );

CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        JOIN user_company_access uca ON uca.company_id = p.company_id
        WHERE p.id = bookings.project_id
        AND uca.user_id = (select auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM user_module_roles
        WHERE user_id = (select auth.uid())
        AND module = 'bookings'
        AND role IN ('manager', 'admin')
        AND is_active = true
      )
    )
  );

-- ============================================================================
-- PART 15: Revenue Recognition - InitPlan optimization
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'revenue_recognition') THEN
    DROP POLICY IF EXISTS "revenue_recognition_select" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_insert" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_update" ON revenue_recognition;
    DROP POLICY IF EXISTS "revenue_recognition_delete" ON revenue_recognition;

    CREATE POLICY "revenue_recognition_select" ON revenue_recognition
      FOR SELECT TO authenticated
      USING (
        user_has_company_access((select auth.uid()), company_id)
      );

    CREATE POLICY "revenue_recognition_insert" ON revenue_recognition
      FOR INSERT TO authenticated
      WITH CHECK (
        is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );

    CREATE POLICY "revenue_recognition_update" ON revenue_recognition
      FOR UPDATE TO authenticated
      USING (
        is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );

    CREATE POLICY "revenue_recognition_delete" ON revenue_recognition
      FOR DELETE TO authenticated
      USING (
        is_current_user_super_admin()
        OR EXISTS (
          SELECT 1 FROM user_company_access
          WHERE user_id = (select auth.uid())
          AND company_id = revenue_recognition.company_id
          AND access_type IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 16: Bank Accounts - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts;

CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
  );

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE TO authenticated
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_id = (select auth.uid())
      AND company_id = bank_accounts.company_id
      AND access_type IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 17: Bank Transactions - InitPlan + fix unfiltered parent subquery
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_transactions') THEN
    DROP POLICY IF EXISTS "bank_transactions_select" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_insert" ON bank_transactions;
    DROP POLICY IF EXISTS "bank_transactions_update" ON bank_transactions;

    CREATE POLICY "bank_transactions_select" ON bank_transactions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bank_accounts ba
          WHERE ba.id = bank_transactions.bank_account_id
          AND user_has_company_access((select auth.uid()), ba.company_id)
        )
      );

    CREATE POLICY "bank_transactions_insert" ON bank_transactions
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bank_accounts ba
          WHERE ba.id = bank_transactions.bank_account_id
          AND user_has_company_access((select auth.uid()), ba.company_id)
        )
      );

    CREATE POLICY "bank_transactions_update" ON bank_transactions
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM bank_accounts ba
          WHERE ba.id = bank_transactions.bank_account_id
          AND user_has_company_access((select auth.uid()), ba.company_id)
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 18: Companies and Projects - InitPlan optimization
-- ============================================================================

DROP POLICY IF EXISTS "companies_select" ON companies;

CREATE POLICY "companies_select" ON companies
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), id)
  );

DROP POLICY IF EXISTS "projects_select" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated
  USING (
    user_has_company_access((select auth.uid()), company_id)
    OR EXISTS (SELECT 1 FROM user_project_access WHERE user_id = (select auth.uid()) AND project_id = projects.id)
  );
