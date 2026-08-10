import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { INITIAL_ASSETS, Asset } from '../data/mockAssets';
import { Search, Upload, Image as ImageIcon, Film, Music, Trash2 } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

export const LibraryPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUploadSimulated = () => {
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      name: `custom_upload_${assets.length + 1}.jpg`,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&auto=format&fit=crop&q=80',
      size: '3.4 MB',
      createdAt: 'Just now',
    };
    setAssets([newAsset, ...assets]);
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <AppLayout title="Library">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Media Library
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)] mt-1">
            Your generated and uploaded media assets.
          </p>
        </div>

        <button
          onClick={handleUploadSimulated}
          className="klyvora-btn-gradient text-white text-[13px] font-semibold px-4 h-[40px] rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          Upload Asset
        </button>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[rgba(255,255,255,0.4)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by filename..."
            className="w-full bg-[#141416] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl pl-10 pr-4 h-[38px] text-[13px] text-white placeholder-[rgba(255,255,255,0.35)] outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#141416] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] self-start sm:self-auto">
          {(['all', 'image', 'video', 'audio'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-[rgba(255,255,255,0.1)] text-white font-semibold'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-3 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-all space-y-2.5 flex flex-col justify-between group"
            >
              {/* Asset Preview Thumbnail */}
              <div className="w-full aspect-square rounded-xl bg-[#1C1C1F] overflow-hidden relative border border-[rgba(255,255,255,0.04)] flex items-center justify-center">
                {asset.type === 'audio' ? (
                  <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center">
                    <Music className="w-5 h-5" />
                  </div>
                ) : (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Delete overlay */}
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Info */}
              <div className="space-y-0.5">
                <p className="text-[12px] font-semibold text-white truncate">{asset.name}</p>
                <div className="flex items-center justify-between text-[10px] text-[rgba(255,255,255,0.4)] font-mono">
                  <span>{asset.size}</span>
                  <span>{asset.createdAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No assets found"
          description={
            searchQuery
              ? `No media assets matching "${searchQuery}"`
              : 'Upload your first media file or generate videos to populate your library.'
          }
          actionLabel="Upload Asset"
          onAction={handleUploadSimulated}
          icon={ImageIcon}
        />
      )}
    </AppLayout>
  );
};
