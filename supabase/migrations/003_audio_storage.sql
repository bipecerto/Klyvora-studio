-- ========================================================
-- Migration: 003_audio_storage.sql
-- Description: Add narration fields to videos table and setup storage for audio media
-- ========================================================

-- 1. Add narration columns to public.videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS narration_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS narration_storage_path TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS narration_voice TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS narration_duration NUMERIC;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS narration_status TEXT DEFAULT 'pending';

-- 2. Create storage bucket for media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Storage Policies for 'media' bucket
DROP POLICY IF EXISTS "Users can upload own media" ON storage.objects;
CREATE POLICY "Users can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own media or public media" ON storage.objects;
CREATE POLICY "Users can view own media or public media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media' AND ((storage.foldername(name))[1] = auth.uid()::text OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
