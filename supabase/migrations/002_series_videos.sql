-- ========================================================
-- Migration: 002_series_videos.sql
-- Description: Create series, videos, and video_scenes tables with RLS and triggers
-- ========================================================

-- 1. Create series table
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  description TEXT,
  language TEXT DEFAULT 'en',
  duration INTEGER DEFAULT 60,
  platforms TEXT[] DEFAULT '{}',
  content_style TEXT,
  tone TEXT,
  voice_gender TEXT,
  voice_style TEXT,
  voice_id TEXT,
  visual_source TEXT,
  visual_style TEXT,
  image_frequency TEXT,
  captions_enabled BOOLEAN DEFAULT TRUE,
  caption_style TEXT,
  caption_position TEXT,
  highlight_keywords BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  title TEXT,
  topic TEXT,
  script TEXT,
  status TEXT DEFAULT 'draft',
  progress INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  video_url TEXT,
  duration INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create video_scenes table
CREATE TABLE IF NOT EXISTS public.video_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL,
  text TEXT,
  visual_prompt TEXT,
  visual_url TEXT,
  duration NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_series_user_id ON public.series(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_series_id ON public.videos(series_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at);
CREATE INDEX IF NOT EXISTS idx_video_scenes_video_id ON public.video_scenes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_user_id ON public.video_scenes(user_id);

-- 5. Updated_at Triggers (reuses handle_updated_at from 001 if exists, or defines it)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_series_updated ON public.series;
CREATE TRIGGER on_series_updated
  BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_videos_updated ON public.videos;
CREATE TRIGGER on_videos_updated
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_scenes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for series
DROP POLICY IF EXISTS "Users can view own series" ON public.series;
CREATE POLICY "Users can view own series"
  ON public.series FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own series" ON public.series;
CREATE POLICY "Users can insert own series"
  ON public.series FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own series" ON public.series;
CREATE POLICY "Users can update own series"
  ON public.series FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own series" ON public.series;
CREATE POLICY "Users can delete own series"
  ON public.series FOR DELETE
  USING (auth.uid() = user_id);

-- 8. RLS Policies for videos
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
CREATE POLICY "Users can view own videos"
  ON public.videos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
CREATE POLICY "Users can insert own videos"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- 9. RLS Policies for video_scenes
DROP POLICY IF EXISTS "Users can view own video_scenes" ON public.video_scenes;
CREATE POLICY "Users can view own video_scenes"
  ON public.video_scenes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own video_scenes" ON public.video_scenes;
CREATE POLICY "Users can insert own video_scenes"
  ON public.video_scenes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video_scenes" ON public.video_scenes;
CREATE POLICY "Users can update own video_scenes"
  ON public.video_scenes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own video_scenes" ON public.video_scenes;
CREATE POLICY "Users can delete own video_scenes"
  ON public.video_scenes FOR DELETE
  USING (auth.uid() = user_id);
