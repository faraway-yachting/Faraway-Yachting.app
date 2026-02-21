-- Allow 'deleted' status for soft-delete of journal entries (used by void operations)
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_status_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_status_check
  CHECK (status IN ('draft', 'posted', 'deleted'));
