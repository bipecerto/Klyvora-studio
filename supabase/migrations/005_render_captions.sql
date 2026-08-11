-- ========================================================
-- Migration: 005_render_captions.sql
-- Description: Create video_captions table and add render columns to videos
-- ========================================================

-- 1. Create video_captions table
CREATE TABLE IF NOT EXISTS public.video_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption_order INTEGER NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_captions ENABLE ROW LEVEL SECURITY;

-- Policies for video_captions
DROP POLICY IF EXISTS "Users can view own video captions" ON public.video_captions;
CREATE POLICY "Users can view own video captions"
ON public.video_captions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own video captions" ON public.video_captions;
CREATE POLICY "Users can insert own video captions"
ON public.video_captions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video captions" ON public.video_captions;
CREATE POLICY "Users can update own video captions"
ON public.video_captions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own video captions" ON public.video_captions;
CREATE POLICY "Users can delete own video captions"
ON public.video_captions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_video_captions_video_id ON public.video_captions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_captions_user_id ON public.video_captions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_captions_order ON public.video_captions(video_id, caption_order);

-- 2. Add render columns to public.videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_storage_path TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS render_status TEXT DEFAULT 'pending';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS render_progress INTEGER DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS render_error TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS rendered_at TIMESTAMPTZ;
