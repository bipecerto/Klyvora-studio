'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to load profile from Supabase profiles table
  const loadUserProfile = async (currentUser: User) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (data && !error) {
          const userProf: UserProfile = {
            id: data.id,
            email: data.email || currentUser.email || '',
            name: data.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            avatar_url: data.avatar_url || currentUser.user_metadata?.avatar_url,
            credits: data.credits ?? 150,
            plan: data.plan || 'pro',
            created_at: data.created_at || currentUser.created_at,
            updated_at: data.updated_at,
          };
          setProfile(userProf);
          setUser(userProf);
          return;
        }
      }
    } catch (err) {
      console.warn('Error fetching profile from Supabase profiles table:', err);
    }

    // Fallback if profiles table is empty or Supabase isn't configured
    const fallbackProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email || '',
      name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
      avatar_url: currentUser.user_metadata?.avatar_url,
      credits: 150,
      plan: 'pro',
      created_at: currentUser.created_at || new Date().toISOString(),
    };
    setProfile(fallbackProfile);
    setUser(fallbackProfile);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Check for saved demo session in local storage if any
      const savedDemo = localStorage.getItem('klyvora_demo_user');
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed);
          setProfile(parsed);
        } catch {
          // empty
        }
      }
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('klyvora_demo_user');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      // Demo fallback when env vars not configured
      const demoUser: UserProfile = {
        id: 'u_' + Math.random().toString(36).substring(2, 7),
        email,
        name: email.split('@')[0] || 'Creator',
        credits: 150,
        plan: 'pro',
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      setProfile(demoUser);
      localStorage.setItem('klyvora_demo_user', JSON.stringify(demoUser));
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, pass: string, name: string) => {
    if (!isSupabaseConfigured) {
      const demoUser: UserProfile = {
        id: 'u_' + Math.random().toString(36).substring(2, 7),
        email,
        name: name || email.split('@')[0],
        credits: 150,
        plan: 'pro',
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      setProfile(demoUser);
      localStorage.setItem('klyvora_demo_user', JSON.stringify(demoUser));
      return { error: null };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    localStorage.removeItem('klyvora_demo_user');
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } else {
      const demoUser: UserProfile = {
        id: 'google_user',
        email: 'google.creator@gmail.com',
        name: 'Google Creator',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        credits: 150,
        plan: 'pro',
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      setProfile(demoUser);
      localStorage.setItem('klyvora_demo_user', JSON.stringify(demoUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithEmail: signIn,
        signUpWithEmail: signUp,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
