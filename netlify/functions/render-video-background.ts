import { Config, Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { renderVideoPipeline } from '../../server/services/renderEngine';
import { isValidSupabaseUrl } from '../../server/services/apiHelpers';

export const config: Config = {
  background: true,
  path: '/api/render-video',
};

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
    console.error('Render background function called without video_id');
    return { statusCode: 400, body: JSON.stringify({ error: 'video_id is required' }) };
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
      }
    }

    if (!isSupabaseMode || !supabaseAdmin) {
      console.error('Supabase configuration missing for render pipeline.');
      return { statusCode: 400, body: JSON.stringify({ error: 'Supabase configuration required for render pipeline.' }) };
    }

    // Lock check & validation
    const { data: video, error: videoErr } = await supabaseAdmin
      .from('videos')
      .select('*, series(*)')
      .eq('id', video_id)
      .maybeSingle();

    if (videoErr || !video) {
      console.error(`Video not found for render: ${video_id}`);
      return { statusCode: 404, body: JSON.stringify({ error: 'Video not found' }) };
    }

    if (video.user_id !== userId) {
      console.error(`Unauthorized render attempt for video ${video_id} by user ${userId}`);
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    // Check lock
    if (video.render_status === 'processing') {
      console.warn(`Video ${video_id} is already rendering.`);
      return { statusCode: 409, body: JSON.stringify({ error: 'Video is already rendering.' }) };
    }

    if (!video.narration_url) {
      await supabaseAdmin
        .from('videos')
        .update({ render_status: 'failed', render_error: 'Audio narration is missing.' })
        .eq('id', video_id);
      return { statusCode: 400, body: JSON.stringify({ error: 'Video narration audio is missing.' }) };
    }

    // Execute background FFmpeg video rendering pipeline
    console.log(`Starting Netlify Background Function video render for ${video_id}`);
    await renderVideoPipeline(video_id, userId, supabaseAdmin);
    console.log(`Successfully completed background render for ${video_id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, video_id, message: 'Video rendered successfully.' }),
    };

  } catch (err: any) {
    console.error(`Error in render-video-background Netlify Function for video ${video_id}:`, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Background render failed.' }),
    };
  }
};
