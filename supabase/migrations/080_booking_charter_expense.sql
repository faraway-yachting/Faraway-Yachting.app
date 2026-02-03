-- Charter expense tracking for external boat bookings
ALTER TABLE bookings ADD COLUMN charter_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN charter_expense_status TEXT DEFAULT 'not_recorded';
ALTER TABLE bookings ADD COLUMN linked_expense_id UUID REFERENCES expenses(id);
