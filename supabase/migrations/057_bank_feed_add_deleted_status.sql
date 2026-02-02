-- Add 'deleted' to bank_feed_lines status CHECK constraint for soft-delete support

ALTER TABLE bank_feed_lines DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE bank_feed_lines ADD CONSTRAINT valid_status
  CHECK (status IN ('missing_record', 'matched', 'partially_matched', 'needs_review', 'ignored', 'unmatched', 'deleted'));
