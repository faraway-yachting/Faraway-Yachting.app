-- Commission sync RPC — all amounts in THB.
--
-- Formula (all values in THB):
--   cf_thb          = charter_fee * fx_rate (when currency != THB)
--   eff             = cf_thb - agency_commission_thb
--
--   For owned yachts with ownership < 100%:
--     management_fee  = eff * management_fee_% / 100
--     net_income      = eff - management_fee
--     commission_base = management_fee + (net_income * ownership_% / 100)
--
--   For 100% owned yachts and external boats:
--     management_fee  = 0  (skipped — no split needed)
--     net_income      = eff (owned) or cf_thb - agency - charter_cost (external)
--     commission_base = net_income
--
--   total_commission = booking.commission_received ?? (commission_base * commission_rate / 100)
--
-- total_commission prefers the booking's saved commission_received (which includes
-- extras commission from the booking form). Falls back to calculated value when NULL.

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
      thb.cf_thb,
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN 0 ELSE calc.mf END,
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.ni END,
      COALESCE(p.management_ownership_percentage, 100),
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END,
      COALESCE(b.commission_rate, 0),
      COALESCE(b.commission_received, ROUND(
        CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END
        * COALESCE(b.commission_rate, 0) / 100, 2)),
      COALESCE(b.sales_owner_id, b.booking_owner),
      'THB',
      false
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        -- Convert charter fee to THB
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END AS cf_thb,
        -- Effective fee (THB) = charter_fee_thb - agency_commission_thb
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END - COALESCE(b.agency_commission_thb, 0) AS eff
    ) thb
    CROSS JOIN LATERAL (
      SELECT
        ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS mf,
        thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS ni,
        ROUND(
          ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2)
          + (thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2))
            * COALESCE(p.management_ownership_percentage, 100) / 100
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
      thb.cf_thb,
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN 0 ELSE calc.mf END,
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.ni END,
      COALESCE(p.management_ownership_percentage, 100),
      CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END,
      COALESCE(ca.commission_rate, 0),
      COALESCE(ca.commission_received, ROUND(
        CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END
        * COALESCE(ca.commission_rate, 0) / 100, 2)),
      CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      'THB',
      false
    FROM bookings b
    JOIN cabin_allocations ca ON ca.booking_id = b.id
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        -- Convert cabin charter fee to THB
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END AS cf_thb,
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END - COALESCE(ca.agency_commission_thb, 0) AS eff
    ) thb
    CROSS JOIN LATERAL (
      SELECT
        ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS mf,
        thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS ni,
        ROUND(
          ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2)
          + (thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2))
            * COALESCE(p.management_ownership_percentage, 100) / 100
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
      thb.cf_thb,
      0,
      thb.cf_thb - COALESCE(b.agency_commission_thb, 0) - thb.cost_thb,
      100,
      thb.cf_thb - COALESCE(b.agency_commission_thb, 0) - thb.cost_thb,
      COALESCE(b.commission_rate, 0),
      COALESCE(b.commission_received, ROUND(
        (thb.cf_thb - COALESCE(b.agency_commission_thb, 0) - thb.cost_thb)
        * COALESCE(b.commission_rate, 0) / 100,
      2)),
      COALESCE(b.sales_owner_id, b.booking_owner),
      'THB',
      false
    FROM bookings b
    CROSS JOIN LATERAL (
      SELECT
        -- Charter fee → THB
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END AS cf_thb,
        -- Charter cost → THB
        CASE
          WHEN b.charter_cost_currency IS NULL OR b.charter_cost_currency = 'THB'
            THEN COALESCE(b.charter_cost, 0)
          WHEN b.charter_cost_currency = b.currency AND b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_cost, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_cost, 0)
        END AS cost_thb
    ) thb
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
      charter_fee = CASE
        WHEN b.project_id IS NOT NULL THEN calc.cf_thb
        ELSE ext.cf_thb
      END,
      management_fee = CASE
        WHEN b.project_id IS NOT NULL AND COALESCE(p.management_ownership_percentage, 100) != 100 THEN calc.mf
        ELSE 0
      END,
      net_income = CASE
        WHEN b.project_id IS NOT NULL AND COALESCE(p.management_ownership_percentage, 100) = 100 THEN ext.eff
        WHEN b.project_id IS NOT NULL THEN calc.ni
        ELSE ext.cf_thb - COALESCE(b.agency_commission_thb, 0) - ext.cost_thb
      END,
      ownership_percentage = CASE
        WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100)
        ELSE 100
      END,
      commission_base = CASE
        WHEN b.project_id IS NOT NULL AND COALESCE(p.management_ownership_percentage, 100) = 100 THEN ext.eff
        WHEN b.project_id IS NOT NULL THEN calc.cb
        ELSE ext.cf_thb - COALESCE(b.agency_commission_thb, 0) - ext.cost_thb
      END,
      commission_rate = COALESCE(b.commission_rate, 0),
      total_commission = COALESCE(b.commission_received, ROUND(
        CASE
          WHEN b.project_id IS NOT NULL AND COALESCE(p.management_ownership_percentage, 100) = 100 THEN ext.eff
          WHEN b.project_id IS NOT NULL THEN calc.cb
          ELSE ext.cf_thb - COALESCE(b.agency_commission_thb, 0) - ext.cost_thb
        END
        * COALESCE(b.commission_rate, 0) / 100,
      2)),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = 'THB',
      updated_at = NOW()
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    -- THB conversion for owned yachts
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END AS cf_thb,
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END - COALESCE(b.agency_commission_thb, 0) AS eff,
        -- Charter cost → THB (for external boats)
        CASE
          WHEN b.charter_cost_currency IS NULL OR b.charter_cost_currency = 'THB'
            THEN COALESCE(b.charter_cost, 0)
          WHEN b.charter_cost_currency = b.currency AND b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_cost, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_cost, 0)
        END AS cost_thb
    ) ext
    CROSS JOIN LATERAL (
      SELECT
        ext.cf_thb AS cf_thb,
        ROUND(ext.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS mf,
        ext.eff - ROUND(ext.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS ni,
        ROUND(
          ROUND(ext.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2)
          + (ext.eff - ROUND(ext.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2))
            * COALESCE(p.management_ownership_percentage, 100) / 100
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
      charter_fee = thb.cf_thb,
      commission_rate = COALESCE(b.commission_rate, 0),
      -- Keep overridden management_fee, recalculate everything else from THB
      net_income = thb.eff - cr.management_fee,
      ownership_percentage = CASE
        WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100)
        ELSE 100
      END,
      commission_base = ROUND(
        cr.management_fee
        + (thb.eff - cr.management_fee)
          * CASE WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100) ELSE 100 END / 100
      , 2),
      total_commission = COALESCE(b.commission_received, ROUND(
        (cr.management_fee
          + (thb.eff - cr.management_fee)
            * CASE WHEN b.project_id IS NOT NULL THEN COALESCE(p.management_ownership_percentage, 100) ELSE 100 END / 100)
        * COALESCE(b.commission_rate, 0) / 100,
      2)),
      booking_owner_id = COALESCE(b.sales_owner_id, b.booking_owner),
      currency = 'THB',
      updated_at = NOW()
    FROM bookings b
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END AS cf_thb,
        CASE
          WHEN b.currency IS NULL OR b.currency = 'THB'
            THEN COALESCE(b.charter_fee, b.total_price, 0)
          WHEN b.fx_rate IS NOT NULL AND b.fx_rate > 0
            THEN ROUND(COALESCE(b.charter_fee, b.total_price, 0) * b.fx_rate, 2)
          ELSE COALESCE(b.charter_fee, b.total_price, 0)
        END - COALESCE(b.agency_commission_thb, 0) AS eff
    ) thb
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
      charter_fee = calc.cf_thb,
      management_fee = CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN 0 ELSE calc.mf END,
      net_income = CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.ni END,
      ownership_percentage = COALESCE(p.management_ownership_percentage, 100),
      commission_base = CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END,
      commission_rate = COALESCE(ca.commission_rate, 0),
      total_commission = COALESCE(ca.commission_received, ROUND(
        CASE WHEN COALESCE(p.management_ownership_percentage, 100) = 100 THEN thb.eff ELSE calc.cb END
        * COALESCE(ca.commission_rate, 0) / 100, 2)),
      booking_owner_id = CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      currency = 'THB',
      updated_at = NOW()
    FROM cabin_allocations ca
    JOIN bookings b ON b.id = ca.booking_id
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END AS cf_thb,
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END - COALESCE(ca.agency_commission_thb, 0) AS eff
    ) thb
    CROSS JOIN LATERAL (
      SELECT
        thb.cf_thb AS cf_thb,
        ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS mf,
        thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2) AS ni,
        ROUND(
          ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2)
          + (thb.eff - ROUND(thb.eff * COALESCE(p.management_fee_percentage, 0) / 100, 2))
            * COALESCE(p.management_ownership_percentage, 100) / 100
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
      charter_fee = thb.cf_thb,
      commission_rate = COALESCE(ca.commission_rate, 0),
      net_income = thb.eff - cr.management_fee,
      ownership_percentage = COALESCE(p.management_ownership_percentage, 100),
      commission_base = ROUND(
        cr.management_fee
        + (thb.eff - cr.management_fee)
          * COALESCE(p.management_ownership_percentage, 100) / 100
      , 2),
      total_commission = COALESCE(ca.commission_received, ROUND(
        (cr.management_fee
          + (thb.eff - cr.management_fee)
            * COALESCE(p.management_ownership_percentage, 100) / 100)
        * COALESCE(ca.commission_rate, 0) / 100,
      2)),
      booking_owner_id = CASE
        WHEN ca.booking_owner IS NOT NULL AND ca.booking_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN ca.booking_owner::uuid
        ELSE COALESCE(b.sales_owner_id, b.booking_owner)
      END,
      currency = 'THB',
      updated_at = NOW()
    FROM cabin_allocations ca
    JOIN bookings b ON b.id = ca.booking_id
    LEFT JOIN projects p ON p.id = b.project_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END AS cf_thb,
        CASE
          WHEN ca.currency IS NULL OR ca.currency = 'THB'
            THEN COALESCE(ca.charter_fee, 0)
          WHEN ca.fx_rate IS NOT NULL AND ca.fx_rate > 0
            THEN ROUND(COALESCE(ca.charter_fee, 0) * ca.fx_rate, 2)
          ELSE COALESCE(ca.charter_fee, 0)
        END - COALESCE(ca.agency_commission_thb, 0) AS eff
    ) thb
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
