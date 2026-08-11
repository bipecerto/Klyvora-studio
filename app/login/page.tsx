'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { KlyvoraLogo } from '@/components/ui/KlyvoraLogo';
import { ArrowRight, Lock, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { signIn, resetPassword, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Next.js App Router redirects não carregam state como o react-router;
  // sempre volta pro dashboard após o login (perda menor de UX aceitável).
  const fromPath = '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.replace(fromPath);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setInfoMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign in failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[rgba(255,255,255,0.92)] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[rgba(139,92,246,0.08)] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-block cursor-pointer" onClick={() => router.push('/')}>
            <KlyvoraLogo size="md" />
          </div>
          <h1 className="text-2xl font-bold text-white pt-2">Welcome back</h1>
          <p className="text-[14px] text-[rgba(255,255,255,0.55)]">
            Sign in to your Klyvora account to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-[20px] bg-[#141416] border border-[rgba(255,255,255,0.08)] space-y-6 shadow-2xl">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[13px] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[13px] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[rgba(255,255,255,0.8)]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[rgba(255,255,255,0.4)] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl pl-10 pr-4 h-[44px] text-[14px] text-white placeholder-[rgba(255,255,255,0.3)] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-[rgba(255,255,255,0.8)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[12px] text-[#8B5CF6] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[rgba(255,255,255,0.4)] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] focus:border-[#8B5CF6] rounded-xl pl-10 pr-4 h-[44px] text-[14px] text-white placeholder-[rgba(255,255,255,0.3)] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="klyvora-btn-gradient text-white font-semibold text-[14px] w-full h-[44px] rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all pt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.08)]" />
            </div>
            <span className="relative bg-[#141416] px-3 text-[12px] text-[rgba(255,255,255,0.4)]">
              or continue with
            </span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full h-[44px] rounded-xl bg-[#1C1C1F] border border-[rgba(255,255,255,0.08)] hover:bg-[#242428] text-white text-[13px] font-medium flex items-center justify-center gap-2.5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer link */}
        <p className="text-center text-[13px] text-[rgba(255,255,255,0.5)]">
          Don't have an account?{' '}
          <button
            onClick={() => router.push('/register')}
            className="text-[#8B5CF6] hover:underline font-semibold"
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
