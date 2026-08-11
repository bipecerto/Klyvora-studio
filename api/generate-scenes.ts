import { createClient } from '@supabase/supabase-js';
import { formatScriptScenes } from '../server-lib/sceneGenerator';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { video_id, script, scenes: inputScenes, duration = 60 } = req.body || {};

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    let isSupabaseMode = false;
    let supabaseAdmin: any = null;

    if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
      try {
        const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) {
          isSupabaseMode = true;
          supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        }
      } catch (_) {}
    }

    let scenesToFormat = inputScenes;

    if (isSupabaseMode && supabaseAdmin && video_id && (!scenesToFormat || !scenesToFormat.length)) {
      const { data: dbScenes } = await supabaseAdmin
        .from('video_scenes')
        .select('*')
        .eq('video_id', video_id)
        .order('scene_order', { ascending: true });

      if (dbScenes && dbScenes.length > 0) {
        scenesToFormat = dbScenes;
      }
    }

    const formattedScenes = formatScriptScenes(scenesToFormat || [], duration);

    return res.status(200).json({
      success: true,
      video_id: video_id || 'demo-video-id',
      scenes: formattedScenes,
      scenes_count: formattedScenes.length,
    });

  } catch (err: any) {
    console.error('Error in /api/generate-scenes:', err);
    return res.status(500).json({ error: err.message || 'Falha ao estruturar as cenas do vídeo.' });
  }
}
