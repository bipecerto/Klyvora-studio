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

export async function retryMissingVisuals(videoId: string): Promise<{ success: boolean; scenes: VideoSceneRecord[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || 'guest-token';

  const res = await fetch('/api/retry-missing-visuals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao reprocessar visuais ausentes.');
  }

  return await res.json();
}

export async function searchStockAssets(query: string, sceneId?: string, niche?: string): Promise<{ query: string; assets: any[] }> {
  const res = await fetch('/api/stock-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, scene_id: sceneId, niche }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha na busca por Stock Media.');
  }

  return await res.json();
}

export async function updateSceneVisual(payload: {
  scene_id: string;
  video_id?: string;
  visual_url: string;
  visual_source_used: string;
  stock_provider?: string;
  stock_asset_id?: string;
  stock_attribution?: string;
}): Promise<VideoSceneRecord> {
  const res = await fetch('/api/update-scene-visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao atualizar visual da cena.');
  }

  const data = await res.json();
  return data.scene;
}
