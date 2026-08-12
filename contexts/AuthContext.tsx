'use client';

import React, { createContext, useContext } from 'react';
import { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Não há mais contas de usuário — o site inteiro fica atrás de uma única
// chave de acesso (ver middleware.ts). Este perfil é só decorativo, pra não
// precisar mudar a UI que já exibia nome/avatar.
const STATIC_PROFILE: UserProfile = {
  id: 'studio',
  email: '',
  name: 'Meu Canal',
  credits: 0,
  plan: 'pro',
  created_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const signOut = async () => {
    try {
      await fetch('/api/access', { method: 'DELETE' });
    } finally {
      window.location.href = '/access';
    }
  };

  return (
    <AuthContext.Provider value={{ user: STATIC_PROFILE, profile: STATIC_PROFILE, loading: false, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
