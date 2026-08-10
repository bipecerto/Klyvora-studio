-- ========================================================
-- Migration: 004_scene_visuals.sql
-- Description: Add visual status, storage path, error, and timestamp to video_scenes
-- ========================================================

ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_storage_path TEXT;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_status TEXT DEFAULT 'pending';
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_error TEXT;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_generated_at TIMESTAMPTZ;
