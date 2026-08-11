import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isValidHttpUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(rawUrl) && 
  rawKey && 
  rawKey.trim().length > 0 &&
  rawKey.trim() !== 'placeholder-anon-key' &&
  !rawUrl!.includes('placeholder.supabase.co') &&
  !rawUrl!.includes('placeholder-project.supabase.co')
);

const supabaseUrl = isSupabaseConfigured ? rawUrl!.trim() : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey!.trim() : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

