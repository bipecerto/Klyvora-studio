import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { applyGeneratedScriptLocally, getVideoById } from './videoService';
import { getSeriesById } from './seriesService';

export interface GenerationResponse {
  success: boolean;
  video_id: string;
  topic?: string;
  title?: string;
  script?: string;
  scenes?: any[];
  scenes_count?: number;
  error?: string;
}

/**
 * Triggers the AI Studio server-side API endpoint `/api/generate-video-script`
 * using the server-side GEMINI_API_KEY.
 */
export async function generateVideoScript(
  videoId: string,
  autoTopic: boolean = false,
  seriesContext?: any,
  topic?: string
): Promise<GenerationResponse> {
  let token = 'guest-token';
  let resolvedSeriesContext = seriesContext;

  if (!resolvedSeriesContext) {
    try {
      const localVideo = await getVideoById(videoId);
      if (localVideo?.series_id) resolvedSeriesContext = await getSeriesById(localVideo.series_id);
    } catch (_) {}
  }

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch (_) {}
  }

  const response = await fetch('/api/generate-video-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      video_id: videoId,
      auto_topic: autoTopic,
      series_context: resolvedSeriesContext,
      topic,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Server generation failed (Status ${response.status})`);
  }

  if (token === 'guest-token') {
    applyGeneratedScriptLocally(videoId, data);
  }

  return data as GenerationResponse;
}

