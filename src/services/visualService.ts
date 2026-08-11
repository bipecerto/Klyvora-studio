import { safeApiFetch } from './apiClient';
import { VideoSceneRecord, applyGeneratedVisualsLocally, getVideoScenes } from './videoService';

export async function generateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  const localScenes = await getVideoScenes(videoId).catch(() => []);
  const localScene = localScenes.find((scene) => scene.id === sceneId);

  const data = await safeApiFetch<{ success: boolean; scene: VideoSceneRecord; error?: string }>('/api/generate-scene-image', {
    method: 'POST',
    body: JSON.stringify({ video_id: videoId, scene_id: sceneId, scene: localScene }),
  });

  if (data?.scene) {
    applyGeneratedVisualsLocally(videoId, [data.scene]);
    return data.scene;
  }

  throw new Error(data?.error || 'Falha ao gerar imagem para a cena.');
}

export async function generateVideoVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const localScenes = await getVideoScenes(videoId).catch(() => []);

  const data = await safeApiFetch<{ success: boolean; scenes: VideoSceneRecord[] }>('/api/generate-video-visuals', {
    method: 'POST',
    body: JSON.stringify({ video_id: videoId, scenes: localScenes }),
  });

  if (Array.isArray(data?.scenes)) {
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
