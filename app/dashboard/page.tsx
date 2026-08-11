'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/common/StatCard';
import { SeriesCard } from '@/components/common/SeriesCard';
import { VideoCard } from '@/components/common/VideoCard';
import { Layers, PlaySquare, Calendar, Sparkles, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { getDashboardData, DashboardStats } from '@/services/dashboardService';
import { setSeriesStatus, deleteSeries, SeriesRecord } from '@/services/seriesService';
import { deleteVideo, VideoRecord } from '@/services/videoService';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalSeries: 0,
    activeSeries: 0,
    pausedSeries: 0,
    totalVideos: 0,
    videosThisMonth: 0,
    credits: 100,
    plan: 'free',
  });
  const [recentSeries, setRecentSeries] = useState<SeriesRecord[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Creator';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData();
      setStats(data.stats);
      setRecentSeries(data.recentSeries);
      setRecentVideos(data.recentVideos);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePauseToggle = async (id: string) => {
    const target = recentSeries.find((s) => s.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'paused' : 'active';

    setRecentSeries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );

    try {
      await setSeriesStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      loadData();
    }
  };

  const handleDeleteSeries = async (id: string) => {
    setRecentSeries((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSeries(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete series:', err);
      loadData();
    }
  };

  const handleDeleteVideo = async (id: string) => {
    setRecentVideos((prev) => prev.filter((v) => v.id !== id));
    try {
      await deleteVideo(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete video:', err);
      loadData();
    }
  };

  return (
    <AppLayout title="Dashboard">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {displayName}
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)] mt-1">
            Create and manage your automated AI video series.
          </p>
        </div>

        <button
          onClick={() => router.push('/series/new')}
          className="klyvora-btn-gradient text-white text-[13px] font-semibold px-4 h-[40px] rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Series
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Series"
              value={stats.totalSeries}
              icon={Layers}
              subtext={`${stats.activeSeries} active, ${stats.pausedSeries} paused`}
            />
            <StatCard
              label="Videos created"
              value={stats.totalVideos}
              icon={PlaySquare}
              subtext="Total saved in Supabase"
            />
            <StatCard
              label="Videos this month"
              value={stats.videosThisMonth}
              icon={Calendar}
              subtext="Created this month"
            />
            <StatCard
              label="Credits"
              value={stats.credits.toLocaleString()}
              icon={Sparkles}
              subtext={`${stats.plan.toUpperCase()} plan balance`}
            />
          </div>

          {/* Recent Series Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-white">Recent Series</h3>
                <p className="text-[12px] text-[rgba(255,255,255,0.45)]">
                  Your active video generation pipelines
                </p>
              </div>
              <button
                onClick={() => router.push('/series')}
                className="text-[13px] font-semibold text-[#8B5CF6] hover:text-[#9F7AEA] flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSeries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentSeries.slice(0, 3).map((series) => (
                  <SeriesCard
                    key={series.id}
                    series={series}
                    onPauseToggle={handlePauseToggle}
                    onDelete={handleDeleteSeries}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-3">
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  No series created yet. Start your first automated series!
                </p>
                <button
                  onClick={() => router.push('/series/new')}
                  className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Create Series
                </button>
              </div>
            )}
          </div>

          {/* Recent Videos Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-white">Recent Videos</h3>
                <p className="text-[12px] text-[rgba(255,255,255,0.45)]">
                  Latest generated content ready for publish
                </p>
              </div>
              <button
                onClick={() => router.push('/videos')}
                className="text-[13px] font-semibold text-[#8B5CF6] hover:text-[#9F7AEA] flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentVideos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentVideos.slice(0, 4).map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onDelete={handleDeleteVideo}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-3">
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  No videos created yet.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
