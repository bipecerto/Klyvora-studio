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

export type SeriesPlatform = 'TikTok' | 'Instagram Reels' | 'YouTube Shorts';
export type VideoDuration = '15s' | '30s' | '60s' | '90s';
export type ContentStyle = 'Educational' | 'Storytelling' | 'Documentary' | 'Listicle' | 'Mystery' | 'Facts';
export type VoiceGender = 'Male' | 'Female';
export type VoiceStyle = 'Natural' | 'Deep' | 'Energetic' | 'Calm' | 'Narrator';
export type VisualSource = 'AI Images' | 'AI Video' | 'Stock Footage' | 'Mixed';
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
  created_at: string;
  updated_at: string;
}

export type VideoStatus = 'Generating' | 'Ready' | 'Failed';

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
