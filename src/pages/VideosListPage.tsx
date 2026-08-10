import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { VideoCard } from '../components/videos/VideoCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { VideoStatus } from '../types';
import { Film, Search, Filter } from 'lucide-react';

interface VideosListPageProps {
  onNavigate: (path: string) => void;
}

export const VideosListPage: React.FC<VideosListPageProps> = ({ onNavigate }) => {
  const { videos, deleteVideo } = useData();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = videos.filter((v) => {
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.series_name && v.series_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F7F8]">Biblioteca de Vídeos com IA</h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">Veja e gerencie todos os seus vídeos curtos gerados</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar vídeos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            { key: 'All', label: 'Todos' },
            { key: 'Generating', label: 'Gerando' },
            { key: 'Ready', label: 'Pronto' },
            { key: 'Failed', label: 'Falhou' },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setFilterStatus(st.key)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border
                ${
                  filterStatus === st.key
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F7F7F8]'
                    : 'bg-[#18181F] border-[#27272F] text-[#A1A1AA] hover:text-white'
                }
              `}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Cards Grid */}
      {filteredVideos.length === 0 ? (
        <EmptyState
          icon={<Film className="w-6 h-6 text-[#A78BFA]" />}
          title="Nenhum Vídeo Encontrado"
          description={
            searchQuery || filterStatus !== 'All'
              ? 'Nenhum vídeo corresponde aos seus critérios de busca ou filtro.'
              : 'Você ainda não gerou nenhum vídeo.'
          }
          action={
            <Button variant="primary" onClick={() => onNavigate('/series')}>
              Explorar Séries
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onPreview={(vid) => onNavigate(`/videos/${vid.id}`)}
              onDelete={(id) => deleteVideo(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
