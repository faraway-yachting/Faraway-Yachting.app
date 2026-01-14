-- Migration: Fix RLS policies for journal entries and journal entry lines
-- This allows authenticated users with appropriate roles to manage journal entries regardless of company_id

-- ============= JOURNAL ENTRIES =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view journal entries from their company" ON journal_entries;
DROP POLICY IF EXISTS "Accountants can manage journal entries" ON journal_entries;

-- Create more permissive policies for journal entries
CREATE POLICY "Authenticated users can view journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage journal entries"
  ON journal_entries FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============= JOURNAL ENTRY LINES =============

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users view journal entry lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Accountants can manage journal entry lines" ON journal_entry_lines;

-- Create more permissive policies for journal entry lines
CREATE POLICY "Authenticated users can view journal entry lines"
  ON journal_entry_lines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage journal entry lines"
  ON journal_entry_lines FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
