import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { Video } from '../../types';
import { Play, Download, RefreshCw, Trash2, Eye, MoreVertical } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onPreview: (video: Video) => void;
  onDelete: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPreview, onDelete }) => {
  return (
    <Card hoverEffect className="bg-[#111116] border-[#27272F] overflow-hidden group flex flex-col justify-between">
      <div className="relative aspect-[9/16] w-full bg-[#18181F] overflow-hidden cursor-pointer" onClick={() => onPreview(video)}>
        <img
          src={video.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-transparent to-black/40" />

        {/* Play Icon Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Header */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <Badge variant={video.status === 'Ready' ? 'ready' : video.status === 'Generating' ? 'generating' : 'failed'} size="sm">
            {video.status === 'Ready' ? 'Pronto' : video.status === 'Generating' ? 'Gerando' : 'Falhou'}
          </Badge>
          <span className="text-[10px] font-mono text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded">
            {video.duration}
          </span>
        </div>

        {/* Bottom Title on Thumbnail */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <p className="text-[11px] font-semibold text-[#A78BFA]">{video.series_name}</p>
          <h4 className="text-sm font-bold text-white line-clamp-2 mt-0.5 leading-snug">
            {video.title}
          </h4>
        </div>
      </div>

      {/* Card Footer Controls */}
      <div className="p-3 border-t border-[#27272F] flex items-center justify-between text-xs text-[#A1A1AA] bg-[#0D0D12]">
        <span>{new Date(video.created_at).toLocaleDateString('pt-BR')}</span>

        <Dropdown
          trigger={
            <button className="p-1 rounded-lg hover:bg-[#18181F] text-[#A1A1AA] hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
          }
          items={[
            { id: 'preview', label: 'Visualizar', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => onPreview(video) },
            { id: 'download', label: 'Baixar MP4', icon: <Download className="w-3.5 h-3.5" />, onClick: () => alert('Baixando arquivo de vídeo MP4 em Alta Definição...') },
            { id: 'delete', label: 'Excluir', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => onDelete(video.id) },
          ]}
        />
      </div>
    </Card>
  );
};
