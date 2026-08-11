import { safeApiFetch } from './apiClient';
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
 * Generates video script via server endpoint /api/generate-video-script
 */
export async function generateVideoScript(
  videoId: string,
  autoTopic: boolean = false,
  seriesContext?: any,
  topic?: string
): Promise<GenerationResponse> {
  let resolvedSeriesContext = seriesContext;

  if (!resolvedSeriesContext) {
    try {
      const localVideo = await getVideoById(videoId);
      if (localVideo?.series_id) {
        resolvedSeriesContext = await getSeriesById(localVideo.series_id);
      }
    } catch (_) {}
  }

  const data = await safeApiFetch<GenerationResponse>('/api/generate-video-script', {
    method: 'POST',
    body: JSON.stringify({
      video_id: videoId,
      auto_topic: autoTopic,
      series_context: resolvedSeriesContext,
      topic,
    }),
  });

  applyGeneratedScriptLocally(videoId, data);
  return data;
}

/**
 * Divides or formats script into structured scenes via /api/generate-scenes
 */
export async function generateScenes(
  videoId: string,
  script?: string,
  scenes?: any[],
  duration = 60
): Promise<{ success: boolean; video_id: string; scenes: any[] }> {
  return safeApiFetch('/api/generate-scenes', {
    method: 'POST',
    body: JSON.stringify({
      video_id: videoId,
      script,
      scenes,
      duration,
    }),
  });
}
