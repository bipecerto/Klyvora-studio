import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { generateAndSaveVideoCaptions } from '../../server/services/captionGenerator';
import { isValidSupabaseUrl } from '../../server/services/apiHelpers';

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
    let supabaseAdmin: any = null;

    if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey && token && token !== 'guest-token') {
      const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabaseUserClient.auth.getUser();
      if (user) {
        userId = user.id;
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      } else {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized user token' }),
        };
      }
    }

    if (!supabaseAdmin) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Supabase configuration required.' }),
      };
    }

    const captions = await generateAndSaveVideoCaptions(video_id, userId, supabaseAdmin);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        video_id,
        captions,
        count: captions.length,
      }),
    };

  } catch (err: any) {
    console.error('Error in generate-captions Netlify function:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Failed to generate captions.' }),
    };
  }
};
