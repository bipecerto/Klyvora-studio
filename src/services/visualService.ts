import { supabase } from '../lib/supabase';
import { VideoSceneRecord } from './videoService';

export async function generateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'guest-token';

  const res = await fetch('/api/generate-scene-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId, scene_id: sceneId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao gerar imagem para a cena.');
  }

  const data = await res.json();
  return data.scene;
}

export async function generateVideoVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'guest-token';

  const res = await fetch('/api/generate-video-visuals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao gerar visuais para o vídeo.');
  }

  return await res.json();
}

export async function regenerateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  return generateSceneImage(videoId, sceneId);
}

export async function regenerateAllVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  return generateVideoVisuals(videoId);
}
