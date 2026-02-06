-- ============================================================
-- Full-Text Search: Add tsvector columns + GIN indexes
-- Enables fast, ranked search replacing client-side string matching
-- ============================================================

-- ============================================================
-- 1. Bookings search
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION bookings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.booking_number, '') || ' ' ||
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.customer_name, '') || ' ' ||
    coalesce(NEW.customer_email, '') || ' ' ||
    coalesce(NEW.external_boat_name, '') || ' ' ||
    coalesce(NEW.customer_notes, '') || ' ' ||
    coalesce(NEW.internal_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_search_vector_trigger ON bookings;
CREATE TRIGGER bookings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_search_vector_update();

-- Backfill existing rows
UPDATE bookings SET search_vector = to_tsvector('english',
  coalesce(booking_number, '') || ' ' || coalesce(title, '') || ' ' ||
  coalesce(customer_name, '') || ' ' || coalesce(customer_email, '') || ' ' ||
  coalesce(external_boat_name, '') || ' ' || coalesce(customer_notes, '') || ' ' ||
  coalesce(internal_notes, '')
);

CREATE INDEX IF NOT EXISTS idx_bookings_search ON bookings USING GIN (search_vector);

-- ============================================================
-- 2. Contacts search
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION contacts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.email, '') || ' ' ||
    coalesce(NEW.phone, '') || ' ' ||
    coalesce(NEW.contact_person, '') || ' ' ||
    coalesce(NEW.tax_id, '') || ' ' ||
    coalesce(NEW.notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_search_vector_trigger ON contacts;
CREATE TRIGGER contacts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_search_vector_update();

-- Backfill existing rows
UPDATE contacts SET search_vector = to_tsvector('english',
  coalesce(name, '') || ' ' || coalesce(email, '') || ' ' ||
  coalesce(phone, '') || ' ' || coalesce(contact_person, '') || ' ' ||
  coalesce(tax_id, '') || ' ' || coalesce(notes, '')
);

CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING GIN (search_vector);

-- ============================================================
-- 3. Expenses search
-- ============================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION expenses_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.expense_number, '') || ' ' ||
    coalesce(NEW.vendor_name, '') || ' ' ||
    coalesce(NEW.supplier_invoice_number, '') || ' ' ||
    coalesce(NEW.notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_search_vector_trigger ON expenses;
CREATE TRIGGER expenses_search_vector_trigger
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION expenses_search_vector_update();

-- Backfill existing rows
UPDATE expenses SET search_vector = to_tsvector('english',
  coalesce(expense_number, '') || ' ' || coalesce(vendor_name, '') || ' ' ||
  coalesce(supplier_invoice_number, '') || ' ' || coalesce(notes, '')
);

CREATE INDEX IF NOT EXISTS idx_expenses_search ON expenses USING GIN (search_vector);

-- ============================================================
-- 4. Search RPC function with prefix matching
-- ============================================================
CREATE OR REPLACE FUNCTION search_records(
  p_table text,
  p_query text,
  p_limit int DEFAULT 50
) RETURNS SETOF jsonb AS $$
DECLARE
  tsquery_val tsquery;
  words text[];
  word text;
  parts text[] := '{}';
BEGIN
  -- Split input into words and add prefix matching (:*)
  words := regexp_split_to_array(trim(p_query), '\s+');
  FOREACH word IN ARRAY words LOOP
    IF length(word) > 0 THEN
      parts := array_append(parts, quote_literal(word) || ':*');
    END IF;
  END LOOP;

  -- Join with & (AND) operator
  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    RETURN;
  END IF;

  tsquery_val := to_tsquery('english', array_to_string(parts, ' & '));

  RETURN QUERY EXECUTE format(
    'SELECT to_jsonb(t.*) FROM %I t WHERE t.search_vector @@ $1 ORDER BY ts_rank(t.search_vector, $1) DESC LIMIT $2',
    p_table
  ) USING tsquery_val, p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
