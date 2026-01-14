-- Migration: Atomic Journal Creation Function
-- Description: RPC function for creating multiple journals atomically (all or nothing)
-- Created: 2026-01-10

-- ============================================================================
-- Atomic Journal Creation Function
-- ============================================================================

-- This function creates multiple journal entries atomically.
-- If any journal fails to create, all are rolled back.
-- Used by the event processor for multi-company events.

CREATE OR REPLACE FUNCTION create_journals_atomic(
  p_event_id UUID,
  p_journals JSONB
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_journals_atomic(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_journals_atomic IS 'Atomically creates multiple journal entries with their lines and links them to an accounting event. If any journal fails, all are rolled back.';

-- ============================================================================
-- Event Immutability - Prevent modification of processed events
-- ============================================================================

-- Create a trigger to prevent modification of processed events
CREATE OR REPLACE FUNCTION prevent_processed_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status changes (for retry/cancel)
  IF OLD.status = 'processed' AND
     NEW.event_data IS DISTINCT FROM OLD.event_data THEN
    RAISE EXCEPTION 'Cannot modify event_data of a processed event';
  END IF;

  -- Allow certain updates for retry/cancel operations
  IF OLD.status = 'processed' AND
     NEW.status NOT IN ('cancelled') AND
     NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change status of a processed event (except to cancelled)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS prevent_processed_event_modification_trigger ON accounting_events;
CREATE TRIGGER prevent_processed_event_modification_trigger
  BEFORE UPDATE ON accounting_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_processed_event_modification();

COMMENT ON FUNCTION prevent_processed_event_modification IS 'Prevents modification of event_data after an event has been processed, ensuring audit trail integrity';
