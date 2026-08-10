import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'ready' | 'generating' | 'draft' | 'failed' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  if (normalized === 'active' || normalized === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.25)] text-[11px] font-semibold text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {normalized === 'active' ? 'Active' : 'Ready'}
      </span>
    );
  }

  if (normalized === 'paused' || normalized === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] text-[11px] font-semibold text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {normalized === 'paused' ? 'Paused' : 'Draft'}
      </span>
    );
  }

  if (normalized === 'generating') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] text-[11px] font-semibold text-[#8B5CF6]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping" />
        Generating...
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] text-[11px] font-semibold text-rose-400">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      Failed
    </span>
  );
};
