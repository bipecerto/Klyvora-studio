export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    app: 'klyvora-studio',
    backend: 'faceless-klyvora-engine',
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      supabase: Boolean((process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)),
    },
    time: new Date().toISOString(),
  });
}

export async function GET(req: any, res?: any) {
  if (res && typeof res.status === 'function') {
    return handler(req, res);
  }
  return Response.json({
    status: 'ok',
    app: 'klyvora-studio',
    backend: 'faceless-klyvora-engine',
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    },
    time: new Date().toISOString(),
  });
}
