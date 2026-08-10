import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface VideoRecord {
  id: string;
  user_id: string;
  series_id: string | null;
  series_name?: string;
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
  created_at: string;
  updated_at: string;
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
  duration: number | null;
  created_at: string;
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

