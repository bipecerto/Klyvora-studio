import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface VideoRecord {
  id: string;
  user_id: string;
  series_id: string | null;
  series_name?: string;
  series?: { name?: string } | null;
  title: string;
  topic: string | null;
  script: string | null;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  progress: number;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null; // duration in seconds
  error_message: string | null;
  narration_url?: string | null;
  narration_storage_path?: string | null;
  narration_voice?: string | null;
  narration_duration?: number | null;
  narration_status?: 'pending' | 'generating' | 'ready' | 'failed' | string | null;
  music_url?: string | null;
  aspect_ratio?: '9:16' | '16:9' | string | null;
  video_format?: string | null;
  caption_style?: string | null;
  youtube_title?: string | null;
  youtube_description?: string | null;
  youtube_tags?: string | null;
  render_status?: 'pending' | 'processing' | 'ready' | 'failed' | string | null;
  render_progress?: number | null;
  render_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoCaptionRecord {
  id?: string;
  video_id?: string;
  caption_order?: number;
  start_time: number;
  end_time: number;
  text: string;
}

export interface VideoSceneRecord {
  id: string;
  video_id: string;
  user_id: string;
  scene_order: number;
  text: string | null;
  visual_prompt: string | null;
  visual_url: string | null;
  visual_storage_path?: string | null;
  visual_status?: 'pending' | 'generating' | 'ready' | 'failed' | string | null;
  visual_error?: string | null;
  visual_generated_at?: string | null;
  visual_source_used?: string | null;
  stock_provider?: string | null;
  stock_asset_id?: string | null;
  stock_attribution?: string | null;
  duration: number | null;
  created_at: string;
}

export interface VideoChapterRecord {
  id: string;
  video_id: string;
  user_id: string;
  chapter_order: number;
  title: string;
  description?: string;
  script?: string;
  target_duration?: number;
  actual_duration?: number;
  status?: 'pending' | 'generating' | 'ready' | 'failed';
  narration_url?: string;
  narration_storage_path?: string;
  render_status?: 'pending' | 'processing' | 'ready' | 'failed';
  segment_video_url?: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80';

const LOCAL_VIDEOS_KEY = 'klyvora_local_videos';
const LOCAL_SCENES_KEY = 'klyvora_local_scenes';

function getLocalVideos(): VideoRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalVideos(list: VideoRecord[]) {
  try {
    localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(list));
  } catch (_) {}
}

function getLocalScenes(): VideoSceneRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SCENES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScenes(list: VideoSceneRecord[]) {
  try {
    localStorage.setItem(LOCAL_SCENES_KEY, JSON.stringify(list));
  } catch (_) {}
}

export async function getVideos(): Promise<VideoRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('videos')
          .select('*, series(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((v: any) => ({
            ...v,
            series_name: v.series?.name || 'Unassigned',
            thumbnail_url: v.thumbnail_url || DEFAULT_THUMBNAIL,
          }));
        }
      }
    } catch (err) {
      console.warn('Supabase fetch videos failed, trying local:', err);
    }
  }

  return getLocalVideos();
}

export async function getVideosBySeries(seriesId: string): Promise<VideoRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('videos')
          .select('*, series(name)')
          .eq('series_id', seriesId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((v: any) => ({
            ...v,
            series_name: v.series?.name || 'Unassigned',
            thumbnail_url: v.thumbnail_url || DEFAULT_THUMBNAIL,
          }));
        }
      }
    } catch (err) {
      console.warn('Supabase fetch videos by series failed:', err);
    }
  }

  return getLocalVideos().filter((v) => v.series_id === seriesId);
}

export async function getVideoScenes(videoId: string): Promise<VideoSceneRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('video_scenes')
          .select('*')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .order('scene_order', { ascending: true });

        if (!error && data) return data;
      }
    } catch (err) {
      console.warn('Supabase fetch video scenes failed:', err);
    }
  }

  return getLocalScenes()
    .filter((s) => s.video_id === videoId)
    .sort((a, b) => a.scene_order - b.scene_order);
}

export async function getVideoById(id: string): Promise<(VideoRecord & { video_scenes?: VideoSceneRecord[] }) | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('videos')
          .select('*, series(name), video_scenes(*)')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          const sortedScenes = Array.isArray(data.video_scenes)
            ? [...data.video_scenes].sort((a: any, b: any) => a.scene_order - b.scene_order)
            : [];

          return {
            ...data,
            series_name: data.series?.name || 'Unassigned',
            thumbnail_url: data.thumbnail_url || DEFAULT_THUMBNAIL,
            video_scenes: sortedScenes,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase getVideoById failed, fallback to local:', err);
    }
  }

  const localVideo = getLocalVideos().find((v) => v.id === id);
  if (!localVideo) return null;

  const localScenes = getLocalScenes()
    .filter((s) => s.video_id === id)
    .sort((a, b) => a.scene_order - b.scene_order);

  return {
    ...localVideo,
    video_scenes: localScenes,
  };
}

export async function createVideo(data: {
  series_id?: string;
  topic?: string;
  title?: string;
  status?: 'draft' | 'generating' | 'ready' | 'failed';
  progress?: number;
  duration?: number;
  thumbnail_url?: string;
}): Promise<VideoRecord> {
  const payload = {
    series_id: data.series_id || null,
    topic: data.topic || null,
    title: data.title || data.topic || 'Untitled Video Draft',
    script: null,
    status: data.status || 'draft',
    progress: data.progress ?? 0,
    duration: data.duration || 60,
    thumbnail_url: data.thumbnail_url || DEFAULT_THUMBNAIL,
    video_url: null,
    error_message: null,
    aspect_ratio: '16:9',
    video_format: 'long_form',
  };

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: inserted, error } = await supabase
          .from('videos')
          .insert({ ...payload, user_id: user.id })
          .select('*, series(name)')
          .single();

        if (!error && inserted) {
          return {
            ...inserted,
            series_name: inserted.series?.name || 'Unassigned',
            thumbnail_url: inserted.thumbnail_url || DEFAULT_THUMBNAIL,
          };
        }
        if (error) console.error('Supabase createVideo error:', error);
      }
    } catch (err) {
      console.warn('Supabase createVideo failed, saving to local store:', err);
    }
  }

  // Local storage fallback
  const newVideo: VideoRecord = {
    id: crypto.randomUUID(),
    user_id: 'local-user',
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = getLocalVideos();
  saveLocalVideos([newVideo, ...list]);
  return newVideo;
}

export async function updateVideo(id: string, updates: Partial<VideoRecord>): Promise<VideoRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updated, error } = await supabase
          .from('videos')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select('*, series(name)')
          .single();

        if (!error && updated) {
          return {
            ...updated,
            series_name: updated.series?.name || 'Unassigned',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase updateVideo failed:', err);
    }
  }

  const list = getLocalVideos();
  const idx = list.findIndex((v) => v.id === id);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalVideos(list);
    return list[idx];
  }

  throw new Error('Video not found to update');
}

export async function deleteVideo(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('videos')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.warn('Supabase deleteVideo failed:', err);
    }
  }

  const list = getLocalVideos();
  saveLocalVideos(list.filter((v) => v.id !== id));
}


export function applyGeneratedScriptLocally(videoId: string, data: { topic?: string; title?: string; script?: string; scenes?: any[] }) {
  const videos = getLocalVideos();
  const videoIndex = videos.findIndex((v) => v.id === videoId);
  if (videoIndex !== -1) {
    videos[videoIndex] = {
      ...videos[videoIndex],
      topic: data.topic ?? videos[videoIndex].topic,
      title: data.title ?? videos[videoIndex].title,
      script: data.script ?? videos[videoIndex].script,
      status: 'draft',
      progress: 100,
      error_message: null,
      updated_at: new Date().toISOString(),
    };
    saveLocalVideos(videos);
  }

  if (Array.isArray(data.scenes)) {
    const existing = getLocalScenes().filter((scene) => scene.video_id !== videoId);
    const now = new Date().toISOString();
    const generated = data.scenes.map((scene: any, index: number) => ({
      id: scene.id || crypto.randomUUID(),
      video_id: videoId,
      user_id: 'local-user',
      scene_order: Number(scene.scene_order) || index + 1,
      text: scene.text || '',
      visual_prompt: scene.visual_prompt || '',
      visual_url: null,
      visual_storage_path: null,
      visual_status: 'pending',
      visual_error: null,
      visual_generated_at: null,
      duration: Number(scene.duration) || 5,
      created_at: now,
    }));
    saveLocalScenes([...existing, ...generated]);
  }
}

export function applyGeneratedNarrationLocally(videoId: string, narration: { narration_url: string; narration_voice?: string; narration_duration?: number }) {
  const videos = getLocalVideos();
  const videoIndex = videos.findIndex((v) => v.id === videoId);
  if (videoIndex === -1) return;
  videos[videoIndex] = {
    ...videos[videoIndex],
    narration_url: narration.narration_url,
    narration_voice: narration.narration_voice || 'beta-free',
    narration_duration: narration.narration_duration || null,
    narration_status: 'ready',
    updated_at: new Date().toISOString(),
  };
  saveLocalVideos(videos);
}

export function applyGeneratedVisualsLocally(videoId: string, scenes: VideoSceneRecord[]) {
  const existing = getLocalScenes();
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const merged = existing.map((scene) => scene.video_id === videoId && byId.has(scene.id) ? { ...scene, ...byId.get(scene.id)! } : scene);
  for (const scene of scenes) {
    if (!merged.some((item) => item.id === scene.id)) merged.push(scene);
  }
  saveLocalScenes(merged);

  const firstReady = scenes.find((scene) => scene.visual_url && scene.visual_status === 'ready');
  if (firstReady?.visual_url) {
    const videos = getLocalVideos();
    const index = videos.findIndex((video) => video.id === videoId);
    if (index !== -1) {
      videos[index] = { ...videos[index], thumbnail_url: firstReady.visual_url, progress: 85, updated_at: new Date().toISOString() };
      saveLocalVideos(videos);
    }
  }
}

export async function updateVideoScene(sceneId: string, updates: Partial<VideoSceneRecord>): Promise<VideoSceneRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updated, error } = await supabase
          .from('video_scenes')
          .update(updates)
          .eq('id', sceneId)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (!error && updated) {
          return updated;
        }
      }
    } catch (err) {
      console.warn('Supabase updateVideoScene failed:', err);
    }
  }

  const list = getLocalScenes();
  const idx = list.findIndex((s) => s.id === sceneId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    saveLocalScenes(list);
    return list[idx];
  }

  throw new Error('Scene not found to update');
}


const LOCAL_CAPTIONS_KEY = 'klyvora_local_captions';
const LOCAL_CHAPTERS_KEY = 'klyvora_local_chapters';

function getLocalCaptions(): (VideoCaptionRecord & { id: string; video_id: string })[] {
  try {
    const raw = localStorage.getItem(LOCAL_CAPTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCaptions(list: (VideoCaptionRecord & { id: string; video_id: string })[]) {
  try {
    localStorage.setItem(LOCAL_CAPTIONS_KEY, JSON.stringify(list));
  } catch (_) {}
}

function getLocalChapters(): VideoChapterRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAPTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Busca as legendas já geradas para o vídeo (Supabase, com fallback local).
 */
export async function getVideoCaptions(videoId: string): Promise<(VideoCaptionRecord & { id: string })[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('video_captions')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getVideoCaptions failed, using local:', err);
    }
  }
  return getLocalCaptions().filter((c) => c.video_id === videoId) as any;
}

/**
 * Vídeos longos (long_form) são divididos em capítulos; para os demais, retorna vazio.
 */
export async function getVideoChapters(videoId: string): Promise<VideoChapterRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('video_chapters')
        .select('*')
        .eq('video_id', videoId)
        .order('chapter_order', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getVideoChapters failed, using local:', err);
    }
  }
  return getLocalChapters().filter((c) => c.video_id === videoId);
}

/**
 * Gera as legendas a partir do roteiro + duração real da narração, no
 * navegador — mesmo princípio de estimativa por peso de palavra usado no
 * motor do faceless-web (sem depender de um serviço de transcrição externo).
 */
export async function generateCaptions(videoId: string): Promise<(VideoCaptionRecord & { id: string })[]> {
  const { estimateWordTimings } = await import('../lib/local-render/sceneTimeline');
  const video = await getVideoById(videoId);
  if (!video?.script) throw new Error('Roteiro ausente para gerar legendas.');
  const totalDuration = video.narration_duration || Math.max(5, Math.round((video.script.split(/\s+/).length || 1) / 2.5));

  const estimated = estimateWordTimings(video.script, totalDuration);
  const rows = estimated.map((c) => ({ ...c, video_id: videoId }));

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('video_captions').delete().eq('video_id', videoId);
        const { data, error } = await supabase
          .from('video_captions')
          .insert(rows.map((r) => ({ ...r, user_id: user.id })))
          .select('*');
        if (!error && data) return data;
      }
    } catch (err) {
      console.warn('Supabase generateCaptions failed, using local:', err);
    }
  }

  const existing = getLocalCaptions().filter((c) => c.video_id !== videoId);
  saveLocalCaptions([...existing, ...rows] as any);
  return rows as any;
}

/**
 * Edita o texto de uma legenda específica.
 */
export async function updateVideoCaption(
  captionId: string,
  updates: Partial<VideoCaptionRecord>
): Promise<VideoCaptionRecord & { id: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('video_captions')
        .update(updates)
        .eq('id', captionId)
        .select('*')
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase updateVideoCaption failed:', err);
    }
  }

  const list = getLocalCaptions();
  const idx = list.findIndex((c) => c.id === captionId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates } as any;
    saveLocalCaptions(list);
    return list[idx] as any;
  }
  throw new Error('Legenda não encontrada para atualizar.');
}

/**
 * O render em nuvem (FFmpeg em servidor) foi descontinuado nesta versão —
 * a Vercel não é um bom ambiente para renderização de vídeo pesada e de
 * longa duração. Use "Render Local" (motor no navegador, canvas +
 * MediaRecorder), que é o mesmo princípio usado no faceless-web e já
 * funciona de ponta a ponta sem depender de infraestrutura de servidor.
 */
export async function renderVideo(_videoId: string): Promise<never> {
  throw new Error(
    'O render na nuvem foi descontinuado. Use o "Render Local" — ele roda inteiramente no seu navegador e não depende de servidor.'
  );
}

/**
 * Mantido por compatibilidade com o polling da UI; como não há mais render
 * em nuvem, apenas relê o registro do vídeo do banco/local.
 */
export async function pollVideoStatus(videoId: string): Promise<{
  render_status?: string | null;
  render_progress?: number | null;
  render_error?: string | null;
}> {
  const video = await getVideoById(videoId);
  return {
    render_status: video?.render_status ?? null,
    render_progress: video?.render_progress ?? null,
    render_error: video?.render_error ?? null,
  };
}
