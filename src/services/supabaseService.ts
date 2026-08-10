import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Series, Video, MediaAsset, UserProfile } from '../types';

// Initial Mock Data when Supabase is not connected or empty
export const MOCK_SERIES: Series[] = [
  {
    id: 's1',
    user_id: 'u1',
    name: 'Carros Clássicos Britânicos',
    niche: 'Automotivo',
    description: 'Análises aprofundadas sobre automóveis vintage britânicos icônicos, de Jaguar a Aston Martin.',
    language: 'Português (BR)',
    duration: '30s',
    platform: 'TikTok',
    content_style: 'Documentary',
    voice_gender: 'Male',
    voice_style: 'Narrator',
    visual_source: 'AI Images',
    visual_style: 'Cinematic',
    captions_enabled: true,
    caption_style: 'Hormozi',
    status: 'Active',
    thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
    video_count: 3,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's2',
    user_id: 'u1',
    name: 'Mistérios e Histórias Sombrias',
    niche: 'Terror',
    description: 'Narração de crimes reais intrigantes e lendas urbanas com atmosfera visual de suspense.',
    language: 'Português (BR)',
    duration: '60s',
    platform: 'YouTube Shorts',
    content_style: 'Storytelling',
    voice_gender: 'Male',
    voice_style: 'Deep',
    visual_source: 'AI Video',
    visual_style: 'Dark',
    captions_enabled: true,
    caption_style: 'Bold',
    status: 'Active',
    thumbnail_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    video_count: 8,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's3',
    user_id: 'u1',
    name: 'Fatos Impressionantes do Espaço',
    niche: 'Ciência',
    description: 'Fenômenos cósmicos surpreendentes do universo explicados em vídeos curtos e dinâmicos.',
    language: 'Português (BR)',
    duration: '30s',
    platform: 'Instagram Reels',
    content_style: 'Facts',
    voice_gender: 'Female',
    voice_style: 'Energetic',
    visual_source: 'AI Video',
    visual_style: 'Cinematic',
    captions_enabled: true,
    caption_style: 'Dynamic',
    status: 'Active',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    video_count: 5,
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_VIDEOS: Video[] = [
  {
    id: 'v1',
    user_id: 'u1',
    series_id: 's1',
    series_name: 'Carros Clássicos Britânicos',
    title: 'A Lendária História do Jaguar E-Type',
    topic: 'Como o Jaguar E-Type de 1961 impressionou Enzo Ferrari e se tornou um ícone atemporal.',
    status: 'Ready',
    progress: 100,
    duration: '00:30',
    thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    script: 'Quando Enzo Ferrari viu o Jaguar E-Type pela primeira vez em 1961, ele o chamou de "o carro mais bonito já feito". Com velocidade máxima de 240 km/h e curvas aerodinâmicas inspiradas na aviação, ele mudou o design de carros esportivos para sempre.',
    scenes: [
      { id: 1, time: '00:00 - 00:06', text: 'Revelação no Salão de Genebra de 1961', visual_description: 'Zoom cinematográfico na grade cromada clássica', audio_cue: 'Ronco de motor e síntese marcante' },
      { id: 2, time: '00:06 - 00:15', text: 'Destaque para a frase de Enzo Ferrari', visual_description: 'Efeito de fotografia monocromática vintage', audio_cue: 'Locução marcante do narrador' },
      { id: 3, time: '00:15 - 00:30', text: 'Demonstração de alta velocidade', visual_description: 'Carro acelerando em rodovia ao pôr do sol em 4K', audio_cue: 'Crescendo musical inspirador' }
    ],
    captions_text: 'QUANDO ENZO FERRARI VIU O JAGUAR E-TYPE... ELE O CHAMOU DE O CARRO MAIS BONITO JÁ FEITO!',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'v2',
    user_id: 'u1',
    series_id: 's2',
    series_name: 'Mistérios e Histórias Sombrias',
    title: 'O Mistério Não Solucionado do Quarto 1046',
    topic: 'O misterioso hóspede chamado Roland T. Owen e as estranhas ligações telefônicas.',
    status: 'Ready',
    progress: 100,
    duration: '00:58',
    thumbnail_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    script: 'Em janeiro de 1935, um homem que deu entrada no Hotel President não tinha bagagem e recusava luz em seu quarto. O que os detetives encontraram 48 horas depois continua sendo um dos casos não solucionados mais obscuros da história.',
    scenes: [
      { id: 1, time: '00:00 - 00:12', text: 'Corredor do hotel com iluminação fraca', visual_description: 'Luz fraca piscando ao longo do corredor', audio_cue: 'Zumbido grave e sombrio de fundo' },
      { id: 2, time: '00:12 - 00:35', text: 'A misteriosa chamada telefônica', visual_description: 'Close-up de telefone antigo com silhueta', audio_cue: 'Tremolo tenso de violino' }
    ],
    captions_text: 'EM 1935... O QUARTO 1046 GUARDAVA UM SEGREDO QUE NUNCA FOI REVELADO.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'v3',
    user_id: 'u1',
    series_id: 's3',
    series_name: 'Fatos Impressionantes do Espaço',
    title: 'Estrelas de Nêutrons: 1 Colher Pesa 6 Bilhões de Toneladas',
    topic: 'A incrível densidade dos restos estelares colapsados.',
    status: 'Ready',
    progress: 100,
    duration: '00:28',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    script: 'Se você pudesse pegar uma única colher de chá de material de uma estrela de nêutrons, ela pesaria mais de 6 bilhões de toneladas na Terra — equivalente ao peso do Monte Everest comprimido em um dedal!',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const MOCK_ASSETS: MediaAsset[] = [
  {
    id: 'a1',
    user_id: 'u1',
    title: 'Renderização do Jaguar E-type em Velocidade',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&auto=format&fit=crop&q=80',
    file_size: '2.4 MB',
    tags: ['Automotivo', 'Clássico', 'Gerado por IA'],
    created_at: new Date().toISOString()
  },
  {
    id: 'a2',
    user_id: 'u1',
    title: 'Atmosfera Espacial de Nebulosa',
    type: 'video',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80',
    file_size: '14.2 MB',
    duration: '00:15',
    tags: ['Espaço', '4K', 'Vídeo com IA'],
    created_at: new Date().toISOString()
  },
  {
    id: 'a3',
    user_id: 'u1',
    title: 'Locução Grave - Carros Britânicos',
    type: 'audio',
    url: '#',
    file_size: '1.1 MB',
    duration: '00:30',
    tags: ['Narração', 'Voz Masculina', 'Português (BR)'],
    created_at: new Date().toISOString()
  }
];

// Helper to manage persistent local storage state when Supabase DB is offline or empty
const STORAGE_KEYS = {
  SERIES: 'klyvora_series_data',
  VIDEOS: 'klyvora_videos_data',
  ASSETS: 'klyvora_assets_data',
};

export const getLocalSeries = (): Series[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.SERIES);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(MOCK_SERIES));
    return MOCK_SERIES;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return MOCK_SERIES;
  }
};

export const saveLocalSeries = (list: Series[]) => {
  localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(list));
};

export const getLocalVideos = (): Video[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.VIDEOS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(MOCK_VIDEOS));
    return MOCK_VIDEOS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return MOCK_VIDEOS;
  }
};

export const saveLocalVideos = (list: Video[]) => {
  localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(list));
};

// Supabase DB Operations with automatic local fallback
export const supabaseService = {
  // --- SERIES ---
  async fetchSeries(userId: string): Promise<Series[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('series')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Series[];
        }
      } catch (e) {
        console.warn('Supabase fetchSeries fallback:', e);
      }
    }
    return getLocalSeries();
  },

  async createSeries(seriesData: Omit<Series, 'id' | 'created_at' | 'updated_at'>): Promise<Series> {
    const newSeries: Series = {
      ...seriesData,
      id: 'ser_' + Math.random().toString(36).substr(2, 9),
      thumbnail_url: seriesData.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      video_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('series')
          .insert([newSeries])
          .select()
          .single();

        if (!error && data) {
          const updatedLocal = [data as Series, ...getLocalSeries()];
          saveLocalSeries(updatedLocal);
          return data as Series;
        }
      } catch (e) {
        console.warn('Supabase createSeries fallback:', e);
      }
    }

    const current = getLocalSeries();
    const updated = [newSeries, ...current];
    saveLocalSeries(updated);
    return newSeries;
  },

  async updateSeriesStatus(seriesId: string, status: 'Active' | 'Paused'): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('series')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', seriesId);
      } catch (e) {
        console.warn('Supabase updateSeriesStatus error:', e);
      }
    }
    const current = getLocalSeries();
    const updated = current.map((s) => (s.id === seriesId ? { ...s, status } : s));
    saveLocalSeries(updated);
  },

  // --- VIDEOS ---
  async fetchVideos(userId: string): Promise<Video[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Video[];
        }
      } catch (e) {
        console.warn('Supabase fetchVideos fallback:', e);
      }
    }
    return getLocalVideos();
  },

  async createVideo(videoData: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<Video> {
    const newVid: Video = {
      ...videoData,
      id: 'vid_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .insert([newVid])
          .select()
          .single();

        if (!error && data) {
          const updatedLocal = [data as Video, ...getLocalVideos()];
          saveLocalVideos(updatedLocal);
          return data as Video;
        }
      } catch (e) {
        console.warn('Supabase createVideo fallback:', e);
      }
    }

    const current = getLocalVideos();
    const updated = [newVid, ...current];
    saveLocalVideos(updated);
    return newVid;
  },

  async updateVideo(videoId: string, updates: Partial<Video>): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('videos')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', videoId);
      } catch (e) {
        console.warn('Supabase updateVideo error:', e);
      }
    }
    const current = getLocalVideos();
    const updated = current.map((v) => (v.id === videoId ? { ...v, ...updates } : v));
    saveLocalVideos(updated);
  },

  async deleteVideo(videoId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('videos').delete().eq('id', videoId);
      } catch (e) {
        console.warn('Supabase deleteVideo error:', e);
      }
    }
    const current = getLocalVideos();
    const updated = current.filter((v) => v.id !== videoId);
    saveLocalVideos(updated);
  }
};
