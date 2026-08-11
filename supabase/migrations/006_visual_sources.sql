-- ========================================================
-- Migration: 006_visual_sources.sql
-- Description: Add visual_source_used, visual_type, stock_provider, stock_asset_id, stock_attribution to video_scenes
-- ========================================================

ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_source_used TEXT;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS visual_type TEXT DEFAULT 'image';
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS stock_provider TEXT;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS stock_asset_id TEXT;
ALTER TABLE public.video_scenes ADD COLUMN IF NOT EXISTS stock_attribution TEXT;
