import { NextRequest } from 'next/server';
import { runLegacyHandler } from '@/lib/server/legacyHandler';
import { handler } from '@/lib/server/handlers/generate-narration';

// IMPORTANTE: roteiros longos = muitos chunks sequenciais no TTS grátis.
// Sem isso, a Vercel mata a função em ~10s (Hobby) e o áudio nunca termina
// de gerar — este era o bug real do motor de narração/vídeo do Klyvora.
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  return runLegacyHandler(handler, request);
}
