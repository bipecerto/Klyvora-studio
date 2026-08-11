import { createClient } from '@supabase/supabase-js';

export interface ServerAuthContext {
  token: string;
  userId: string;
  authenticated: boolean;
  admin: any | null;
}

export function getSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;
  return { url, anonKey, serviceKey };
}

export async function resolveAuth(authHeader: string | null | undefined): Promise<ServerAuthContext> {
  const { url, anonKey, serviceKey } = getSupabaseEnv();
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anonKey || !serviceKey || !token || token === 'guest-token') {
    return { token: token || 'guest-token', userId: 'guest-user', authenticated: false, admin: null };
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Error('Unauthorized user token');

  return {
    token,
    userId: user.id,
    authenticated: true,
    admin: createClient(url, serviceKey),
  };
}
