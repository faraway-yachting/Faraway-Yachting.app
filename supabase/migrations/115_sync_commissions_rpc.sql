-- ============================================================================
-- Server-side commission sync from bookings
-- Replaces the client-side N+1 loop (one HTTP request per booking) with
-- a single RPC call that uses set-based SQL.
-- ============================================================================

-- Fix: booking_owner_id stores employee IDs (from bookings.sales_owner_id)
-- but had a FK to auth.users(id). Drop the incorrect constraint.
ALTER TABLE commission_records DROP CONSTRAINT IF EXISTS commission_records_booking_owner_id_fkey;

CREATE OR REPLACE FUNCTION sync_commissions_from_bookings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created INT;
  v_updated INT;
BEGIN
  -- 1. Insert new commission records for bookings that don't have one yet
  WITH new_records AS (
    INSERT INTO commission_records (
      booking_id, source, boat_id,
      charter_date_from, charter_date_to, charter_type, booking_type,
      charter_fee, management_fee, net_income,
      commission_rate, total_commission,
      booking_owner_id, currency, management_fee_overridden
    )
    SELECT
      b.id,
      'booking',
      b.project_id,
      b.date_from,
      b.date_to,
      b.type,
      b.type,
      COALESCE(b.charter_fee, b.total_price, 0),
      ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2),
      COALESCE(b.charter_fee, b.total_price, 0)
        - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2),
      COALESCE(b.commission_rate, 0),
      ROUND(
        (COALESCE(b.charter_fee, b.total_price, 0)
          - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2))
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      COALESCE(b.sales_owner_id, b.booking_owner),
      COALESCE(b.currency, 'THB'),
      false
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.status IN ('booked', 'completed')
      AND b.project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM commission_records cr WHERE cr.booking_id = b.id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_created FROM new_records;

  -- 2. Update existing records where management_fee is NOT overridden
  WITH updated_normal AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = COALESCE(b.charter_fee, b.total_price, 0),
      management_fee = ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2),
      net_income = COALESCE(b.charter_fee, b.total_price, 0)
        - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2),
      commission_rate = COALESCE(b.commission_rate, 0),
      total_commission = ROUND(
        (COALESCE(b.charter_fee, b.total_price, 0)
          - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2))
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = COALESCE(b.currency, 'THB'),
      updated_at = NOW()
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE cr.booking_id = b.id
      AND b.status IN ('booked', 'completed')
      AND NOT cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated_normal;

  -- 3. Update existing records where management_fee IS overridden
  --    (preserve management_fee, recalculate net_income and total_commission)
  WITH updated_overridden AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = COALESCE(b.charter_fee, b.total_price, 0),
      commission_rate = COALESCE(b.commission_rate, 0),
      net_income = COALESCE(b.charter_fee, b.total_price, 0) - cr.management_fee,
      total_commission = ROUND(
        (COALESCE(b.charter_fee, b.total_price, 0) - cr.management_fee)
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = COALESCE(b.currency, 'THB'),
      updated_at = NOW()
    FROM bookings b
    WHERE cr.booking_id = b.id
      AND b.status IN ('booked', 'completed')
      AND cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM updated_overridden;

  RETURN json_build_object('created', v_created, 'updated', v_updated);
END;
$$;
