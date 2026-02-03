-- Persistent notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  reference_id TEXT NOT NULL,
  reference_number TEXT,
  target_role TEXT NOT NULL DEFAULT 'accountant',
  target_user_id UUID REFERENCES auth.users(id),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read notifications" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update notifications" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete notifications" ON notifications FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_notifications_role_read ON notifications (target_role, read);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);
