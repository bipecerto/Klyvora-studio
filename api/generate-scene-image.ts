import { buildEnrichedVisualPrompt, generateCloudflareImage } from '../server-lib/cloudflareImages';
import { resolveAuth } from '../server-lib/supabaseServer';

export const maxDuration = 120;

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.video_id || !body.scene_id) return Response.json({ error: 'video_id and scene_id are required.' }, { status: 400 });

  try {
    const auth = await resolveAuth(request.headers.get('authorization'));
    let scene: any = body.scene || null;
    let series: any = body.series_context || null;

    if (auth.authenticated && auth.admin) {
      const { data: video } = await auth.admin.from('videos').select('*, series(*)').eq('id', body.video_id).maybeSingle();
      if (!video || video.user_id !== auth.userId) return Response.json({ error: 'Video not found.' }, { status: 404 });
      series = video.series || series;
      const { data: sceneData } = await auth.admin.from('video_scenes').select('*').eq('id', body.scene_id).maybeSingle();
      if (!sceneData || sceneData.user_id !== auth.userId || sceneData.video_id !== body.video_id) return Response.json({ error: 'Scene not found.' }, { status: 404 });
      scene = sceneData;
      await auth.admin.from('video_scenes').update({ visual_status: 'generating', visual_error: null }).eq('id', body.scene_id);
    }

    if (!scene) return Response.json({ error: 'Dados da cena ausentes.' }, { status: 400 });
    const prompt = buildEnrichedVisualPrompt(scene.visual_prompt, series);
    const generated = await generateCloudflareImage(prompt);
    const buffer = Buffer.from(generated.base64, 'base64');
    let visualUrl = `data:${generated.mimeType};base64,${generated.base64}`;
    let storagePath: string | null = null;

    if (auth.authenticated && auth.admin) {
      storagePath = `${auth.userId}/videos/${body.video_id}/scenes/${body.scene_id}.jpg`;
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
      }).eq('id', body.scene_id).select('*').single();
      scene = saved || scene;
    } else {
      scene = { ...scene, visual_url: visualUrl, visual_status: 'ready', visual_error: null, visual_generated_at: new Date().toISOString() };
    }

    return Response.json({ success: true, scene, provider: generated.provider, model: generated.model });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao gerar imagem da cena.' }, { status: 500 });
  }
}
