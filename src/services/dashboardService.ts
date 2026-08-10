import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSeries, SeriesRecord } from './seriesService';
import { getVideos, VideoRecord } from './videoService';

export interface DashboardStats {
  totalSeries: number;
  activeSeries: number;
  pausedSeries: number;
  totalVideos: number;
  videosThisMonth: number;
  credits: number;
  plan: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentSeries: SeriesRecord[];
  recentVideos: VideoRecord[];
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    return {
      stats: {
        totalSeries: 0,
        activeSeries: 0,
        pausedSeries: 0,
        totalVideos: 0,
        videosThisMonth: 0,
        credits: 100,
        plan: 'free',
      },
      recentSeries: [],
      recentVideos: [],
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      stats: {
        totalSeries: 0,
        activeSeries: 0,
        pausedSeries: 0,
        totalVideos: 0,
        videosThisMonth: 0,
        credits: 100,
        plan: 'free',
      },
      recentSeries: [],
      recentVideos: [],
    };
  }

  // 1. Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', user.id)
    .maybeSingle();

  // 2. Fetch series & videos concurrently
  const [allSeries, allVideos] = await Promise.all([
    getSeries(),
    getVideos(),
  ]);

  const activeSeriesCount = allSeries.filter((s) => s.status === 'active').length;
  const pausedSeriesCount = allSeries.filter((s) => s.status === 'paused').length;

  // Calculate videos this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const videosThisMonthCount = allVideos.filter((v) => v.created_at >= startOfMonth).length;

  return {
    stats: {
      totalSeries: allSeries.length,
      activeSeries: activeSeriesCount,
      pausedSeries: pausedSeriesCount,
      totalVideos: allVideos.length,
      videosThisMonth: videosThisMonthCount,
      credits: profile?.credits ?? 100,
      plan: profile?.plan || 'free',
    },
    recentSeries: allSeries.slice(0, 3),
    recentVideos: allVideos.slice(0, 4),
  };
}
