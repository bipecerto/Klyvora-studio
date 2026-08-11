import { buildEnrichedVisualPrompt, generateCloudflareImage } from '../server-lib/cloudflareImages';
import { resolveAuth } from '../server-lib/supabaseServer';

export const maxDuration = 300;

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.video_id) return Response.json({ error: 'video_id is required.' }, { status: 400 });

  try {
    const auth = await resolveAuth(request.headers.get('authorization'));
    let scenes: any[] = Array.isArray(body.scenes) ? body.scenes : [];
    let series: any = body.series_context || null;
    let video: any = null;

    if (auth.authenticated && auth.admin) {
      const { data: videoData } = await auth.admin.from('videos').select('*, series(*)').eq('id', body.video_id).maybeSingle();
      if (!videoData || videoData.user_id !== auth.userId) return Response.json({ error: 'Video not found.' }, { status: 404 });
      video = videoData;
      series = videoData.series || series;
      const { data: sceneData } = await auth.admin.from('video_scenes').select('*').eq('video_id', body.video_id).eq('user_id', auth.userId).order('scene_order', { ascending: true });
      scenes = sceneData || [];
      await auth.admin.from('videos').update({ status: 'generating', progress: 55 }).eq('id', body.video_id);
    }

    if (!scenes.length) return Response.json({ error: 'Nenhuma cena disponível para gerar imagens.' }, { status: 400 });

    const updatedScenes: any[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      try {
        if (auth.authenticated && auth.admin) await auth.admin.from('video_scenes').update({ visual_status: 'generating', visual_error: null }).eq('id', scene.id);
        const generated = await generateCloudflareImage(buildEnrichedVisualPrompt(scene.visual_prompt, series));
        const buffer = Buffer.from(generated.base64, 'base64');
        let visualUrl = `data:${generated.mimeType};base64,${generated.base64}`;
        let storagePath: string | null = null;

        if (auth.authenticated && auth.admin) {
          storagePath = `${auth.userId}/videos/${body.video_id}/scenes/${scene.id}.jpg`;
          const { error: uploadError } = await auth.admin.storage.from('media').upload(storagePath, buffer, { contentType: generated.mimeType, upsert: true });
          if (!uploadError) {
            const { data: publicData } = auth.admin.storage.from('media').getPublicUrl(storagePath);
            if (publicData?.publicUrl) visualUrl = publicData.publicUrl;
          }
          const { data: saved } = await auth.admin.from('video_scenes').update({
            visual_url: visualUrl,
            visual_storage_path: storagePath,
            visual_status: 'ready',
            visual_error: null,
            visual_generated_at: new Date().toISOString(),
          }).eq('id', scene.id).select('*').single();
          updatedScenes.push(saved || { ...scene, visual_url: visualUrl, visual_status: 'ready' });
          await auth.admin.from('videos').update({ progress: Math.round(55 + ((i + 1) / scenes.length) * 30) }).eq('id', body.video_id);
        } else {
          updatedScenes.push({ ...scene, visual_url: visualUrl, visual_status: 'ready', visual_error: null, visual_generated_at: new Date().toISOString() });
        }
      } catch (sceneError: any) {
        const failed = { ...scene, visual_status: 'failed', visual_error: sceneError?.message || 'Image generation failed' };
        updatedScenes.push(failed);
        if (auth.authenticated && auth.admin) await auth.admin.from('video_scenes').update({ visual_status: 'failed', visual_error: failed.visual_error }).eq('id', scene.id);
      }
    }

    if (auth.authenticated && auth.admin) {
      const firstReady = updatedScenes.find((scene) => scene.visual_url && scene.visual_status === 'ready');
      if (firstReady?.visual_url && (!video?.thumbnail_url || String(video.thumbnail_url).includes('unsplash'))) {
        await auth.admin.from('videos').update({ thumbnail_url: firstReady.visual_url }).eq('id', body.video_id);
      }
      await auth.admin.from('videos').update({ progress: 85, status: 'draft' }).eq('id', body.video_id);
    }

    const readyCount = updatedScenes.filter((scene) => scene.visual_status === 'ready').length;
    if (!readyCount) return Response.json({ error: updatedScenes[0]?.visual_error || 'Nenhuma imagem pôde ser gerada.', scenes: updatedScenes }, { status: 502 });
    return Response.json({ success: true, video_id: body.video_id, scenes: updatedScenes, ready_count: readyCount, failed_count: updatedScenes.length - readyCount });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao gerar imagens do vídeo.' }, { status: 500 });
  }
}
