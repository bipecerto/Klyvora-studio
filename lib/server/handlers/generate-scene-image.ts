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

  const { video_id, scene_id, prompt: customPrompt, width, height } = req.body || {};

  if (!video_id || !scene_id) {
    return res.status(400).json({ error: 'video_id and scene_id are required' });
  }

  let isSupabaseMode = false;
  let supabaseAdmin: any = null;
  let userId = 'guest-user';
  let sceneRecord: any = null;
  let seriesRecord: any = null;

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

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

    if (isSupabaseMode && supabaseAdmin) {
      const { data: videoData } = await supabaseAdmin
        .from('videos')
        .select('*, series(*)')
        .eq('id', video_id)
        .maybeSingle();

      if (videoData) {
        seriesRecord = videoData.series || null;
      }

      const { data: sceneData } = await supabaseAdmin
        .from('video_scenes')
        .select('*')
        .eq('id', scene_id)
        .maybeSingle();

      if (sceneData) {
        sceneRecord = sceneData;
        await supabaseAdmin
          .from('video_scenes')
          .update({ visual_status: 'generating', visual_error: null })
          .eq('id', scene_id);
      }
    } else {
      sceneRecord = req.body?.scene || {
        id: scene_id,
        video_id,
        visual_prompt: customPrompt || 'A dramatic scene for a faceless video',
      };
    }

    const rawPrompt = customPrompt || sceneRecord?.visual_prompt || sceneRecord?.visualPrompt || 'A dramatic scene for a faceless video';
    const finalPrompt = buildEnrichedVisualPrompt(rawPrompt, seriesRecord);

    let imageResult: { base64: string; mimeType: string };
    try {
      imageResult = await generateCloudflareImage({
        prompt: finalPrompt,
      });
    } catch (imageErr: any) {
      console.error(`Cloudflare image generation failed for scene ${scene_id}:`, imageErr);

      // Handle failure gracefully: mark scene status as "error" / "failed" without crashing app
      if (isSupabaseMode && supabaseAdmin) {
        await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_status: 'failed',
            visual_error: imageErr.message || 'Falha na geração de imagem',
          })
          .eq('id', scene_id);
      }

      const failedScene = {
        ...(sceneRecord || {}),
        id: scene_id,
        visual_status: 'failed',
        status: 'error',
        visual_error: imageErr.message || 'Falha ao gerar imagem com Cloudflare FLUX.',
      };

      return res.status(200).json({
        success: false,
        error: imageErr.message || 'Falha na geração de imagem.',
        scene: failedScene,
      });
    }

    const imageBuffer = Buffer.from(imageResult.base64, 'base64');
    let visualUrl = `data:${imageResult.mimeType};base64,${imageResult.base64}`;
    let storagePath = null;

    if (isSupabaseMode && supabaseAdmin) {
      storagePath = `${userId}/videos/${video_id}/scenes/${scene_id}.jpg`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('media')
        .upload(storagePath, imageBuffer, {
          contentType: imageResult.mimeType,
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Supabase Storage upload failed for scene ${scene_id}:`, uploadErr.message || uploadErr);

        await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_status: 'failed',
            visual_error: `Falha ao salvar imagem no Supabase Storage: ${uploadErr.message || 'erro desconhecido'}`,
          })
          .eq('id', scene_id);

        return res.status(200).json({
          success: false,
          error: `Falha ao salvar imagem no Supabase Storage: ${uploadErr.message || 'erro desconhecido'}`,
          scene: {
            ...(sceneRecord || {}),
            id: scene_id,
            visual_status: 'failed',
            status: 'error',
          },
        });
      }

      const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(storagePath);
      if (urlData?.publicUrl) {
        visualUrl = urlData.publicUrl;
      }

      const { data: updatedScene } = await supabaseAdmin
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
        .maybeSingle();

      sceneRecord = updatedScene || {
        ...sceneRecord,
        visual_url: visualUrl,
        visual_status: 'ready',
        status: 'ready',
      };
    } else {
      sceneRecord = {
        ...sceneRecord,
        id: scene_id,
        visual_url: visualUrl,
        imageUrl: visualUrl,
        visual_status: 'ready',
        status: 'ready',
      };
    }

    return res.status(200).json({
      success: true,
      scene: sceneRecord,
    });

  } catch (err: any) {
    console.error('Error in /api/generate-scene-image:', err);
    return res.status(500).json({ error: err.message || 'Falha ao gerar imagem da cena com Cloudflare FLUX.' });
  }
}
