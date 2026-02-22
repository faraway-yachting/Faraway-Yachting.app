-- Migration 146: Add vehicle photo support
-- Adds photo_url column to taxi_vehicles and creates storage bucket

-- 1. Add photo_url column
ALTER TABLE taxi_vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create storage bucket for taxi vehicle photos
INSERT INTO storage.buckets (id, name, public) VALUES ('taxi-vehicles', 'taxi-vehicles', true)
  ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "Authenticated users can upload taxi vehicle photos"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'taxi-vehicles');
CREATE POLICY "Public can view taxi vehicle photos"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'taxi-vehicles');
CREATE POLICY "Authenticated users can update taxi vehicle photos"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'taxi-vehicles');
CREATE POLICY "Authenticated users can delete taxi vehicle photos"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'taxi-vehicles');
