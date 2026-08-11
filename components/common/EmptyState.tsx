'use client';

import React from 'react';
import { Layers, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Layers,
}) => {
  return (
    <div className="p-10 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] flex flex-col items-center justify-center text-center space-y-4 my-6">
      <div className="w-12 h-12 rounded-2xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8B5CF6]">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-[17px] font-bold text-white">{title}</h3>
        <p className="text-[13px] text-[rgba(255,255,255,0.55)] leading-relaxed font-normal">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="klyvora-btn-gradient text-white text-[13px] font-semibold px-4 h-[38px] rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all mt-2"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
