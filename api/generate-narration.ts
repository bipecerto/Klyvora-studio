import { synthesizeFreeTts } from '../server-lib/freeTts';
import { resolveAuth } from '../server-lib/supabaseServer';

export const maxDuration = 300;

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const videoId = body.video_id || 'demo-video-id';
  try {
    const auth = await resolveAuth(request.headers.get('authorization'));
    let video: any = null;
    let series: any = null;

    if (auth.authenticated && auth.admin && body.video_id) {
      const { data } = await auth.admin.from('videos').select('*').eq('id', body.video_id).maybeSingle();
      if (!data || data.user_id !== auth.userId) return Response.json({ error: 'Video not found.' }, { status: 404 });
      video = data;
      if (video.series_id) {
        const { data: seriesData } = await auth.admin.from('series').select('*').eq('id', video.series_id).maybeSingle();
        series = seriesData;
      }
      await auth.admin.from('videos').update({ narration_status: 'generating' }).eq('id', body.video_id);
    }

    const scriptText = video?.script || body.script;
    if (!scriptText) return Response.json({ error: 'Roteiro ausente para gerar narração.' }, { status: 400 });
    const language = series?.language || body.language || 'Português do Brasil';
    const audio = await synthesizeFreeTts(scriptText, language);
    let narrationUrl = `data:audio/mpeg;base64,${audio.toString('base64')}`;
    let storagePath: string | null = null;

    if (auth.authenticated && auth.admin && body.video_id) {
      storagePath = `${auth.userId}/videos/${body.video_id}/narration.mp3`;
      const { error: uploadError } = await auth.admin.storage.from('media').upload(storagePath, audio, { contentType: 'audio/mpeg', upsert: true });
      if (!uploadError) {
        const { data: publicData } = auth.admin.storage.from('media').getPublicUrl(storagePath);
        if (publicData?.publicUrl) narrationUrl = publicData.publicUrl;
      }
      const estimatedDuration = Math.max(5, Math.round(String(scriptText).split(/\s+/).filter(Boolean).length / 2.5));
      await auth.admin.from('videos').update({
        narration_url: narrationUrl,
        narration_storage_path: storagePath,
        narration_voice: body.voice_id || series?.voice_id || 'beta-free',
        narration_duration: estimatedDuration,
        narration_status: 'ready',
      }).eq('id', body.video_id);
    }

    const estimatedDuration = Math.max(5, Math.round(String(scriptText).split(/\s+/).filter(Boolean).length / 2.5));
    return Response.json({
      success: true,
      video_id: videoId,
      narration_url: narrationUrl,
      narration_voice: body.voice_id || 'beta-free',
      narration_status: 'ready',
      narration_duration: estimatedDuration,
      provider: 'google-translate-tts-beta',
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao gerar narração.' }, { status: 500 });
  }
}
