import { createClient } from '@supabase/supabase-js';
import { generateStudioScript } from '../server-lib/geminiInteractions';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { video_id, auto_topic, series_context, topic: clientTopic } = req.body || {};

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    let videoRecord: any = null;
    let seriesRecord: any = null;
    let userId = 'guest-user';
    let isSupabaseMode = false;
    let supabaseAdmin: any = null;

    if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
      try {
        const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) {
          userId = user.id;
          isSupabaseMode = true;
          supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

          if (video_id) {
            const { data: video } = await supabaseAdmin
              .from('videos')
              .select('*, series(*)')
              .eq('id', video_id)
              .maybeSingle();

            if (video && video.user_id === user.id) {
              videoRecord = video;
              seriesRecord = video.series;

              await supabaseAdmin
                .from('videos')
                .update({ status: 'generating', progress: 10, error_message: null })
                .eq('id', video_id);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase auth check notice on server:', err);
      }
    }

    const seriesName = seriesRecord?.name || series_context?.name || 'General Series';
    const niche = seriesRecord?.niche || series_context?.niche || 'General';
    const description = seriesRecord?.description || series_context?.description || '';
    const language = seriesRecord?.language || series_context?.language || 'Português do Brasil';
    const durationSec = seriesRecord?.duration || series_context?.duration || 60;
    const platforms = Array.isArray(seriesRecord?.platforms || series_context?.platforms)
      ? (seriesRecord?.platforms || series_context?.platforms).join(', ')
      : 'TikTok, Shorts, Reels';
    const contentStyle = seriesRecord?.content_style || series_context?.content_style || 'Documentary';
    const tone = seriesRecord?.tone || series_context?.tone || 'Informative';
    const visualStyle = seriesRecord?.visual_style || series_context?.visual_style || 'Cinematic';

    const specifiedTopic = videoRecord?.topic || clientTopic || series_context?.topic || '';

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin.from('videos').update({ progress: 25 }).eq('id', video_id);
    }

    const parsed = await generateStudioScript({
      seriesName,
      niche,
      description,
      language,
      durationSec,
      platforms,
      contentStyle,
      tone,
      visualStyle,
      specifiedTopic,
      autoTopic: Boolean(auto_topic),
    });

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin.from('videos').update({ progress: 60 }).eq('id', video_id);
    }

    if (!parsed || !parsed.topic || !parsed.title || !parsed.script || !Array.isArray(parsed.scenes)) {
      throw new Error('Formato de resposta do Gemini inválido.');
    }

    const calculatedDuration = Math.round(
      parsed.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)
    ) || durationSec;

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin.from('videos').update({ progress: 90 }).eq('id', video_id);

      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          topic: parsed.topic,
          title: parsed.title,
          script: parsed.script,
          duration: calculatedDuration,
          status: 'draft',
          progress: 100,
          error_message: null,
        })
        .eq('id', video_id);

      if (updateError) throw updateError;

      await supabaseAdmin.from('video_scenes').delete().eq('video_id', video_id);

      const sceneRows = parsed.scenes.map((s: any) => ({
        video_id,
        user_id: userId,
        scene_order: s.scene_order,
        text: s.text,
        visual_prompt: s.visual_prompt,
        duration: s.duration,
      }));

      const { error: scenesError } = await supabaseAdmin.from('video_scenes').insert(sceneRows);
      if (scenesError) {
        console.error('Error inserting video_scenes:', scenesError);
      }
    }

    return res.status(200).json({
      success: true,
      video_id: video_id || 'demo-video-id',
      topic: parsed.topic,
      title: parsed.title,
      script: parsed.script,
      scenes: parsed.scenes,
      scenes_count: parsed.scenes.length,
    });

  } catch (err: any) {
    console.error('Error in /api/generate-video-script:', err);

    if (video_id) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin.from('videos').update({
            status: 'failed',
            progress: 0,
            error_message: err.message || 'Falha ao gerar o roteiro.',
          }).eq('id', video_id);
        }
      } catch (_) {}
    }

    return res.status(500).json({ error: err.message || 'Erro durante a geração do roteiro com Gemini.' });
  }
}
