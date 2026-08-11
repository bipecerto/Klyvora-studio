import { generateStudioScript } from '../server-lib/geminiInteractions';
import { resolveAuth } from '../server-lib/supabaseServer';

export const maxDuration = 300;

export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { return Response.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const videoId = body.video_id || 'demo-video-id';

  try {
    const auth = await resolveAuth(request.headers.get('authorization'));
    let video: any = null;
    let series: any = body.series_context || null;

    if (auth.authenticated && auth.admin && body.video_id) {
      const { data } = await auth.admin.from('videos').select('*, series(*)').eq('id', body.video_id).maybeSingle();
      if (data && data.user_id === auth.userId) {
        video = data;
        series = data.series || series;
        await auth.admin.from('videos').update({ status: 'generating', progress: 25, error_message: null }).eq('id', body.video_id);
      }
    }

    const result = await generateStudioScript({
      seriesName: series?.name,
      niche: series?.niche,
      description: series?.description,
      language: series?.language || 'Português do Brasil',
      durationSec: series?.duration || video?.duration || body.duration || 60,
      platforms: series?.platforms,
      contentStyle: series?.content_style,
      tone: series?.tone,
      visualStyle: series?.visual_style,
      specifiedTopic: video?.topic || body.topic || series?.topic || '',
      autoTopic: Boolean(body.auto_topic),
    });

    const calculatedDuration = Math.round(result.scenes.reduce((sum, scene) => sum + scene.duration, 0));

    if (auth.authenticated && auth.admin && body.video_id) {
      await auth.admin.from('videos').update({
        topic: result.topic,
        title: result.title,
        script: result.script,
        duration: calculatedDuration,
        status: 'draft',
        progress: 100,
        error_message: null,
      }).eq('id', body.video_id).eq('user_id', auth.userId);

      await auth.admin.from('video_scenes').delete().eq('video_id', body.video_id).eq('user_id', auth.userId);
      await auth.admin.from('video_scenes').insert(result.scenes.map((scene) => ({
        video_id: body.video_id,
        user_id: auth.userId,
        scene_order: scene.scene_order,
        text: scene.text,
        visual_prompt: scene.visual_prompt,
        duration: scene.duration,
        visual_status: 'pending',
      })));
    }

    return Response.json({ success: true, video_id: videoId, ...result, scenes_count: result.scenes.length });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao gerar roteiro.' }, { status: 500 });
  }
}
