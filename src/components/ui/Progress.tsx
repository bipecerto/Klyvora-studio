import React from 'react';

interface ProgressProps {
  value: number; // 0 - 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  subtext?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  size = 'md',
  showLabel = false,
  className = '',
  subtext,
}) => {
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || subtext) && (
        <div className="flex justify-between items-center text-xs text-[#A1A1AA] mb-1.5">
          <span>{subtext || 'Progress'}</span>
          <span className="font-semibold text-[#F7F7F8]">{clampedValue}%</span>
        </div>
      )}
      <div className={`w-full bg-[#18181F] rounded-full overflow-hidden border border-[#27272F] ${heights[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-[#5B21B6] via-[#7C3AED] to-[#8B5CF6] transition-all duration-300 rounded-full relative"
          style={{ width: `${clampedValue}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover border border-[#27272F] ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white font-bold flex items-center justify-center border border-[#A78BFA]/30 shadow-sm ${sizes[size]} ${className}`}
    >
      {initials || 'U'}
    </div>
  );
};

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
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[#27272F] bg-[#111116]/50 ${className}`}>
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

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-[#18181F] rounded-xl ${className}`} />;
};
