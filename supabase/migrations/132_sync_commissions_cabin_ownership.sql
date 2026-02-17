-- Rewrite commission sync RPC to:
-- 1. Support cabin charter bookings (one commission record per cabin allocation)
-- 2. Factor ownership percentage into commission calculation
--
-- New formula:
--   effective_fee   = charter_fee - agency_commission_thb
--   management_fee  = effective_fee * management_fee_% / 100
--   net_income      = effective_fee - management_fee
--   commission_base = management_fee + (net_income * ownership_% / 100)
--   total_commission = commission_base * commission_rate / 100

CREATE OR REPLACE FUNCTION sync_commissions_from_bookings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created INT := 0;
  v_updated INT := 0;
  v_cleaned INT := 0;
  v_cnt INT;
BEGIN

  -- ================================================================
  -- 1a. INSERT new records for OWNED YACHT bookings (non-cabin)
  -- ================================================================
  WITH new_owned AS (
    INSERT INTO commission_records (
      booking_id, cabin_allocation_id, source, boat_id,
      charter_date_from, charter_date_to, charter_type, booking_type,
      charter_fee, management_fee, net_income,
      ownership_percentage, commission_base,
      commission_rate, total_commission,
      booking_owner_id, currency, management_fee_overridden
    )
    SELECT
      b.id,
      NULL,
      'booking',
      b.project_id,
      b.date_from,
      b.date_to,
      b.type,
      b.type,
      calc.cf,
      calc.mf,
      calc.ni,
      COALESCE(p.management_ownership_percentage, 100),
      calc.cb,
      COALESCE(b.commission_rate, 0),
      ROUND(calc.cb * COALESCE(b.commission_rate, 0) / 100, 2),
      COALESCE(b.sales_owner_id, b.booking_owner),
      COALESCE(b.currency, 'THB'),
      false
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(b.charter_fee, b.total_price, 0) AS cf,
        COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0) AS eff,
        ROUND(
          (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
          * COALESCE(p.management_fee_percentage, 0) / 100, 2
        ) AS mf,
        (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
          - ROUND(
              (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
              * COALESCE(p.management_fee_percentage, 0) / 100, 2
            ) AS ni,
        -- commission_base = mf + ni * ownership / 100
        ROUND(
          ROUND(
            (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
            * COALESCE(p.management_fee_percentage, 0) / 100, 2
          )
          + (
            (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
            - ROUND(
                (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
                * COALESCE(p.management_fee_percentage, 0) / 100, 2
              )
          ) * COALESCE(p.management_ownership_percentage, 100) / 100
        , 2) AS cb
    ) calc
    WHERE b.status IN ('booked', 'completed')
      AND b.project_id IS NOT NULL
      AND b.type != 'cabin_charter'
      AND NOT EXISTS (
        SELECT 1 FROM commission_records cr
        WHERE cr.booking_id = b.id AND cr.cabin_allocation_id IS NULL
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_created FROM new_owned;

  -- ================================================================
  -- 1b. INSERT new records for CABIN CHARTER allocations
  -- ================================================================
  WITH new_cabin AS (
    INSERT INTO commission_records (
      booking_id, cabin_allocation_id, source, boat_id,
      charter_date_from, charter_date_to, charter_type, booking_type,
      charter_fee, management_fee, net_income,
      ownership_percentage, commission_base,
      commission_rate, total_commission,
      booking_owner_id, currency, management_fee_overridden
    )
    SELECT
      b.id,
      ca.id,
      'booking',
      b.project_id,
      b.date_from,
      b.date_to,
      b.type,
      b.type,
      calc.cf,
      calc.mf,
      calc.ni,
      COALESCE(p.management_ownership_percentage, 100),
      calc.cb,
      COALESCE(ca.commission_rate, 0),
      ROUND(calc.cb * COALESCE(ca.commission_rate, 0) / 100, 2),
      -- cabin_allocations.booking_owner is TEXT; cast safely to UUID
      CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      COALESCE(ca.currency, b.currency, 'THB'),
      false
    FROM bookings b
    JOIN cabin_allocations ca ON ca.booking_id = b.id
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(ca.charter_fee, 0) AS cf,
        COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0) AS eff,
        ROUND(
          (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
          * COALESCE(p.management_fee_percentage, 0) / 100, 2
        ) AS mf,
        (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
          - ROUND(
              (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
              * COALESCE(p.management_fee_percentage, 0) / 100, 2
            ) AS ni,
        ROUND(
          ROUND(
            (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
            * COALESCE(p.management_fee_percentage, 0) / 100, 2
          )
          + (
            (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
            - ROUND(
                (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
                * COALESCE(p.management_fee_percentage, 0) / 100, 2
              )
          ) * COALESCE(p.management_ownership_percentage, 100) / 100
        , 2) AS cb
    ) calc
    WHERE b.status IN ('booked', 'completed')
      AND b.type = 'cabin_charter'
      AND b.project_id IS NOT NULL
      AND ca.status = 'booked'
      AND COALESCE(ca.charter_fee, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM commission_records cr
        WHERE cr.booking_id = b.id AND cr.cabin_allocation_id = ca.id
      )
    RETURNING id
  )
  SELECT v_created + COUNT(*) INTO v_created FROM new_cabin;

  -- ================================================================
  -- 1c. INSERT new records for EXTERNAL BOAT bookings (no ownership split)
  -- ================================================================
  WITH new_external AS (
    INSERT INTO commission_records (
      booking_id, cabin_allocation_id, source, boat_id,
      charter_date_from, charter_date_to, charter_type, booking_type,
      charter_fee, management_fee, net_income,
      ownership_percentage, commission_base,
      commission_rate, total_commission,
      booking_owner_id, currency, management_fee_overridden
    )
    SELECT
      b.id,
      NULL,
      'booking',
      NULL,
      b.date_from,
      b.date_to,
      b.type,
      b.type,
      COALESCE(b.charter_fee, b.total_price, 0),
      COALESCE(b.charter_cost, 0),
      (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0),
      100,
      (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0),
      COALESCE(b.commission_rate, 0),
      ROUND(
        ((COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0))
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
        SELECT 1 FROM commission_records cr
        WHERE cr.booking_id = b.id AND cr.cabin_allocation_id IS NULL
      )
    RETURNING id
  )
  SELECT v_created + COUNT(*) INTO v_created FROM new_external;

  -- ================================================================
  -- 2a. UPDATE existing NON-CABIN, NON-OVERRIDDEN records
  -- ================================================================
  WITH updated_owned AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = calc.cf,
      management_fee = CASE
        WHEN b.project_id IS NOT NULL THEN calc.mf
        ELSE COALESCE(b.charter_cost, 0)
      END,
      net_income = CASE
        WHEN b.project_id IS NOT NULL THEN calc.ni
        ELSE (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0)
      END,
      ownership_percentage = CASE
        WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100)
        ELSE 100
      END,
      commission_base = CASE
        WHEN b.project_id IS NOT NULL THEN calc.cb
        ELSE (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0)
      END,
      commission_rate = COALESCE(b.commission_rate, 0),
      total_commission = ROUND(
        CASE
          WHEN b.project_id IS NOT NULL THEN calc.cb
          ELSE (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - COALESCE(b.charter_cost, 0)
        END
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = COALESCE(b.currency, 'THB'),
      updated_at = NOW()
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(b.charter_fee, b.total_price, 0) AS cf,
        COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0) AS eff,
        ROUND(
          (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
          * COALESCE(p.management_fee_percentage, 0) / 100, 2
        ) AS mf,
        (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
          - ROUND(
              (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
              * COALESCE(p.management_fee_percentage, 0) / 100, 2
            ) AS ni,
        ROUND(
          ROUND(
            (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
            * COALESCE(p.management_fee_percentage, 0) / 100, 2
          )
          + (
            (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
            - ROUND(
                (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0))
                * COALESCE(p.management_fee_percentage, 0) / 100, 2
              )
          ) * COALESCE(p.management_ownership_percentage, 100) / 100
        , 2) AS cb
    ) calc
    WHERE cr.booking_id = b.id
      AND cr.cabin_allocation_id IS NULL
      AND b.status IN ('booked', 'completed')
      AND NOT cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated_owned;

  -- ================================================================
  -- 2b. UPDATE existing NON-CABIN, OVERRIDDEN management fee records
  -- ================================================================
  WITH updated_overridden AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = COALESCE(b.charter_fee, b.total_price, 0),
      commission_rate = COALESCE(b.commission_rate, 0),
      -- Keep overridden management_fee, recalculate everything else
      net_income = (COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - cr.management_fee,
      ownership_percentage = CASE
        WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100)
        ELSE 100
      END,
      commission_base = ROUND(
        cr.management_fee
        + ((COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - cr.management_fee)
          * CASE WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100) ELSE 100 END / 100
      , 2),
      total_commission = ROUND(
        (cr.management_fee
          + ((COALESCE(b.charter_fee, b.total_price, 0) - COALESCE(b.agency_commission_thb, 0)) - cr.management_fee)
            * CASE WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100) ELSE 100 END / 100)
        * COALESCE(b.commission_rate, 0) / 100,
      2),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = COALESCE(b.currency, 'THB'),
      updated_at = NOW()
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE cr.booking_id = b.id
      AND cr.cabin_allocation_id IS NULL
      AND b.status IN ('booked', 'completed')
      AND cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM updated_overridden;

  -- ================================================================
  -- 2c. UPDATE existing CABIN ALLOCATION records (non-overridden)
  -- ================================================================
  WITH updated_cabin AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = calc.cf,
      management_fee = calc.mf,
      net_income = calc.ni,
      ownership_percentage = COALESCE(p.management_ownership_percentage, 100),
      commission_base = calc.cb,
      commission_rate = COALESCE(ca.commission_rate, 0),
      total_commission = ROUND(calc.cb * COALESCE(ca.commission_rate, 0) / 100, 2),
      booking_owner_id = CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      currency = COALESCE(ca.currency, b.currency, 'THB'),
      updated_at = NOW()
    FROM cabin_allocations ca
    JOIN bookings b ON b.id = ca.booking_id
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(ca.charter_fee, 0) AS cf,
        COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0) AS eff,
        ROUND(
          (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
          * COALESCE(p.management_fee_percentage, 0) / 100, 2
        ) AS mf,
        (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
          - ROUND(
              (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
              * COALESCE(p.management_fee_percentage, 0) / 100, 2
            ) AS ni,
        ROUND(
          ROUND(
            (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
            * COALESCE(p.management_fee_percentage, 0) / 100, 2
          )
          + (
            (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
            - ROUND(
                (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0))
                * COALESCE(p.management_fee_percentage, 0) / 100, 2
              )
          ) * COALESCE(p.management_ownership_percentage, 100) / 100
        , 2) AS cb
    ) calc
    WHERE cr.cabin_allocation_id = ca.id
      AND b.status IN ('booked', 'completed')
      AND NOT cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM updated_cabin;

  -- ================================================================
  -- 2d. UPDATE existing CABIN ALLOCATION records (overridden mgmt fee)
  -- ================================================================
  WITH updated_cabin_overridden AS (
    UPDATE commission_records cr SET
      boat_id = b.project_id,
      charter_date_from = b.date_from,
      charter_date_to = b.date_to,
      charter_type = b.type,
      booking_type = b.type,
      charter_fee = COALESCE(ca.charter_fee, 0),
      commission_rate = COALESCE(ca.commission_rate, 0),
      net_income = (COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0)) - cr.management_fee,
      ownership_percentage = COALESCE(p.management_ownership_percentage, 100),
      commission_base = ROUND(
        cr.management_fee
        + ((COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0)) - cr.management_fee)
          * COALESCE(p.management_ownership_percentage, 100) / 100
      , 2),
      total_commission = ROUND(
        (cr.management_fee
          + ((COALESCE(ca.charter_fee, 0) - COALESCE(ca.agency_commission_thb, 0)) - cr.management_fee)
            * COALESCE(p.management_ownership_percentage, 100) / 100)
        * COALESCE(ca.commission_rate, 0) / 100,
      2),
      booking_owner_id = CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      currency = COALESCE(ca.currency, b.currency, 'THB'),
      updated_at = NOW()
    FROM cabin_allocations ca
    JOIN bookings b ON b.id = ca.booking_id
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE cr.cabin_allocation_id = ca.id
      AND b.status IN ('booked', 'completed')
      AND cr.management_fee_overridden
    RETURNING cr.id
  )
  SELECT v_updated + COUNT(*) INTO v_updated FROM updated_cabin_overridden;

  -- ================================================================
  -- 3. CLEANUP: Remove commission records for cabin allocations that
  --    are no longer booked or have been deleted
  -- ================================================================
  WITH cleaned AS (
    DELETE FROM commission_records cr
    WHERE cr.cabin_allocation_id IS NOT NULL
      AND cr.source = 'booking'
      AND NOT EXISTS (
        SELECT 1 FROM cabin_allocations ca
        JOIN bookings b ON b.id = ca.booking_id
        WHERE ca.id = cr.cabin_allocation_id
          AND ca.status = 'booked'
          AND b.status IN ('booked', 'completed')
          AND COALESCE(ca.charter_fee, 0) > 0
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned FROM cleaned;

  RETURN json_build_object('created', v_created, 'updated', v_updated, 'cleaned', v_cleaned);
END;
$$;
