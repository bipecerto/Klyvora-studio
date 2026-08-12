'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KlyvoraLogo } from '@/components/ui/KlyvoraLogo';
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Chave de acesso inválida.');
      }
      const destination = searchParams.get('from') || '/dashboard';
      window.location.href = destination;
    } catch (err: any) {
      setError(err.message || 'Não foi possível validar a chave.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <KlyvoraLogo size="md" />
        </div>

        <div className="bg-[#111113] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8">
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#8B5CF6]" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-white text-center mb-1">Acesso ao Klyvora Studio</h1>
          <p className="text-sm text-[rgba(255,255,255,0.5)] text-center mb-6">
            Digite a chave de acesso pra entrar.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Chave de acesso"
              autoFocus
              className="w-full rounded-lg bg-[#0A0A0B] border border-[rgba(255,255,255,0.1)] px-4 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#8B5CF6]"
            />
            <button
              type="submit"
              disabled={loading || !key}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={null}>
      <AccessForm />
    </Suspense>
  );
}
