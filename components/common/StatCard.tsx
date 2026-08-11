'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-2 min-h-[110px] flex flex-col justify-between hover:border-[rgba(255,255,255,0.14)] transition-all">
      <div className="flex items-center justify-between text-[rgba(255,255,255,0.55)]">
        <span className="text-[13px] font-medium">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8B5CF6]">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</p>
        {subtext && (
          <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
};
