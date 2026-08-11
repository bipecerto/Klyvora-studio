import { createClient } from '@supabase/supabase-js';
import { generateCloudflareImage, buildEnrichedVisualPrompt } from '../cloudflareImages';

export async function handler(req: any, res: any) {
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

  const { video_id } = req.body || {};

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    let userId = 'guest-user';
    let isSupabaseMode = false;
    let supabaseAdmin: any = null;

    if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
      const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabaseUserClient.auth.getUser();
      if (user) {
        userId = user.id;
        isSupabaseMode = true;
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      }
    }

    let videoRecord: any = null;
    let seriesRecord: any = null;
    let scenes: any[] = [];

    if (isSupabaseMode && supabaseAdmin) {
      const { data: videoData } = await supabaseAdmin
        .from('videos')
        .select('*, series(*)')
        .eq('id', video_id)
        .maybeSingle();

      if (!videoData) {
        return res.status(404).json({ error: 'Video not found' });
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
      scenes = Array.isArray(req.body?.scenes) ? req.body.scenes : [];
    }

    if (!scenes.length) {
      return res.status(400).json({ error: 'Nenhuma cena disponível para gerar imagens.' });
    }

    const updatedScenes: any[] = [];
    const totalScenes = scenes.length;

    for (let i = 0; i < totalScenes; i++) {
      const scene = scenes[i];
      const sceneId = scene.id || `scene-${i + 1}`;

      try {
        if (isSupabaseMode && supabaseAdmin) {
          await supabaseAdmin
            .from('video_scenes')
            .update({ visual_status: 'generating', visual_error: null })
            .eq('id', sceneId);
        }

        const rawPrompt = scene.visual_prompt || scene.visualPrompt || 'A cinematic scene for a faceless video';
        const finalPrompt = buildEnrichedVisualPrompt(rawPrompt, seriesRecord);

        // Generate ONE image per scene prompt
        const imageResult = await generateCloudflareImage({ prompt: finalPrompt, width: 576, height: 1024 });
        const imageBuffer = Buffer.from(imageResult.base64, 'base64');
        let visualUrl = `data:${imageResult.mimeType};base64,${imageResult.base64}`;
        let storagePath = null;

        if (isSupabaseMode && supabaseAdmin) {
          storagePath = `${userId}/videos/${video_id}/scenes/${sceneId}.jpg`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from('media')
            .upload(storagePath, imageBuffer, {
              contentType: imageResult.mimeType,
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(storagePath);
            if (urlData?.publicUrl) visualUrl = urlData.publicUrl;
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
            .eq('id', sceneId)
            .select('*')
            .maybeSingle();

          updatedScenes.push(savedScene || {
            ...scene,
            visual_url: visualUrl,
            imageUrl: visualUrl,
            visual_status: 'ready',
            status: 'ready',
          });

          const stepProgress = Math.round(50 + ((i + 1) / totalScenes) * 35);
          await supabaseAdmin.from('videos').update({ progress: stepProgress }).eq('id', video_id);

        } else {
          updatedScenes.push({
            ...scene,
            visual_url: visualUrl,
            imageUrl: visualUrl,
            visual_status: 'ready',
            status: 'ready',
            visual_generated_at: new Date().toISOString(),
          });
        }
      } catch (sceneErr: any) {
        console.error(`Error generating visual for scene ${sceneId}:`, sceneErr);

        if (isSupabaseMode && supabaseAdmin) {
          await supabaseAdmin
            .from('video_scenes')
            .update({
              visual_status: 'failed',
              visual_error: sceneErr.message || 'Image generation failed',
            })
            .eq('id', sceneId);
        }

        updatedScenes.push({
          ...scene,
          visual_status: 'failed',
          status: 'error',
          visual_error: sceneErr.message || 'Image generation failed',
        });
      }
    }

    const firstReady = updatedScenes.find((s) => (s.visual_url || s.imageUrl) && (s.visual_status === 'ready' || s.status === 'ready'));
    if (isSupabaseMode && supabaseAdmin) {
      if (firstReady && (!videoRecord?.thumbnail_url || videoRecord.thumbnail_url.includes('unsplash'))) {
        const thumbUrl = firstReady.visual_url || firstReady.imageUrl;
        await supabaseAdmin.from('videos').update({ thumbnail_url: thumbUrl }).eq('id', video_id);
      }

      await supabaseAdmin.from('videos').update({ progress: 85, status: 'draft' }).eq('id', video_id);
    }

    return res.status(200).json({
      success: true,
      video_id,
      scenes: updatedScenes,
    });

  } catch (err: any) {
    console.error('Error in /api/generate-video-visuals:', err);
    return res.status(500).json({ error: err.message || 'Falha ao gerar imagens do vídeo com Cloudflare FLUX.' });
  }
}
