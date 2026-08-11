import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { buildEnrichedVisualPrompt, generateGeminiSceneImage, isValidSupabaseUrl } from '../../server/services/apiHelpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {}

  const { video_id } = body;

  if (!video_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'video_id is required' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    let userId = 'guest-user';
    let isSupabaseMode = false;
    let supabaseAdmin: any = null;

    if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey && token && token !== 'guest-token') {
      const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabaseUserClient.auth.getUser();
      if (user) {
        userId = user.id;
        isSupabaseMode = true;
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      } else {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized user token' }),
        };
      }
    }

    let videoRecord: any = null;
    let seriesRecord: any = null;
    let scenes: any[] = [];

    if (isSupabaseMode && supabaseAdmin) {
      const { data: videoData, error: videoErr } = await supabaseAdmin
        .from('videos')
        .select('*, series(*)')
        .eq('id', video_id)
        .maybeSingle();

      if (videoErr || !videoData) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Video not found' }),
        };
      }

      if (videoData.user_id !== userId) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Forbidden: You do not own this video' }),
        };
      }

      videoRecord = videoData;
      seriesRecord = videoData.series || null;

      await supabaseAdmin
        .from('videos')
        .update({ status: 'generating', progress: 55 })
        .eq('id', video_id);

      const { data: scenesData } = await supabaseAdmin
        .from('video_scenes')
        .select('*')
        .eq('video_id', video_id)
        .order('scene_order', { ascending: true });

      scenes = scenesData || [];
    } else {
      scenes = [
        { id: 'scene-1', video_id, scene_order: 1, visual_prompt: 'A Porsche 911 on a mountain pass at sunset' },
        { id: 'scene-2', video_id, scene_order: 2, visual_prompt: 'Engine detail shot with gleaming chrome' },
      ];
    }

    const updatedScenes: any[] = [];
    const totalScenes = scenes.length || 1;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      try {
        if (isSupabaseMode && supabaseAdmin) {
          await supabaseAdmin
            .from('video_scenes')
            .update({ visual_status: 'generating', visual_error: null })
            .eq('id', scene.id);
        }

        const prompt = buildEnrichedVisualPrompt(scene.visual_prompt, seriesRecord);
        const { base64: imageBase64, mimeType } = await generateGeminiSceneImage(prompt);

        const imageBuffer = Buffer.from(imageBase64, 'base64');
        let visualUrl = `data:${mimeType};base64,${imageBase64}`;
        let storagePath = null;

        if (isSupabaseMode && supabaseAdmin) {
          storagePath = `${userId}/videos/${video_id}/scenes/${scene.id}.png`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from('media')
            .upload(storagePath, imageBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = supabaseAdmin.storage
              .from('media')
              .getPublicUrl(storagePath);
            if (urlData?.publicUrl) {
              visualUrl = urlData.publicUrl;
            }
          }

          const { data: savedScene } = await supabaseAdmin
            .from('video_scenes')
            .update({
              visual_url: visualUrl,
              visual_storage_path: storagePath,
              visual_status: 'ready',
              visual_error: null,
              visual_generated_at: new Date().toISOString(),
            })
            .eq('id', scene.id)
            .select('*')
            .single();

          updatedScenes.push(savedScene || { ...scene, visual_url: visualUrl, visual_status: 'ready' });

          const stepProgress = Math.round(50 + ((i + 1) / totalScenes) * 35);
          await supabaseAdmin
            .from('videos')
            .update({ progress: stepProgress })
            .eq('id', video_id);

        } else {
          updatedScenes.push({
            ...scene,
            visual_url: visualUrl,
            visual_status: 'ready',
            visual_generated_at: new Date().toISOString(),
          });
        }
      } catch (sceneErr: any) {
        console.error(`Error generating visual for scene ${scene.id}:`, sceneErr);
        if (isSupabaseMode && supabaseAdmin) {
          await supabaseAdmin
            .from('video_scenes')
            .update({
              visual_status: 'failed',
              visual_error: sceneErr.message || 'Image generation failed',
            })
            .eq('id', scene.id);
        }
        updatedScenes.push({
          ...scene,
          visual_status: 'failed',
          visual_error: sceneErr.message || 'Image generation failed',
        });
      }
    }

    const firstReady = updatedScenes.find((s) => s.visual_url && s.visual_status === 'ready');
    if (isSupabaseMode && supabaseAdmin) {
      if (firstReady?.visual_url && (!videoRecord?.thumbnail_url || videoRecord.thumbnail_url.includes('unsplash'))) {
        await supabaseAdmin
          .from('videos')
          .update({ thumbnail_url: firstReady.visual_url })
          .eq('id', video_id);
      }

      await supabaseAdmin
        .from('videos')
        .update({ progress: 85, status: 'draft' })
        .eq('id', video_id);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        video_id,
        scenes: updatedScenes,
      }),
    };

  } catch (err: any) {
    console.error('Error in generate-video-visuals Netlify function:', err);

    if (body?.video_id) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        if (isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey) {
          const admin = createClient(supabaseUrl, supabaseServiceKey);
          await admin
            .from('videos')
            .update({ status: 'draft' })
            .eq('id', body.video_id);
        }
      } catch (_) {}
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Falha ao gerar imagens do vídeo.' }),
    };
  }
};
