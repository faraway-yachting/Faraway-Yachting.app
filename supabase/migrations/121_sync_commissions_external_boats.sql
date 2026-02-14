-- Include external boat bookings in commission sync
-- External boats: net_income = charter_fee - charter_cost (profit margin)
-- Management fee = charter_cost (the boat owner cost acts as the "fee" deducted)

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
  -- 1a. Insert new commission records for OWNED YACHT bookings
  WITH new_owned AS (
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
  SELECT COUNT(*) INTO v_created FROM new_owned;

  -- 1b. Insert new commission records for EXTERNAL BOAT bookings
  --     For external boats: management_fee = charter_cost, net_income = charter_fee - charter_cost
  WITH new_external AS (
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
      NULL,
      b.date_from,
      b.date_to,
      b.type,
      b.type,
      COALESCE(b.charter_fee, b.total_price, 0),
      COALESCE(b.charter_cost, 0),
      COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.charter_cost, 0),
      COALESCE(b.commission_rate, 0),
      ROUND(
        (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.charter_cost, 0))
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      COALESCE(b.sales_owner_id, b.booking_owner),
      COALESCE(b.currency, 'THB'),
      false
    FROM bookings b
    WHERE b.status IN ('booked', 'completed')
      AND b.project_id IS NULL
      AND b.external_boat_name IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM commission_records cr WHERE cr.booking_id = b.id
      )
    RETURNING id
  )
  SELECT v_created + COUNT(*) INTO v_created FROM new_external;

  -- 2. Update existing records where management_fee is NOT overridden
  --    Handles both owned yachts and external boats
  WITH updated_normal AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = COALESCE(b.charter_fee, b.total_price, 0),
      management_fee = CASE
        WHEN b.project_id IS NOT NULL THEN
          ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2)
        ELSE
          COALESCE(b.charter_cost, 0)
      END,
      net_income = CASE
        WHEN b.project_id IS NOT NULL THEN
          COALESCE(b.charter_fee, b.total_price, 0)
            - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2)
        ELSE
          COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.charter_cost, 0)
      END,
      commission_rate = COALESCE(b.commission_rate, 0),
      total_commission = ROUND(
        CASE
          WHEN b.project_id IS NOT NULL THEN
            (COALESCE(b.charter_fee, b.total_price, 0)
              - ROUND(COALESCE(b.charter_fee, b.total_price, 0) * COALESCE(p.management_fee_percentage, 0) / 100, 2))
          ELSE
            (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.charter_cost, 0))
        END
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
