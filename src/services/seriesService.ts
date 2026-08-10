import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SeriesRecord {
  id: string;
  user_id: string;
  name: string;
  niche: string | null;
  description: string | null;
  language: string;
  duration: number;
  platforms: string[];
  content_style: string | null;
  tone: string | null;
  voice_gender: string | null;
  voice_style: string | null;
  voice_id: string | null;
  visual_source: string | null;
  visual_style: string | null;
  image_frequency: string | null;
  captions_enabled: boolean;
  caption_style: string | null;
  caption_position: string | null;
  highlight_keywords: boolean;
  status: 'active' | 'paused';
  created_at: string;
  updated_at: string;
  video_count?: number;
}

const LOCAL_SERIES_KEY = 'klyvora_local_series';

function getLocalSeries(): SeriesRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SERIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSeries(list: SeriesRecord[]) {
  try {
    localStorage.setItem(LOCAL_SERIES_KEY, JSON.stringify(list));
  } catch (_) {}
}

export async function getSeries(): Promise<SeriesRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('series')
          .select('*, videos(count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((item: any) => ({
            ...item,
            status: (item.status === 'paused' ? 'paused' : 'active') as 'active' | 'paused',
            video_count: item.videos && item.videos[0] ? item.videos[0].count : 0,
          }));
        }
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local series:', err);
    }
  }

  return getLocalSeries();
}

export async function getSeriesById(id: string): Promise<SeriesRecord | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('series')
          .select('*, videos(count)')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          return {
            ...data,
            status: (data.status === 'paused' ? 'paused' : 'active') as 'active' | 'paused',
            video_count: data.videos && data.videos[0] ? data.videos[0].count : 0,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase fetch by ID failed, trying local series:', err);
    }
  }

  const localList = getLocalSeries();
  return localList.find((s) => s.id === id) || null;
}

export async function createSeries(data: {
  name: string;
  niche?: string;
  description?: string;
  language?: string;
  duration?: number;
  platforms?: string[];
  content_style?: string;
  tone?: string;
  voice_gender?: string;
  voice_style?: string;
  voice_id?: string;
  visual_source?: string;
  visual_style?: string;
  image_frequency?: string;
  captions_enabled?: boolean;
  caption_style?: string;
  caption_position?: string;
  highlight_keywords?: boolean;
}): Promise<SeriesRecord> {
  const payload = {
    name: data.name,
    niche: data.niche || 'General',
    description: data.description || '',
    language: data.language || 'English',
    duration: data.duration || 60,
    platforms: data.platforms || ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    content_style: data.content_style || 'Documentary',
    tone: data.tone || 'Dramatic',
    voice_gender: data.voice_gender || 'Male',
    voice_style: data.voice_style || 'Deep',
    voice_id: data.voice_id || 'george',
    visual_source: data.visual_source || 'AI Images',
    visual_style: data.visual_style || 'Cinematic',
    image_frequency: data.image_frequency || 'Every 3 seconds',
    captions_enabled: data.captions_enabled ?? true,
    caption_style: data.caption_style || 'Hormozi',
    caption_position: data.caption_position || 'Center',
    highlight_keywords: data.highlight_keywords ?? true,
    status: 'active' as const,
  };

  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: inserted, error } = await supabase
          .from('series')
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();

        if (!error && inserted) {
          return {
            ...inserted,
            status: 'active',
            video_count: 0,
          };
        }
        if (error) console.error('Supabase createSeries error:', error);
      }
    } catch (err) {
      console.warn('Supabase createSeries failed, saving to local state:', err);
    }
  }

  // Local storage fallback
  const newSeries: SeriesRecord = {
    id: crypto.randomUUID(),
    user_id: 'local-user',
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    video_count: 0,
  };

  const localList = getLocalSeries();
  saveLocalSeries([newSeries, ...localList]);
  return newSeries;
}

export async function updateSeries(id: string, updates: Partial<SeriesRecord>): Promise<SeriesRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updated, error } = await supabase
          .from('series')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error && updated) return updated;
      }
    } catch (err) {
      console.warn('Supabase updateSeries failed, fallback to local:', err);
    }
  }

  const localList = getLocalSeries();
  const idx = localList.findIndex((s) => s.id === id);
  if (idx !== -1) {
    localList[idx] = {
      ...localList[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalSeries(localList);
    return localList[idx];
  }

  throw new Error('Series not found to update');
}

export async function setSeriesStatus(id: string, status: 'active' | 'paused'): Promise<void> {
  await updateSeries(id, { status });
}

export async function deleteSeries(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('series')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.warn('Supabase deleteSeries failed:', err);
    }
  }

  const localList = getLocalSeries();
  saveLocalSeries(localList.filter((s) => s.id !== id));
}

