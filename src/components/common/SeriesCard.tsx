import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Layers, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface SeriesCardData {
  id: string;
  name: string;
  niche?: string | null;
  description?: string | null;
  status: 'active' | 'paused' | string;
  videoCount?: number;
  video_count?: number;
  coverImage?: string;
}

interface SeriesCardProps {
  series: SeriesCardData;
  onPauseToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  onPauseToggle,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const videoCount = series.videoCount ?? series.video_count ?? 0;
  const coverImage =
    series.coverImage ||
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80';

  return (
    <div className="rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] overflow-hidden hover:border-[rgba(255,255,255,0.16)] transition-all flex flex-col justify-between group">
      {/* Top Banner / Cover */}
      <div className="h-[120px] relative overflow-hidden bg-[#1C1C1F]">
        <img
          src={coverImage}
          alt={series.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-[rgba(255,255,255,0.1)]">
            {series.niche || 'General'}
          </span>
          <StatusBadge status={series.status as any} />
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3
            onClick={() => navigate(`/series/${series.id}`)}
            className="text-[16px] font-bold text-white hover:text-[#8B5CF6] transition-colors cursor-pointer line-clamp-1"
          >
            {series.name}
          </h3>
          <p className="text-[12px] text-[rgba(255,255,255,0.5)] line-clamp-2 leading-relaxed font-normal">
            {series.description || 'No description provided.'}
          </p>
        </div>

        {/* Footer info & Action button */}
        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[12px] text-[rgba(255,255,255,0.5)]">
          <div className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => navigate(`/series/${series.id}`)}
              className="text-[12px] font-semibold text-white hover:text-[#8B5CF6] flex items-center gap-1 transition-colors"
            >
              Open <ArrowRight className="w-3 h-3" />
            </button>

            {/* Three dot menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-[rgba(255,255,255,0.5)] hover:text-white rounded-md hover:bg-[#1C1C1F]"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-7 w-32 bg-[#1C1C1F] border border-[rgba(255,255,255,0.1)] rounded-xl p-1 shadow-xl z-20 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/series/${series.id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-md text-white"
                >
                  Open
                </button>
                {onPauseToggle && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPauseToggle(series.id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.08)] rounded-md text-white"
                  >
                    {series.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(series.id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[rgba(239,68,68,0.15)] rounded-md text-rose-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
