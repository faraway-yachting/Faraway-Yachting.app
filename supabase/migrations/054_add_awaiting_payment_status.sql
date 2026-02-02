-- Add "Awaiting Payment" option to payment_status lookups
INSERT INTO booking_lookups (category, value, label, sort_order)
VALUES ('payment_status', 'awaiting_payment', 'Awaiting Payment', 2)
ON CONFLICT (category, value) DO NOTHING;

-- Bump existing sort orders to make room
UPDATE booking_lookups SET sort_order = 3 WHERE category = 'payment_status' AND value = 'partial';
UPDATE booking_lookups SET sort_order = 4 WHERE category = 'payment_status' AND value = 'paid';
