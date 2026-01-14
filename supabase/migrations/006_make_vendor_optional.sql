-- Migration: Make vendor_id optional in expenses table
-- This allows expenses to be created without a vendor (e.g., for internal expenses)

-- Alter the expenses table to make vendor_id nullable
ALTER TABLE expenses ALTER COLUMN vendor_id DROP NOT NULL;

-- Allow empty string for vendor_name as well
ALTER TABLE expenses ALTER COLUMN vendor_name DROP NOT NULL;

-- Add a default empty string for vendor_name if null
ALTER TABLE expenses ALTER COLUMN vendor_name SET DEFAULT '';
