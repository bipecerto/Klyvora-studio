import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { VideoCard } from '../components/common/VideoCard';
import { EmptyState } from '../components/common/EmptyState';
import { Search, PlaySquare, Sparkles, Loader2 } from 'lucide-react';
import { GenerateVideoModal } from '../components/modals/GenerateVideoModal';
import { getVideos, deleteVideo, VideoRecord } from '../services/videoService';

export const VideosPage: React.FC = () => {
  const [videosList, setVideosList] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVideosData = async () => {
    setLoading(true);
    try {
      const data = await getVideos();
      setVideosList(data);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideosData();
  }, []);

  const handleDelete = async (id: string) => {
    setVideosList((prev) => prev.filter((v) => v.id !== id));
    try {
      await deleteVideo(id);
    } catch (err) {
      console.error('Failed to delete video:', err);
      fetchVideosData();
    }
  };

  const handleVideoCreated = () => {
    fetchVideosData();
  };

  const filteredVideos = videosList.filter((v) => {
    const titleMatch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
    const seriesMatch = (v.series_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || seriesMatch;

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'shorts') return v.video_format === 'short_form' || !v.video_format || v.aspect_ratio === '9:16';
    if (statusFilter === 'youtube') return v.video_format === 'long_form' || v.aspect_ratio === '16:9';

    return v.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <AppLayout title="Videos">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Generated Videos
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)] mt-1">
            All your generated shorts and reels content ready to export.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="klyvora-btn-gradient text-white text-[13px] font-semibold px-4 h-[40px] rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Generate Video
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[rgba(255,255,255,0.4)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos by title or series..."
            className="w-full bg-[#141416] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl pl-10 pr-4 h-[38px] text-[13px] text-white placeholder-[rgba(255,255,255,0.35)] outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-[#141416] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] self-start sm:self-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'shorts', label: 'Shorts (9:16)' },
            { id: 'youtube', label: 'YouTube (16:9)' },
            { id: 'ready', label: 'Prontos' },
            { id: 'generating', label: 'Gerando' },
            { id: 'failed', label: 'Falhas' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st.id
                  ? 'bg-[rgba(255,255,255,0.1)] text-white font-semibold'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No videos found"
          description={
            searchQuery
              ? `No videos matching "${searchQuery}"`
              : 'Generate your first video to start populating your feed.'
          }
          actionLabel="Generate Video"
          onAction={() => setIsModalOpen(true)}
          icon={PlaySquare}
        />
      )}

      {/* Generate Video Modal */}
      <GenerateVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVideoCreated={handleVideoCreated}
      />
    </AppLayout>
  );
};
