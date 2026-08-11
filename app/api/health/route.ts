import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'klyvora-studio',
    backend: 'faceless-klyvora-engine-nextjs',
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      supabase: Boolean(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
      ),
    },
    time: new Date().toISOString(),
  });
}
