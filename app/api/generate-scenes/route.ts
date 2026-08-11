import { NextRequest } from 'next/server';
import { runLegacyHandler } from '@/lib/server/legacyHandler';
import { handler } from '@/lib/server/handlers/generate-scenes';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return runLegacyHandler(handler, request);
}
