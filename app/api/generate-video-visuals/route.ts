import { NextRequest } from 'next/server';
import { runLegacyHandler } from '@/lib/server/legacyHandler';
import { handler } from '@/lib/server/handlers/generate-video-visuals';

// Gera 1 imagem por cena, sequencialmente — pode levar bastante tempo em
// roteiros com muitas cenas, por isso o maxDuration alto.
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  return runLegacyHandler(handler, request);
}
