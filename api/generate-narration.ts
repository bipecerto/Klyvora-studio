import { createClient } from '@supabase/supabase-js';
import { synthesizeNarration } from '../server-lib/narration';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let targetVideoId = '';
  let supabaseAdminClient: any = null;

  try {
    const { video_id, voice_id, voice_style, script: clientScript, language: clientLanguage } = req.body || {};
    targetVideoId = video_id;

    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const isSupabaseMode = Boolean(supabaseUrl && supabaseServiceKey && token && token !== 'guest-token');

    let userId = 'guest-user';
    let videoRecord: any = null;
    let seriesRecord: any = null;

    if (isSupabaseMode) {
      supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error: authErr } = await supabaseAdminClient.auth.getUser(token);
      if (authErr || !user) {
        return res.status(401).json({ error: 'Token de usuário inválido.' });
      }
      userId = user.id;

      if (video_id) {
        const { data: vData } = await supabaseAdminClient.from('videos').select('*').eq('id', video_id).maybeSingle();
        if (!vData || vData.user_id !== userId) {
          return res.status(404).json({ error: 'Vídeo não encontrado ou acesso negado.' });
        }
        videoRecord = vData;
        if (vData.series_id) {
          const { data: sData } = await supabaseAdminClient.from('series').select('*').eq('id', vData.series_id).maybeSingle();
          seriesRecord = sData;
        }
        await supabaseAdminClient.from('videos').update({ narration_status: 'generating' }).eq('id', video_id);
      }
    }

    const scriptText = videoRecord?.script || clientScript;
    if (!scriptText) {
      return res.status(400).json({ error: 'Roteiro ausente para gerar a narração.' });
    }

    const language = seriesRecord?.language || clientLanguage || 'Português do Brasil';
    const voiceName = voice_id || seriesRecord?.voice_id || 'Charon';
    const style = voice_style || seriesRecord?.voice_style || 'Documentary';

    const result = await synthesizeNarration({
      text: scriptText,
      voice: voiceName,
      language,
      style,
    });

    let narrationUrl = `data:${result.mimeType};base64,${result.audioBuffer.toString('base64')}`;
    let storagePath: string | null = null;

    if (isSupabaseMode && supabaseAdminClient && video_id) {
      storagePath = `${userId}/videos/${video_id}/narration.mp3`;
      const { error: uploadErr } = await supabaseAdminClient.storage
        .from('media')
        .upload(storagePath, result.audioBuffer, { contentType: result.mimeType, upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabaseAdminClient.storage.from('media').getPublicUrl(storagePath);
        if (urlData?.publicUrl) narrationUrl = urlData.publicUrl;
      }

      await supabaseAdminClient.from('videos').update({
        narration_url: narrationUrl,
        narration_storage_path: storagePath,
        narration_voice: voiceName,
        narration_duration: result.durationSec,
        narration_status: 'ready',
      }).eq('id', video_id);
    }

    return res.status(200).json({
      success: true,
      video_id: video_id || 'demo-video-id',
      narration_url: narrationUrl,
      narration_voice: voiceName,
      narration_status: 'ready',
      narration_duration: result.durationSec,
      provider: 'klyvora-tts',
    });

  } catch (err: any) {
    console.error('Error in /api/generate-narration:', err);
    if (targetVideoId && supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('videos').update({ narration_status: 'failed' }).eq('id', targetVideoId);
      } catch (_) {}
    }
    return res.status(500).json({ error: err.message || 'Falha ao gerar o áudio da narração.' });
  }
}
