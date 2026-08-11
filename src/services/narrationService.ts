import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  Generate a short voice preview audio snippet via Gemini TTS backend
 */
export async function previewVoice(
  voice: string,
  language: string = 'English'
): Promise<PreviewVoiceResponse> {
  let token = 'guest-token';

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch (_) {}
  }

  const response = await fetch('/api/preview-voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      voice,
      language,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate voice preview.');
  }

  return data as PreviewVoiceResponse;
}

/**
  Generate or regenerate complete narration audio for a video script
 */
export async function generateNarration(
  videoId: string,
  voiceId?: string,
  voiceStyle?: string
): Promise<NarrationResponse> {
  let token = 'guest-token';

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch (_) {}
  }

  const response = await fetch('/api/generate-narration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      video_id: videoId,
      voice_id: voiceId,
      voice_style: voiceStyle,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate narration audio.');
  }

  return data as NarrationResponse;
}

/**
  Alias to regenerate narration with optionally new voice or voice style
 */
export async function regenerateNarration(
  videoId: string,
  voiceId?: string,
  voiceStyle?: string
): Promise<NarrationResponse> {
  return generateNarration(videoId, voiceId, voiceStyle);
}
