-- Enable Supabase Realtime for key tables
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events via WebSocket

-- Notifications: instant delivery instead of 30s polling
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Bookings: real-time calendar updates across users/tabs
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Petty cash reimbursements: instant status updates for wallet holders
ALTER PUBLICATION supabase_realtime ADD TABLE petty_cash_reimbursements;
