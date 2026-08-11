export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  credits?: number;
  plan?: 'free' | 'pro' | 'agency';
  created_at: string;
  updated_at?: string;
}

export type VideoFormat = 'short_form' | 'long_form';
export type AspectRatio = '9:16' | '16:9';
export type SeriesPlatform = 'TikTok' | 'Instagram Reels' | 'YouTube Shorts' | 'YouTube';
export type VideoDuration = '15s' | '30s' | '60s' | '90s' | '5 min' | '10 min' | '15 min' | '20 min';
export type ContentStyle = 'Educational' | 'Storytelling' | 'Documentary' | 'Listicle' | 'Mystery' | 'Facts';
export type VoiceGender = 'Male' | 'Female';
export type VoiceStyle = 'Natural' | 'Deep' | 'Energetic' | 'Calm' | 'Narrator';
export type VisualSource = 'ai_image' | 'stock' | 'upload' | 'mixed' | 'AI Images' | 'AI Video' | 'Stock Footage' | 'Mixed';
export type VisualStyle = 'Cinematic' | 'Realistic' | 'Documentary' | 'Dark' | 'Vintage' | 'Modern';
export type CaptionStyle = 'Minimal' | 'Bold' | 'Dynamic' | 'Hormozi' | 'Classic';
export type SeriesStatus = 'Active' | 'Paused';

export interface Series {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  description: string;
  language: string;
  duration: VideoDuration;
  platform: SeriesPlatform;
  content_style: ContentStyle;
  voice_gender: VoiceGender;
  voice_style: VoiceStyle;
  visual_source: VisualSource;
  visual_style: VisualStyle;
  captions_enabled: boolean;
  caption_style: CaptionStyle;
  status: SeriesStatus;
  thumbnail_url?: string;
  video_count?: number;
  video_format?: VideoFormat;
  aspect_ratio?: AspectRatio;
  target_duration?: number;
  created_at: string;
  updated_at: string;
}

export type VideoStatus = 'Generating' | 'Ready' | 'Failed';

export interface VideoChapterRecord {
  id: string;
  video_id: string;
  user_id: string;
  chapter_order: number;
  title: string;
  description?: string;
  script?: string;
  target_duration?: number;
  actual_duration?: number;
  status?: 'pending' | 'generating' | 'ready' | 'failed';
  narration_url?: string;
  narration_storage_path?: string;
  render_status?: 'pending' | 'processing' | 'ready' | 'failed';
  segment_video_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VideoSceneRecord {
  id: string;
  video_id: string;
  chapter_id?: string;
  scene_order: number;
  narration_text: string;
  visual_prompt?: string;
  visual_url?: string;
  visual_status?: 'pending' | 'generating' | 'ready' | 'needs_fallback' | 'needs_upload' | 'failed';
  visual_source_used?: string;
  is_key_visual?: boolean;
  stock_provider?: string;
  stock_asset_id?: string;
  stock_attribution?: string;
  visual_error?: string;
  duration?: number;
}

export interface Video {
  id: string;
  user_id: string;
  series_id: string;
  series_name?: string;
  title: string;
  topic: string;
  status: VideoStatus;
  progress: number; // 0 to 100
  current_step?: string;
  thumbnail_url?: string;
  video_url?: string;
  duration: string;
  script?: string;
  video_format?: VideoFormat;
  aspect_ratio?: AspectRatio;
  target_duration?: number; // in seconds
  long_form_status?: string;
  youtube_title?: string;
  youtube_description?: string;
  youtube_tags?: string;
  chapters?: VideoChapterRecord[];
  scenes?: {
    id: number;
    time: string;
    text: string;
    visual_description: string;
    audio_cue: string;
  }[];
  captions_text?: string;
  created_at: string;
  updated_at: string;
}

export type AssetType = 'image' | 'video' | 'audio';

export interface MediaAsset {
  id: string;
  user_id: string;
  video_id?: string;
  title: string;
  type: AssetType;
  url: string;
  thumbnail_url?: string;
  file_size?: string;
  duration?: string;
  tags?: string[];
  created_at: string;
}

export interface StatsOverview {
  totalSeries: number;
  totalVideosCreated: number;
  videosThisMonth: number;
  creditsRemaining: number;
}

