import React from 'react';
import { Sparkles, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  title?: string;
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  onOpenMobileSidebar,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const userCredits = profile?.credits ?? user?.credits ?? 150;
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'U';
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

      {/* Right Actions: Credits, Bell, Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Credits Badge */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 bg-[#141416] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] px-3 py-1.5 rounded-full transition-all text-xs font-semibold text-white shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>{userCredits.toLocaleString()}</span>
          <span className="text-[rgba(255,255,255,0.45)] font-normal hidden sm:inline">
            credits
          </span>
        </button>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-full bg-[#141416] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.65)] hover:text-white transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate('/settings')}
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
