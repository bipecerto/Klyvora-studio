import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import {
  User,
  Sliders,
  Cpu,
  CreditCard,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'providers' | 'billing'>('account');

  // Account State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setName(profile?.name || user?.name || '');
    setEmail(profile?.email || user?.email || '');
  }, [user, profile]);

  // Preferences State
  const [defaultLang, setDefaultLang] = useState('English');
  const [defaultPlatform, setDefaultPlatform] = useState('TikTok');
  const [defaultDuration, setDefaultDuration] = useState('60 sec');

  // AI Providers Connected Status
  const [connectedProviders, setConnectedProviders] = useState<{ [key: string]: boolean }>({
    gemini: false,
    openai: false,
    elevenlabs: false,
    runway: false,
    replicate: false,
  });

  const toggleConnectProvider = (key: string) => {
    setConnectedProviders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppLayout title="Settings">
      <div className="space-y-6">
        <div className="pb-2 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Settings
          </h2>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)] mt-1">
            Manage your account, preferences, AI engine integrations, and billing.
          </p>
        </div>

        {/* Inner Tabs Bar */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)] gap-6 text-sm font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'account'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Account
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" /> Preferences
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'providers'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" /> AI Providers
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'billing'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[rgba(255,255,255,0.5)] hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Billing
          </button>
        </div>

        {/* TAB 1: ACCOUNT */}
        {activeTab === 'account' && (
          <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 max-w-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#5B3FD6] to-[#8B5CF6] text-white font-bold text-2xl flex items-center justify-center shadow-lg">
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white">{name}</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.45)]">{email}</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-4 h-[42px] text-[14px] text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-4 h-[42px] text-[14px] text-white outline-none"
                />
              </div>

              <button
                onClick={() => alert('Account changes saved!')}
                className="klyvora-btn-gradient text-white text-[13px] font-semibold px-5 h-[40px] rounded-xl shadow-md active:scale-95 transition-all mt-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 max-w-xl">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Default Language</label>
                <select
                  value={defaultLang}
                  onChange={(e) => setDefaultLang(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-3 h-[42px] text-[14px] text-white outline-none"
                >
                  <option value="English">English</option>
                  <option value="Português">Português</option>
                  <option value="Español">Español</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Default Platform</label>
                <select
                  value={defaultPlatform}
                  onChange={(e) => setDefaultPlatform(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-3 h-[42px] text-[14px] text-white outline-none"
                >
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram Reels">Instagram Reels</option>
                  <option value="YouTube Shorts">YouTube Shorts</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">Default Duration</label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl px-3 h-[42px] text-[14px] text-white outline-none"
                >
                  <option value="30 sec">30 sec</option>
                  <option value="45 sec">45 sec</option>
                  <option value="60 sec">60 sec</option>
                  <option value="90 sec">90 sec</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white">App Theme</label>
                <div className="p-3 rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] text-xs text-white flex items-center justify-between">
                  <span>Dark Mode (Klyvora Onyx)</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>
              </div>

              <button
                onClick={() => alert('Preferences updated!')}
                className="klyvora-btn-gradient text-white text-[13px] font-semibold px-5 h-[40px] rounded-xl shadow-md active:scale-95 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: AI PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'gemini', name: 'Google Gemini', desc: 'Powers script writing, hook generation, and scene structuring.' },
              { key: 'openai', name: 'OpenAI GPT-4o', desc: 'Advanced reasoning and multilingual narrative tone adaptation.' },
              { key: 'elevenlabs', name: 'ElevenLabs', desc: 'Ultra-realistic neural voice synthesis with natural human emotion.' },
              { key: 'runway', name: 'Runway Gen-3', desc: 'High-definition cinematic video generation for video scenes.' },
              { key: 'replicate', name: 'Replicate', desc: 'Custom AI image rendering models and specialized visual filters.' },
            ].map((p) => {
              const isConnected = connectedProviders[p.key];
              return (
                <div
                  key={p.key}
                  className="p-5 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[16px] font-bold text-white">{p.name}</h4>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
                          isConnected
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-[rgba(255,255,255,0.4)]'
                        }`}
                      >
                        {isConnected ? 'Connected' : 'Not connected'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[rgba(255,255,255,0.55)] leading-relaxed">
                      {p.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleConnectProvider(p.key)}
                    className={`h-[38px] rounded-xl text-xs font-semibold transition-all ${
                      isConnected
                        ? 'bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:text-white'
                        : 'klyvora-btn-gradient text-white shadow-sm'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: BILLING & PLANS */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            {/* Current Balance Banner */}
            <div className="p-6 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-[rgba(255,255,255,0.45)]">Current Subscription</span>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">Free Plan</h3>
                  <span className="text-[11px] font-semibold text-[#8B5CF6] bg-[rgba(91,63,214,0.15)] px-2.5 py-1 rounded-md border border-[rgba(139,92,246,0.3)]">
                    1,240 credits remaining
                  </span>
                </div>
              </div>

              <button
                onClick={() => alert('Opening upgrade checkout...')}
                className="klyvora-btn-gradient text-white text-xs font-semibold px-5 h-[40px] rounded-xl shadow-md active:scale-95 transition-all self-start sm:self-auto"
              >
                Upgrade Plan
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-[18px] font-bold text-white">Free</h4>
                  <div className="text-2xl font-bold text-white">
                    $0 <span className="text-xs text-[rgba(255,255,255,0.45)] font-normal">/ month</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-[rgba(255,255,255,0.65)] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1,500 credits / month</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Standard narrator voices</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 720p HD render</li>
                  </ul>
                </div>
                <button disabled className="w-full h-[38px] rounded-xl bg-[#1C1C1F] text-[rgba(255,255,255,0.4)] text-xs font-semibold cursor-default">
                  Current Plan
                </button>
              </div>

              {/* Creator Plan */}
              <div className="p-6 rounded-[16px] bg-[#141416] border border-[#8B5CF6] space-y-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
                <div className="absolute top-3 right-3 text-[10px] font-bold uppercase text-[#8B5CF6] bg-[#8B5CF6]/15 px-2 py-0.5 rounded border border-[#8B5CF6]/30">
                  Popular
                </div>
                <div className="space-y-4">
                  <h4 className="text-[18px] font-bold text-white flex items-center gap-1.5">
                    Creator <Zap className="w-4 h-4 text-[#8B5CF6]" />
                  </h4>
                  <div className="text-2xl font-bold text-white">
                    $29 <span className="text-xs text-[rgba(255,255,255,0.45)] font-normal">/ month</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-white pt-2 border-t border-[rgba(255,255,255,0.08)]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 15,000 credits / month</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> ElevenLabs Premium Voices</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1080p 60FPS Full HD</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> No watermark</li>
                  </ul>
                </div>
                <button
                  onClick={() => alert('Starting Creator plan subscription...')}
                  className="klyvora-btn-gradient text-white text-xs font-semibold w-full h-[38px] rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Upgrade to Creator
                </button>
              </div>

              {/* Pro Plan */}
              <div className="p-6 rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-[18px] font-bold text-white flex items-center gap-1.5">
                    Pro Agency <Sparkles className="w-4 h-4 text-amber-400" />
                  </h4>
                  <div className="text-2xl font-bold text-white">
                    $79 <span className="text-xs text-[rgba(255,255,255,0.45)] font-normal">/ month</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-[rgba(255,255,255,0.65)] pt-2 border-t border-[rgba(255,255,255,0.06)]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited credits</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-account auto posting</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Priority render queue</li>
                  </ul>
                </div>
                <button
                  onClick={() => alert('Starting Pro Agency subscription...')}
                  className="w-full h-[38px] rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] hover:bg-[#242428] text-white text-xs font-semibold transition-colors"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
