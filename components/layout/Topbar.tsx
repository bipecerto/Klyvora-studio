'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  title?: string;
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  onOpenMobileSidebar,
}) => {
  const router = useRouter();
  const { user, profile } = useAuth();

  const displayName = profile?.name || user?.name || 'U';
  const avatarUrl = profile?.avatar_url || user?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-[64px] border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Title / Breadcrumb + Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden text-[rgba(255,255,255,0.7)] hover:text-white p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <h1 className="text-[16px] sm:text-[18px] font-semibold text-white tracking-tight">
            {title}
          </h1>
        )}
      </div>

      {/* Right: Avatar only (sem contas/créditos) */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B3FD6] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shadow-md border border-[rgba(255,255,255,0.1)] hover:scale-105 transition-transform overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </button>
      </div>
    </header>
  );
};
