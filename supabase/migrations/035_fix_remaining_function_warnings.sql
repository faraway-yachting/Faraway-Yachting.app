-- Migration 035: Fix remaining Function Search Path Mutable warnings
-- Fixes the 2 remaining functions that weren't properly updated

-- ============================================================================
-- 1. Fix create_journals_atomic (original signature with 2 parameters)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_journals_atomic(
  p_event_id UUID,
  p_journals JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journal_ids UUID[] := ARRAY[]::UUID[];
  v_journal JSONB;
  v_journal_id UUID;
  v_line JSONB;
  v_line_order INTEGER;
BEGIN
  -- Loop through each journal specification
  FOR v_journal IN SELECT * FROM jsonb_array_elements(p_journals)
  LOOP
    -- Insert the journal entry header
    INSERT INTO journal_entries (
      reference_number,
      entry_date,
      company_id,
      description,
      status,
      total_debit,
      total_credit,
      created_by,
      source_document_type,
      source_document_id,
      is_auto_generated
    )
    VALUES (
      v_journal->>'reference_number',
      (v_journal->>'entry_date')::DATE,
      (v_journal->>'company_id')::UUID,
      v_journal->>'description',
      COALESCE(v_journal->>'status', 'draft'),
      COALESCE((v_journal->>'total_debit')::DECIMAL, 0),
      COALESCE((v_journal->>'total_credit')::DECIMAL, 0),
      (v_journal->>'created_by')::UUID,
      v_journal->>'source_document_type',
      (v_journal->>'source_document_id')::UUID,
      COALESCE((v_journal->>'is_auto_generated')::BOOLEAN, true)
    )
    RETURNING id INTO v_journal_id;

    -- Append to result array
    v_journal_ids := array_append(v_journal_ids, v_journal_id);

    -- Insert journal entry lines
    v_line_order := 1;
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_journal->'lines')
    LOOP
      INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_code,
        entry_type,
        amount,
        description,
        line_order
      )
      VALUES (
        v_journal_id,
        v_line->>'account_code',
        v_line->>'entry_type',
        (v_line->>'amount')::DECIMAL,
        v_line->>'description',
        v_line_order
      );
      v_line_order := v_line_order + 1;
    END LOOP;

    -- Link event to this journal entry
    INSERT INTO event_journal_entries (
      event_id,
      journal_entry_id,
      company_id
    )
    VALUES (
      p_event_id,
      v_journal_id,
      (v_journal->>'company_id')::UUID
    );
  END LOOP;

  -- Return the created journal IDs
  RETURN jsonb_build_object(
    'success', true,
    'journal_ids', to_jsonb(v_journal_ids)
  );
EXCEPTION WHEN OTHERS THEN
  -- Any error causes automatic rollback of all inserts
  RAISE EXCEPTION 'Failed to create journals atomically: %', SQLERRM;
END;
$$;

-- ============================================================================
-- 2. Fix get_user_role function
-- ============================================================================

-- Drop the function first to ensure clean replacement
DROP FUNCTION IF EXISTS get_user_role(UUID, TEXT);

CREATE FUNCTION get_user_role(p_user_id UUID, p_module TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM user_module_roles
  WHERE user_id = p_user_id
    AND module = p_module
    AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- ============================================================================
-- 3. Drop the incorrect single-parameter create_journals_atomic if it exists
-- ============================================================================

DROP FUNCTION IF EXISTS create_journals_atomic(JSONB);
