import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Download, RefreshCw, Trash2, MoreVertical, Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface VideoCardData {
  id: string;
  title: string;
  seriesName?: string;
  series_name?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  status: 'draft' | 'generating' | 'ready' | 'failed' | string;
  duration?: string | number;
}

interface VideoCardProps {
  video: VideoCardData;
  onDelete?: (id: string) => void;
  onRegenerate?: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onDelete,
  onRegenerate,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const thumbnail =
    video.thumbnail ||
    video.thumbnail_url ||
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80';
  const seriesName = video.seriesName || video.series_name || 'Series';
  const durationText =
    typeof video.duration === 'number'
      ? `${video.duration}s`
      : video.duration || '00:60';

  return (
    <div className="w-full aspect-[9/16] rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] overflow-hidden relative group hover:border-[rgba(255,255,255,0.2)] transition-all flex flex-col justify-between p-3.5 shadow-lg">
      {/* Background Image */}
      <img
        src={thumbnail}
        alt={video.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0"
      />

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 z-0" />

      {/* Top Bar: Status Badge + Menu */}
      <div className="relative z-10 flex items-center justify-between">
        <StatusBadge status={video.status as any} />

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-full bg-black/50 text-white/80 hover:text-white backdrop-blur-md border border-white/10"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 w-32 bg-[#1C1C1F] border border-[rgba(255,255,255,0.1)] rounded-xl p-1 shadow-xl z-30 space-y-0.5 text-xs">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/videos/${video.id}`);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-md text-white flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5 text-[#8B5CF6]" /> Preview
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  alert(`Downloading ${video.title}.mp4`);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-md text-white flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              {onRegenerate && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRegenerate(video.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-md text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Regenerate
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(video.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[rgba(239,68,68,0.15)] rounded-md text-rose-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Play Icon */}
      <div
        onClick={() => navigate(`/videos/${video.id}`)}
        className="relative z-10 flex items-center justify-center my-auto cursor-pointer group-hover:scale-110 transition-all"
      >
        <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom Info: Title, Duration, Series */}
      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
          <span className="truncate max-w-[110px]">{seriesName}</span>
          <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
            {durationText}
          </span>
        </div>
        <h4
          onClick={() => navigate(`/videos/${video.id}`)}
          className="text-[13px] font-bold text-white line-clamp-2 leading-tight cursor-pointer hover:text-[#8B5CF6] transition-colors"
        >
          {video.title}
        </h4>
      </div>
    </div>
  );
};
