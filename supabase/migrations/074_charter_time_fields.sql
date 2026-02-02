-- ============================================================================
-- 074: Charter start/end time fields for bonus calculation
-- ============================================================================

ALTER TABLE bookings ADD COLUMN charter_start_time TEXT;
ALTER TABLE bookings ADD COLUMN charter_end_time TEXT;
