import { NextRequest } from 'next/server';
import { runLegacyHandler } from '@/lib/server/legacyHandler';
import { handler } from '@/lib/server/handlers/generate-scene-image';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return runLegacyHandler(handler, request);
}
