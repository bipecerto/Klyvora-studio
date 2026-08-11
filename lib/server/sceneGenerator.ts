export interface FacelessScene {
  id: string;
  narration: string;
  visualPrompt: string;
  duration: number;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'ready' | 'error';
  scene_order?: number;
}

export function formatScriptScenes(rawScenes: any[], defaultDurationSec = 60): FacelessScene[] {
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    return [];
  }

  const count = rawScenes.length;
  const fallbackDuration = Math.max(3, Math.round(defaultDurationSec / count));

  return rawScenes.map((s, index) => {
    const sceneId = s.id || `scene-${index + 1}-${Math.random().toString(36).slice(2, 9)}`;
    const narrationText = String(s.narration || s.text || '').trim();
    const promptText = String(s.visualPrompt || s.visual_prompt || s.prompt || '').trim();
    const dur = Math.max(1, Number(s.duration) || fallbackDuration);
    const imgUrl = s.imageUrl || s.visual_url || s.image_url || null;
    let sceneStatus: 'pending' | 'generating' | 'ready' | 'error' = 'pending';

    if (s.status === 'error' || s.visual_status === 'failed' || s.status === 'failed') {
      sceneStatus = 'error';
    } else if (s.status === 'generating' || s.visual_status === 'generating') {
      sceneStatus = 'generating';
    } else if (imgUrl || s.status === 'ready' || s.visual_status === 'ready') {
      sceneStatus = 'ready';
    }

    return {
      id: sceneId,
      narration: narrationText,
      visualPrompt: promptText || 'A dramatic cinematic scene for a video',
      duration: dur,
      imageUrl: imgUrl,
      status: sceneStatus,
      scene_order: s.scene_order || index + 1,
    };
  });
}
