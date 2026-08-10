import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { SeriesCard } from '../components/series/SeriesCard';
import { GenerateVideoModal } from '../components/series/GenerateVideoModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Series } from '../types';
import { Plus, Search, Tv } from 'lucide-react';

interface SeriesListPageProps {
  onNavigate: (path: string) => void;
}

export const SeriesListPage: React.FC<SeriesListPageProps> = ({ onNavigate }) => {
  const { series } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeriesForGen, setSelectedSeriesForGen] = useState<Series | undefined>(undefined);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);

  const filteredSeries = series.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.niche.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenGenerate = (s: Series) => {
    setSelectedSeriesForGen(s);
    setIsGenModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F7F8]">Séries de Vídeos com IA</h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">Gerencie e gere conteúdo episódico para seus canais</p>
        </div>

        <Button
          variant="primary"
          onClick={() => onNavigate('/series/new')}
          leftIcon={<Plus className="w-4 h-4 text-[#A78BFA]" />}
        >
          Criar Série
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar séries por nome ou nicho..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Series Grid */}
      {filteredSeries.length === 0 ? (
        <EmptyState
          icon={<Tv className="w-6 h-6 text-[#A78BFA]" />}
          title={searchQuery ? 'Nenhuma série encontrada' : 'Nenhuma Série de IA Criada'}
          description={
            searchQuery
              ? 'Tente buscar por um termo diferente ou limpe a busca.'
              : 'Crie sua primeira série de vídeos curtos automatizados.'
          }
          action={
            <Button variant="primary" onClick={() => onNavigate('/series/new')}>
              + Criar Série
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeries.map((s) => (
            <SeriesCard
              key={s.id}
              series={s}
              onSelect={(selected) => onNavigate(`/series/${selected.id}`)}
              onGenerateClick={handleOpenGenerate}
            />
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <GenerateVideoModal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        series={selectedSeriesForGen}
        onSuccess={(vidId) => onNavigate(`/videos/${vidId}`)}
      />
    </div>
  );
};
