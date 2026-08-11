'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[#27272F] bg-[#111116]/50 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#18181F] border border-[#27272F] flex items-center justify-center text-[#A78BFA] mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#F7F7F8]">{title}</h3>
      <p className="text-xs text-[#A1A1AA] max-w-sm mt-1.5 mb-5">{description}</p>
      {action}
    </div>
  );
};
