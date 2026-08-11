import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isValidSupabaseUrl } from '../../server/services/apiHelpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Extract video ID from query param or URL path
  let videoId = event.queryStringParameters?.id || '';
  if (!videoId) {
    const segments = event.path.split('/').filter(Boolean);
    videoId = segments[segments.length - 1] || '';
  }

  if (!videoId || videoId === 'video-status') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Video ID is required.' }),
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!isValidSupabaseUrl(supabaseUrl) || !supabaseServiceKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Supabase not configured.' }),
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .select('id, status, progress, render_status, render_progress, render_error, video_url, narration_url, rendered_at')
      .eq('id', videoId)
      .maybeSingle();

    if (error || !video) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Video not found.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        video,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Failed to fetch status.' }),
    };
  }
};
