'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !session) {
      router.replace('/login');
    }
  }, [loading, user, session, router]);

  if (loading || (!user && !session)) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
          <p className="text-sm text-[rgba(255,255,255,0.6)]">Loading session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
