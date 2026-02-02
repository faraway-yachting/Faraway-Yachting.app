-- Add 'agency' to the contact type CHECK constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_type_check CHECK (type IN ('customer', 'vendor', 'both', 'agency'));
