'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { VideoCard } from '@/components/common/VideoCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { GenerateVideoModal } from '@/components/modals/GenerateVideoModal';
import { VoicePicker } from '@/components/series/VoicePicker';
import { getSeriesById, setSeriesStatus, updateSeries, deleteSeries, SeriesRecord } from '@/services/seriesService';
import { getVideosBySeries, VideoRecord } from '@/services/videoService';
import { Plus, ArrowLeft, Pause, Play, Sparkles, Calendar, Settings, Loader2, Trash2 } from 'lucide-react';

const SeriesDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [series, setSeries] = useState<SeriesRecord | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'schedule' | 'settings'>('videos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Settings form state
  const [voiceIdInput, setVoiceIdInput] = useState('Charon');
  const [voiceStyleInput, setVoiceStyleInput] = useState('Documentary');
  const [visualStyleInput, setVisualStyleInput] = useState('');
  const [captionStyleInput, setCaptionStyleInput] = useState('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const sData = await getSeriesById(id);
      if (sData) {
        setSeries(sData);
        setVoiceIdInput(sData.voice_id || 'Charon');
        setVoiceStyleInput(sData.voice_style || 'Documentary');
        setVisualStyleInput(sData.visual_style || 'Cinematic');
        setCaptionStyleInput(sData.caption_style || 'Hormozi');

        const vData = await getVideosBySeries(id);
        setVideos(vData);
      }
    } catch (err) {
      console.error('Failed to load series details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePauseToggle = async () => {
    if (!series) return;
    const newStatus = series.status === 'active' ? 'paused' : 'active';
    setSeries((prev) => (prev ? { ...prev, status: newStatus } : null));

    try {
      await setSeriesStatus(series.id, newStatus);
    } catch (err) {
      console.error('Failed to update series status:', err);
      loadData();
    }
  };

  const handleUpdateSettings = async () => {
    if (!series) return;
    setIsUpdatingSettings(true);
    try {
      const updated = await updateSeries(series.id, {
        voice_id: voiceIdInput,
        voice_style: voiceStyleInput,
        visual_style: visualStyleInput,
        caption_style: captionStyleInput,
      });
      setSeries((prev) => (prev ? { ...prev, ...updated } : null));
      alert('Series settings saved successfully.');
    } catch (err) {
      console.error('Failed to update series settings:', err);
      alert('Failed to save series settings.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!series) return;
    if (!confirm('Are you sure you want to delete this series?')) return;
    try {
      await deleteSeries(series.id);
      router.push('/series');
    } catch (err) {
      console.error('Failed to delete series:', err);
      alert('Failed to delete series.');
    }
  };

  const handleVideoCreated = () => {
    loadData();
  };

  if (loading) {
    return (
      <AppLayout title="Series Details">
        <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!series) {
    return (
      <AppLayout title="Series Not Found">
        <div className="p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Series Not Found</h3>
          <p className="text-xs text-[rgba(255,255,255,0.5)]">
            The requested series does not exist or was deleted.
          </p>
          <button
            onClick={() => router.push('/series')}
            className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Back to Series List
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Series / ${series.name}`}>
      {/* Back button */}
      <button
        onClick={() => router.push('/series')}
        className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Series
      </button>

      {/* Series Header Card */}
      <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {series.name}
              </h2>
              <StatusBadge status={series.status} />
            </div>
            <p className="text-[14px] text-[rgba(255,255,255,0.55)] max-w-xl">
              {series.description || 'No description provided for this series.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <button
              onClick={handlePauseToggle}
              className="px-4 h-[38px] rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] hover:bg-[#242428] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {series.status === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" /> Resume Series
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Series
                </>
              )}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="klyvora-btn-gradient text-white text-xs font-semibold px-4 h-[38px] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate Video
            </button>
          </div>
        </div>

        {/* Info Badges */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-4 text-xs text-[rgba(255,255,255,0.6)]">
          <div><span className="text-white font-semibold">Niche:</span> {series.niche || 'General'}</div>
          <div><span className="text-white font-semibold">Language:</span> {series.language || 'English'}</div>
          <div><span className="text-white font-semibold">Voice:</span> {series.voice_style || 'Default'}</div>
          <div><span className="text-white font-semibold">Duration:</span> {series.duration || 60}s</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[rgba(255,255,255,0.08)] flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'videos'
              ? 'border-[#8B5CF6] text-white'
              : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
          }`}
        >
          Videos ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-[#8B5CF6] text-white'
              : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-[#8B5CF6] text-white'
              : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
          }`}
        >
          Series Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[rgba(255,255,255,0.5)]">
              All generated episodes for {series.name}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-[#8B5CF6] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Generate Video
            </button>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((vid) => (
                <VideoCard key={vid.id} video={vid} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#141416] border border-[rgba(255,255,255,0.08)] text-center space-y-3">
              <p className="text-xs text-[rgba(255,255,255,0.5)]">
                No videos created in this series yet.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Generate First Video
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="p-8 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Calendar className="w-5 h-5 text-[#8B5CF6]" /> Automated Posting Schedule
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.55)] leading-relaxed max-w-lg">
            Klyvora will automatically render and queue 1 video every day at 18:00 (BRT) directly to your linked social media accounts.
          </p>
          <div className="p-4 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.06)] text-xs text-emerald-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Next scheduled release: Today at 18:00 (1 video ready in queue)
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="p-6 sm:p-8 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 max-w-4xl">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Settings className="w-5 h-5 text-[#8B5CF6]" /> Series Settings
          </div>
          <div className="space-y-6 text-xs text-[rgba(255,255,255,0.7)]">
            <VoicePicker
              selectedVoiceId={voiceIdInput}
              onSelectVoice={(vid) => setVoiceIdInput(vid)}
              selectedVoiceStyle={voiceStyleInput}
              onSelectVoiceStyle={(vst) => setVoiceStyleInput(vst)}
              language={series.language || 'Portuguese'}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <div className="space-y-1">
                <label className="text-white font-semibold">Visual Style</label>
                <input
                  type="text"
                  value={visualStyleInput}
                  onChange={(e) => setVisualStyleInput(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-white outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white font-semibold">Captions Style</label>
                <input
                  type="text"
                  value={captionStyleInput}
                  onChange={(e) => setCaptionStyleInput(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-white outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <button
                onClick={handleUpdateSettings}
                disabled={isUpdatingSettings}
                className="klyvora-btn-gradient text-white font-semibold px-5 py-2.5 rounded-xl text-xs"
              >
                {isUpdatingSettings ? 'Saving...' : 'Update Settings'}
              </button>

              <button
                onClick={handleDeleteSeries}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Series
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Video Modal */}
      <GenerateVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        seriesId={series.id}
        seriesName={series.name}
        onVideoCreated={handleVideoCreated}
      />
    </AppLayout>
  );
};

export default SeriesDetailPage;
