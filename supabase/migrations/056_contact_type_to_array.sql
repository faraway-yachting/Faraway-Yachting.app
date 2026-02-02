-- Convert contacts.type from single string to text[] array
-- This enables multi-select contact types (e.g. a contact can be both 'agency' and 'boat_operator')

-- 1. Drop old CHECK constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;

-- 2. Add new column as text array
ALTER TABLE contacts ADD COLUMN type_arr text[];

-- 3. Migrate existing data
UPDATE contacts SET type_arr = CASE
  WHEN type = 'both' THEN ARRAY['customer', 'vendor']
  WHEN type IS NOT NULL THEN ARRAY[type]
  ELSE ARRAY['customer']
END;

-- 4. Drop old column, rename new
ALTER TABLE contacts DROP COLUMN type;
ALTER TABLE contacts RENAME COLUMN type_arr TO type;

-- 5. Set NOT NULL and default
ALTER TABLE contacts ALTER COLUMN type SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN type SET DEFAULT ARRAY['customer']::text[];

-- 6. Create GIN index for array queries
CREATE INDEX idx_contacts_type_gin ON contacts USING GIN (type);
