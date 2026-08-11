export async function GET() {
  return Response.json({
    status: 'ok',
    app: 'klyvora-studio',
    backend: 'klyvora-yt-integrated',
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      supabase: Boolean((process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)),
    },
    time: new Date().toISOString(),
  });
}
