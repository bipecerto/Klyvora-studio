import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { SeriesCard } from '../components/common/SeriesCard';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Search, Layers, Loader2 } from 'lucide-react';
import { getSeries, setSeriesStatus, deleteSeries, SeriesRecord } from '../services/seriesService';

export const SeriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState<SeriesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const fetchSeriesData = async () => {
    setLoading(true);
    try {
      const data = await getSeries();
      setSeriesList(data);
    } catch (err) {
      console.error('Failed to load series:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeriesData();
  }, []);

  const handlePauseToggle = async (id: string) => {
    const target = seriesList.find((s) => s.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'paused' : 'active';

    // Optimistic UI update
    setSeriesList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );

    try {
      await setSeriesStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update series status:', err);
      // Rollback
      fetchSeriesData();
    }
  };

  const handleDeleteSeries = async (id: string) => {
    // Optimistic UI update
    setSeriesList((prev) => prev.filter((s) => s.id !== id));

    try {
      await deleteSeries(id);
    } catch (err) {
      console.error('Failed to delete series:', err);
      fetchSeriesData();
    }
  };

  const filteredSeries = seriesList.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const nicheMatch = (s.niche || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || nicheMatch;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout title="Series">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Video Series
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)] mt-1">
            Manage your automated video series channels.
          </p>
        </div>

        <button
          onClick={() => navigate('/series/new')}
          className="klyvora-btn-gradient text-white text-[13px] font-semibold px-4 h-[40px] rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Series
        </button>
      </div>

      {/* Controls: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[rgba(255,255,255,0.4)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search series by name or niche..."
            className="w-full bg-[#141416] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl pl-10 pr-4 h-[38px] text-[13px] text-white placeholder-[rgba(255,255,255,0.35)] outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#141416] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] self-start sm:self-auto">
          {(['all', 'active', 'paused'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-[rgba(255,255,255,0.1)] text-white font-semibold'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Series */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#8B5CF6]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredSeries.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSeries.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              onPauseToggle={handlePauseToggle}
              onDelete={handleDeleteSeries}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No series found"
          description={
            searchQuery
              ? `No series matching "${searchQuery}"`
              : 'Create your first automated video series to start producing daily content.'
          }
          actionLabel="Create Series"
          onAction={() => navigate('/series/new')}
          icon={Layers}
        />
      )}
    </AppLayout>
  );
};
