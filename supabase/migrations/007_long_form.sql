-- ========================================================
-- Migration: 007_long_form.sql
-- Description: YouTube Long Form support (16:9, chapters, target durations, metadata)
-- ========================================================

-- Add columns to series
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS video_format TEXT DEFAULT 'short_form';
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '9:16';
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS target_duration INTEGER DEFAULT 60;

-- Add columns to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_format TEXT DEFAULT 'short_form';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '9:16';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS target_duration INTEGER DEFAULT 60;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS long_form_status TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_title TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_description TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_tags TEXT;

-- Add columns to video_scenes
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS is_key_visual BOOLEAN DEFAULT FALSE;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS chapter_id UUID;

-- Create video_chapters table
CREATE TABLE IF NOT EXISTS public.video_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  chapter_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  script TEXT,
  target_duration NUMERIC,
  actual_duration NUMERIC,
  status TEXT DEFAULT 'pending',
  narration_url TEXT,
  narration_storage_path TEXT,
  render_status TEXT DEFAULT 'pending',
  segment_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on video_chapters
ALTER TABLE public.video_chapters ENABLE ROW LEVEL SECURITY;

-- Policies for video_chapters
DROP POLICY IF EXISTS "Users can manage own video_chapters" ON public.video_chapters;
CREATE POLICY "Users can manage own video_chapters"
  ON public.video_chapters
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_video_chapters_video_id ON public.video_chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_video_chapters_user_id ON public.video_chapters(user_id);
