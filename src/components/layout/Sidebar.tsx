import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Layers,
  PlaySquare,
  Library,
  Settings,
  LogOut,
  User,
  X,
  ChevronUp,
} from 'lucide-react';
import { KlyvoraLogo } from '../ui/KlyvoraLogo';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || 'user@klyvora.ai';
  const avatarUrl = profile?.avatar_url || user?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Series', path: '/series', icon: Layers },
    { label: 'Videos', path: '/videos', icon: PlaySquare },
    { label: 'Library', path: '/library', icon: Library },
  ];

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between p-4 bg-[#0A0A0B] border-r border-[rgba(255,255,255,0.08)]">
      {/* Top Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center focus:outline-none"
          >
            <KlyvoraLogo size="sm" />
          </button>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden text-[rgba(255,255,255,0.5)] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Nav Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[rgba(255,255,255,0.05)] text-white font-semibold'
                      : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[#8B5CF6]' : 'text-[rgba(255,255,255,0.5)]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="my-3 border-t border-[rgba(255,255,255,0.06)]" />

          {/* Settings Nav Item */}
          <NavLink
            to="/settings"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-[rgba(255,255,255,0.05)] text-white font-semibold'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#8B5CF6]' : 'text-[rgba(255,255,255,0.5)]'
                  }`}
                />
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Bottom Profile Footer */}
      <div className="relative pt-4 border-t border-[rgba(255,255,255,0.06)]">
        {userMenuOpen && (
          <div className="absolute bottom-16 left-0 right-0 bg-[#141416] border border-[rgba(255,255,255,0.1)] rounded-xl p-1.5 shadow-xl space-y-1 z-20">
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[rgba(255,255,255,0.8)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#8B5CF6]" />
              <span>Account</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-rose-400 hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B3FD6] to-[#8B5CF6] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {initial}
              </div>
            )}
            <div className="truncate">
              <p className="text-[13px] font-semibold text-white truncate">{displayName}</p>
              <p className="text-[11px] text-[rgba(255,255,255,0.45)] truncate">
                {displayEmail}
              </p>
            </div>
          </div>
          <ChevronUp
            className={`w-4 h-4 text-[rgba(255,255,255,0.4)] transition-transform ${
              userMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-[240px] h-screen sticky top-0 shrink-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-[260px] max-w-[80vw] h-full z-10">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
