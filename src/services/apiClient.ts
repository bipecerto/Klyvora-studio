import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Safe API fetch helper that checks HTTP status and Content-Type before parsing JSON.
 * Prevents "Unexpected token '<'" errors when Vercel or proxy returns HTML 404/500 pages.
 */
export async function safeApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = 'guest-token';

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch (_) {}
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const headers = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (!isJson) {
      if (response.status === 404) {
        throw new Error(`API ${endpoint} não encontrada (HTTP 404)`);
      }
      const rawText = await response.text().catch(() => '');
      throw new Error(`Servidor retornou erro (HTTP ${response.status}): ${rawText.slice(0, 120) || response.statusText}`);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || errorData?.message || `Erro na API ${endpoint} (HTTP ${response.status})`);
  }

  if (!isJson) {
    throw new Error(`A rota ${endpoint} retornou uma resposta não-JSON (Content-Type: ${contentType}).`);
  }

  return response.json() as Promise<T>;
}
