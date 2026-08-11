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

  const { video_id, scene_id } = body;

  if (!video_id || !scene_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'video_id and scene_id are required' }),
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
    let sceneRecord: any = null;
    let seriesRecord: any = null;

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

      const { data: sceneData, error: sceneErr } = await supabaseAdmin
        .from('video_scenes')
        .select('*')
        .eq('id', scene_id)
        .maybeSingle();

      if (sceneErr || !sceneData) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Scene not found' }),
        };
      }

      if (sceneData.user_id !== userId || sceneData.video_id !== video_id) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Forbidden: Scene ownership mismatch' }),
        };
      }

      sceneRecord = sceneData;

      await supabaseAdmin
        .from('video_scenes')
        .update({ visual_status: 'generating', visual_error: null })
        .eq('id', scene_id);
    } else {
      sceneRecord = {
        id: scene_id,
        video_id,
        user_id: userId,
        scene_order: 1,
        visual_prompt: 'A dramatic Porsche driving through a foggy mountain pass',
      };
    }

    const finalPrompt = buildEnrichedVisualPrompt(sceneRecord.visual_prompt, seriesRecord);
    const { base64: imageBase64, mimeType } = await generateGeminiSceneImage(finalPrompt);

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    let visualUrl = `data:${mimeType};base64,${imageBase64}`;
    let storagePath = null;

    if (isSupabaseMode && supabaseAdmin) {
      storagePath = `${userId}/videos/${video_id}/scenes/${scene_id}.png`;

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
      } else {
        console.warn('Supabase storage scene upload warning:', uploadErr.message);
      }

      const { data: updatedScene, error: updateErr } = await supabaseAdmin
        .from('video_scenes')
        .update({
          visual_url: visualUrl,
          visual_storage_path: storagePath,
          visual_status: 'ready',
          visual_error: null,
          visual_generated_at: new Date().toISOString(),
        })
        .eq('id', scene_id)
        .select('*')
        .single();

      if (updateErr) {
        console.warn('Error updating video_scenes table:', updateErr);
      } else {
        sceneRecord = updatedScene;
      }

      if (videoRecord && (!videoRecord.thumbnail_url || videoRecord.thumbnail_url.includes('unsplash'))) {
        if (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: visualUrl })
            .eq('id', video_id);
        }
      }
    } else {
      sceneRecord = {
        ...sceneRecord,
        visual_url: visualUrl,
        visual_status: 'ready',
        visual_generated_at: new Date().toISOString(),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        scene: sceneRecord,
      }),
    };

  } catch (err: any) {
    console.error('Error in generate-scene-image Netlify function:', err);

    if (body?.scene_id) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        if (isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey) {
          const admin = createClient(supabaseUrl, supabaseServiceKey);
          await admin
            .from('video_scenes')
            .update({ visual_status: 'failed', visual_error: err.message || 'Image generation failed' })
            .eq('id', body.scene_id);
        }
      } catch (_) {}
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Falha ao gerar imagem da cena com Gemini.' }),
    };
  }
};
