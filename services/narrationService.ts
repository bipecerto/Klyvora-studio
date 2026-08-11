import { safeApiFetch } from './apiClient';
import { applyGeneratedNarrationLocally, getVideoById } from './videoService';
import { getSeriesById } from './seriesService';

export interface PreviewVoiceResponse {
  success: boolean;
  audioBase64?: string;
  audioUrl?: string;
  mimeType?: string;
  error?: string;
}

export interface NarrationResponse {
  success: boolean;
  video_id: string;
  narration_url: string;
  narration_voice: string;
  narration_status: 'ready' | 'failed' | 'generating';
  narration_duration?: number;
  error?: string;
}

/**
 * Generates a short voice preview using /api/preview-voice
 */
export async function previewVoice(
  voice: string,
  language: string = 'Português do Brasil'
): Promise<PreviewVoiceResponse> {
  return safeApiFetch<PreviewVoiceResponse>('/api/preview-voice', {
    method: 'POST',
    body: JSON.stringify({
      voice,
      language,
    }),
  });
}

/**
 * Generates narration audio for a video script via /api/generate-narration
 */
export async function generateNarration(
  videoId: string,
  voiceId?: string,
  voiceStyle?: string
): Promise<NarrationResponse> {
  let localScript: string | undefined;
  let localLanguage: string | undefined;

  try {
    const localVideo = await getVideoById(videoId);
    localScript = localVideo?.script || undefined;
    if (localVideo?.series_id) {
      const series = await getSeriesById(localVideo.series_id);
      localLanguage = series?.language || undefined;
    }
  } catch (_) {}

  const data = await safeApiFetch<NarrationResponse>('/api/generate-narration', {
    method: 'POST',
    body: JSON.stringify({
      video_id: videoId,
      voice_id: voiceId,
      voice_style: voiceStyle,
      script: localScript,
      language: localLanguage,
    }),
  });

  if (data?.narration_url) {
    applyGeneratedNarrationLocally(videoId, data);
  }

  return data;
}

/**
 * Regenerate narration
 */
export async function regenerateNarration(
  videoId: string,
  voiceId?: string,
  voiceStyle?: string
): Promise<NarrationResponse> {
  return generateNarration(videoId, voiceId, voiceStyle);
}
