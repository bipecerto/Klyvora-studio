import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[#1C1C1F] rounded-lg border border-[rgba(255,255,255,0.04)] ${className}`}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-5 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-4">
      <Skeleton className="w-full h-36 rounded-xl" />
      <Skeleton className="w-2/3 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="w-16 h-6 rounded-md" />
        <Skeleton className="w-20 h-6 rounded-md" />
      </div>
    </div>
  );
};
