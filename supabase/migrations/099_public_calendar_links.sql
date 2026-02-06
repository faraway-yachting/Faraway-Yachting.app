-- Public calendar links: shareable read-only calendar URLs for agencies
CREATE TABLE public_calendar_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  project_ids UUID[] NOT NULL,
  visible_statuses TEXT[] NOT NULL DEFAULT ARRAY['booked', 'completed', 'hold'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_calendar_links_token ON public_calendar_links(token);

ALTER TABLE public_calendar_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage public calendar links"
  ON public_calendar_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
