'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'paused' | 'generating' | 'ready' | 'failed' | 'default' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    generating: 'bg-purple-500/15 text-purple-300 border-purple-500/30 animate-pulse',
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    default: 'bg-[#18181F] text-[#A1A1AA] border-[#27272F]',
    primary: 'bg-[#7C3AED]/15 text-[#A78BFA] border-[#7C3AED]/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${styles[variant]} ${sizes[size]} ${className}`}>
      {variant === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {variant === 'generating' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
      {variant === 'ready' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {variant === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
      {children}
    </span>
  );
};
