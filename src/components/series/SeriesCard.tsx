import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Series } from '../../types';
import { Film, Play, MoreVertical, Plus } from 'lucide-react';

interface SeriesCardProps {
  series: Series;
  onSelect: (series: Series) => void;
  onGenerateClick: (series: Series) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  onSelect,
  onGenerateClick,
}) => {
  return (
    <Card
      hoverEffect
      className="bg-[#111116] border-[#27272F] flex flex-col justify-between group cursor-pointer overflow-hidden"
      onClick={() => onSelect(series)}
    >
      {/* Thumbnail Banner */}
      <div className="relative h-44 w-full bg-[#18181F] overflow-hidden">
        <img
          src={series.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'}
          alt={series.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-black/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <Badge variant={series.status === 'Active' ? 'active' : 'paused'} size="sm">
            {series.status === 'Active' ? 'Ativa' : 'Pausada'}
          </Badge>
          <span className="text-[10px] font-semibold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
            {series.platform}
          </span>
        </div>

        {/* Niche Tag */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[11px] font-medium text-[#A78BFA] bg-[#18181F]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#27272F]">
            {series.niche}
          </span>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-[#F7F7F8] group-hover:text-[#A78BFA] transition-colors line-clamp-1">
            {series.name}
          </h3>
          <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1">
            {series.description}
          </p>
        </div>

        <div className="pt-3 border-t border-[#27272F]/60 flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>{series.video_count || 0} vídeos</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateClick(series);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED]/15 hover:bg-[#7C3AED]/30 text-[#A78BFA] font-semibold border border-[#7C3AED]/30 transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gerar</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
