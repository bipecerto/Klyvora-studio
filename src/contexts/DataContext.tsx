import React, { createContext, useContext, useState, useEffect } from 'react';
import { Series, Video, MediaAsset, StatsOverview } from '../types';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from './AuthContext';

interface DataContextType {
  series: Series[];
  videos: Video[];
  assets: MediaAsset[];
  loading: boolean;
  stats: StatsOverview;
  createSeries: (data: Omit<Series, 'id' | 'created_at' | 'updated_at'>) => Promise<Series>;
  updateSeriesStatus: (id: string, status: 'Active' | 'Paused') => Promise<void>;
  getSeriesById: (id: string) => Series | undefined;
  getVideoById: (id: string) => Video | undefined;
  generateVideo: (seriesId: string, topic: string, onProgress?: (step: string, progress: number) => void) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [series, setSeries] = useState<Series[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [seriesData, videosData] = await Promise.all([
        supabaseService.fetchSeries(user.id),
        supabaseService.fetchVideos(user.id),
      ]);
      setSeries(seriesData);
      setVideos(videosData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const stats: StatsOverview = {
    totalSeries: series.length,
    totalVideosCreated: videos.length,
    videosThisMonth: videos.filter(
      (v) => new Date(v.created_at).getMonth() === new Date().getMonth()
    ).length,
    creditsRemaining: user?.credits || 150,
  };

  const createSeries = async (data: Omit<Series, 'id' | 'created_at' | 'updated_at'>) => {
    const userId = user?.id || 'u1';
    const newSeries = await supabaseService.createSeries({ ...data, user_id: userId });
    setSeries((prev) => [newSeries, ...prev]);
    return newSeries;
  };

  const updateSeriesStatus = async (id: string, status: 'Active' | 'Paused') => {
    await supabaseService.updateSeriesStatus(id, status);
    setSeries((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const getSeriesById = (id: string) => series.find((s) => s.id === id);

  const getVideoById = (id: string) => videos.find((v) => v.id === id);

  const generateVideo = async (
    seriesId: string,
    topic: string,
    onProgress?: (step: string, progress: number) => void
  ): Promise<Video> => {
    const parentSeries = getSeriesById(seriesId);
    const seriesName = parentSeries?.name || 'AI Series';

    // Video generation simulation pipeline
    const steps = [
      { name: 'Gerando roteiro', progress: 20 },
      { name: 'Gerando narração de voz', progress: 45 },
      { name: 'Gerando visuais e cenas', progress: 70 },
      { name: 'Criando legendas dinâmicas', progress: 88 },
      { name: 'Renderizando vídeo final em 9:16', progress: 100 },
    ];

    for (const step of steps) {
      if (onProgress) onProgress(step.name, step.progress);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const createdVideo: Omit<Video, 'id' | 'created_at' | 'updated_at'> = {
      user_id: user?.id || 'u1',
      series_id: seriesId,
      series_name: seriesName,
      title: topic || `Episódio #${videos.length + 1} de ${seriesName}`,
      topic,
      status: 'Ready',
      progress: 100,
      duration: parentSeries?.duration === '15s' ? '00:15' : parentSeries?.duration === '60s' ? '00:58' : '00:30',
      thumbnail_url: parentSeries?.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      script: `Roteiro gerado automaticamente para ${topic || seriesName}. Explore perspectivas fascinantes e visuais cinematográficos sob medida para ${parentSeries?.platform || 'Plataformas de Vídeo Curto'}.`,
      scenes: [
        { id: 1, time: '00:00 - 00:08', text: 'Gancho e Introdução', visual_description: 'Zoom dinâmico de alto contraste', audio_cue: 'Grave de impacto atmosférico' },
        { id: 2, time: '00:08 - 00:20', text: 'Revelação da História Principal', visual_description: 'Cena em movimento suave com luzes brilhantes', audio_cue: 'Locução natural por IA' },
        { id: 3, time: '00:20 - 00:30', text: 'Chamada para Ação (CTA)', visual_description: 'Gráfico final incentivando a seguir', audio_cue: 'Efeito sonoro de encerramento' },
      ],
      captions_text: `LEGENDAS GERADAS AUTOMATICAMENTE PARA: ${topic.toUpperCase()}`,
    };

    const newVideo = await supabaseService.createVideo(createdVideo);
    setVideos((prev) => [newVideo, ...prev]);

    // Also update parent series video count
    if (parentSeries) {
      setSeries((prev) =>
        prev.map((s) => (s.id === seriesId ? { ...s, video_count: (s.video_count || 0) + 1 } : s))
      );
    }

    return newVideo;
  };

  const deleteVideo = async (id: string) => {
    await supabaseService.deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        series,
        videos,
        assets,
        loading,
        stats,
        createSeries,
        updateSeriesStatus,
        getSeriesById,
        getVideoById,
        generateVideo,
        deleteVideo,
        refreshData: loadData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
