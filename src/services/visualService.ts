import { supabase } from '../lib/supabase';
import { VideoSceneRecord, applyGeneratedVisualsLocally, getVideoScenes } from './videoService';

export async function generateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'guest-token';

  const localScenes = token === 'guest-token' ? await getVideoScenes(videoId) : [];
  const localScene = localScenes.find((scene) => scene.id === sceneId);

  const res = await fetch('/api/generate-scene-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId, scene_id: sceneId, scene: localScene }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao gerar imagem para a cena.');
  }

  const data = await res.json();
  if (token === 'guest-token' && data?.scene) {
    applyGeneratedVisualsLocally(videoId, [data.scene]);
  }
  return data.scene;
}

export async function generateVideoVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'guest-token';

  const localScenes = token === 'guest-token' ? await getVideoScenes(videoId) : [];

  const res = await fetch('/api/generate-video-visuals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId, scenes: localScenes }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao gerar visuais para o vídeo.');
  }

  const data = await res.json();
  if (token === 'guest-token' && Array.isArray(data?.scenes)) {
    applyGeneratedVisualsLocally(videoId, data.scenes);
  }
  return data;
}

export async function regenerateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  return generateSceneImage(videoId, sceneId);
}

export async function regenerateAllVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  return generateVideoVisuals(videoId);
}
