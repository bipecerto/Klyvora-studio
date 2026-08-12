import { safeApiFetch } from './apiClient';
import { VideoSceneRecord, applyGeneratedVisualsLocally, getVideoScenes, updateVideoScene } from './videoService';

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

export async function generateVideoVisuals(
  videoId: string,
  onProgress?: (done: number, total: number, scene: VideoSceneRecord) => void
): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const localScenes = await getVideoScenes(videoId).catch(() => []);
  if (!localScenes.length) {
    throw new Error('Nenhuma cena disponível para gerar imagens.');
  }

  // Gera uma cena por vez (em vez de uma chamada única com todas as cenas):
  // sem Supabase Storage, cada imagem volta em base64 na resposta — juntar
  // dezenas delas numa resposta só estoura o limite de payload da Vercel
  // (HTTP 413). Chamando uma de cada vez, cada resposta fica pequena.
  const results: VideoSceneRecord[] = [];
  for (let i = 0; i < localScenes.length; i++) {
    const scene = localScenes[i];
    try {
      const updated = await generateSceneImage(videoId, scene.id);
      results.push(updated);
    } catch (err: any) {
      results.push({
        ...scene,
        visual_status: 'failed',
        visual_error: err.message || 'Falha ao gerar imagem.',
      } as VideoSceneRecord);
    }
    onProgress?.(i + 1, localScenes.length, results[results.length - 1]);
  }

  return { success: true, scenes: results };
}

export async function regenerateSceneImage(videoId: string, sceneId: string): Promise<VideoSceneRecord> {
  return generateSceneImage(videoId, sceneId);
}

export async function regenerateAllVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  return generateVideoVisuals(videoId);
}

export async function searchStockAssets(
  query: string,
  sceneId?: string,
  topic?: string
): Promise<{ success: boolean; scene_id?: string; assets: any[] }> {
  return safeApiFetch('/api/search-stock-assets', {
    method: 'POST',
    body: JSON.stringify({ query, scene_id: sceneId, topic }),
  });
}

export async function updateSceneVisual(params: {
  scene_id: string;
  video_id?: string;
  visual_url: string;
  visual_source_used: string;
  stock_provider?: string;
  stock_asset_id?: string;
  stock_attribution?: string;
}): Promise<VideoSceneRecord> {
  const updated = await updateVideoScene(params.scene_id, {
    visual_url: params.visual_url,
    visual_status: 'ready',
    visual_error: null,
  } as Partial<VideoSceneRecord>);

  if (params.video_id) {
    applyGeneratedVisualsLocally(params.video_id, [updated]);
  }

  return updated;
}

export async function retryMissingVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const scenes = await getVideoScenes(videoId).catch(() => []);
  const missing = scenes.filter((s) => !s.visual_url || s.visual_status === 'failed');
  if (!missing.length) {
    return { success: true, scenes };
  }

  for (const scene of missing) {
    try {
      await generateSceneImage(videoId, scene.id);
    } catch (err) {
      console.warn(`Falha ao regenerar a cena ${scene.id}:`, err);
    }
  }

  const merged = await getVideoScenes(videoId).catch(() => scenes);
  return { success: true, scenes: merged };
}
