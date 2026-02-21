-- Add category column to inventory_purchases
ALTER TABLE inventory_purchases ADD COLUMN category TEXT DEFAULT 'general';
