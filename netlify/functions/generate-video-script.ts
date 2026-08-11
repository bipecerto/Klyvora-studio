import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { sanitizeModelName, isValidSupabaseUrl } from '../../server/services/apiHelpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {}

  const { video_id, auto_topic, series_context, topic: clientTopic } = body;

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    let videoRecord: any = null;
    let seriesRecord: any = null;
    let userId = 'guest-user';
    let isSupabaseMode = false;
    let supabaseAdmin: any = null;

    if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey && token && token !== 'guest-token') {
      try {
        const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) {
          userId = user.id;
          isSupabaseMode = true;
          supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

          if (video_id) {
            const { data: video } = await supabaseAdmin
              .from('videos')
              .select('*, series(*)')
              .eq('id', video_id)
              .maybeSingle();

            if (video && video.user_id === user.id) {
              videoRecord = video;
              seriesRecord = video.series;

              await supabaseAdmin
                .from('videos')
                .update({ status: 'generating', progress: 10, error_message: null })
                .eq('id', video_id);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase auth check failed:', err);
      }
    }

    const seriesName = seriesRecord?.name || series_context?.name || 'General Series';
    const niche = seriesRecord?.niche || series_context?.niche || 'General';
    const description = seriesRecord?.description || series_context?.description || '';
    const language = seriesRecord?.language || series_context?.language || 'English';
    const durationSec = seriesRecord?.duration || series_context?.duration || 60;
    const platforms = Array.isArray(seriesRecord?.platforms || series_context?.platforms)
      ? (seriesRecord?.platforms || series_context?.platforms).join(', ')
      : 'TikTok, Shorts, Reels';
    const contentStyle = seriesRecord?.content_style || series_context?.content_style || 'Documentary';
    const tone = seriesRecord?.tone || series_context?.tone || 'Informative';
    const visualStyle = seriesRecord?.visual_style || series_context?.visual_style || 'Cinematic';

    let specifiedTopic = videoRecord?.topic || clientTopic || series_context?.topic || '';

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin
        .from('videos')
        .update({ progress: 25 })
        .eq('id', video_id);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (isSupabaseMode && supabaseAdmin && video_id) {
        await supabaseAdmin
          .from('videos')
          .update({
            status: 'failed',
            progress: 0,
            error_message: 'GEMINI_API_KEY environment variable is missing on the server.'
          })
          .eq('id', video_id);
      }

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is missing on the server.' }),
      };
    }

    const rawModel = process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL;
    const modelName = sanitizeModelName(rawModel, 'gemini-3.6-flash');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const topicDirective = auto_topic || !specifiedTopic.trim()
      ? 'Choose a compelling, fresh, highly engaging topic tailored to this series.'
      : `Use or refine this topic requested by the user: "${specifiedTopic}"`;

    const prompt = `You are an expert short-form video producer creating viral content for TikTok, Instagram Reels, and YouTube Shorts.

SERIES CONTEXT:
- Series Name: ${seriesName}
- Niche/Category: ${niche}
- Description: ${description}
- Language: ${language}
- Target Duration: ${durationSec} seconds
- Target Platforms: ${platforms}
- Content Style: ${contentStyle}
- Tone: ${tone}
- Visual Style: ${visualStyle}

TOPIC INSTRUCTION:
${topicDirective}

OUTPUT REQUIREMENTS:
1. "topic": Specific, intriguing, non-clickbait topic title in language "${language}".
2. "title": Short, catchy video title for social media in language "${language}".
3. "script": Full voiceover narration ONLY in "${language}".
   - Strictly NO scene markers ("Scene 1:"), NO speaker labels ("Narrator:"), NO visual cues, NO camera notes.
   - Natural narrative structure (Hook -> Development -> Payoff) without literal section headers.
   - Word count target for ${durationSec}s duration:
     ~30s: 65-80 words
     ~45s: 95-115 words
     ~60s: 130-160 words
     ~90s: 195-230 words
4. "scenes": Break the narration script into sequentially ordered scene objects matching ${durationSec}s.
   - Number of scenes: ~30s (6-8 scenes), ~45s (8-11 scenes), ~60s (10-14 scenes), ~90s (14-20 scenes).
   - "scene_order": Integer starting at 1.
   - "text": The EXACT narration text spoken during this scene. Concatenating all scene texts MUST form the exact script.
   - "visual_prompt": Detailed visual description in English for AI image/video generation. Must strictly follow the "${visualStyle}" aesthetic and maintain consistent subject/period tone. Do NOT include text overlays, captions, scene labels, or audio instructions.
   - "duration": Scene duration in seconds (number > 0). The sum of scene durations MUST be close to ${durationSec} seconds.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            title: { type: Type.STRING },
            script: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scene_order: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                },
                required: ['scene_order', 'text', 'visual_prompt', 'duration'],
              },
            },
          },
          required: ['topic', 'title', 'script', 'scenes'],
        },
      },
    });

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin
        .from('videos')
        .update({ progress: 60 })
        .eq('id', video_id);
    }

    const rawText = response.text || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error('Failed to parse structured JSON from Gemini response.');
    }

    if (
      !parsed ||
      !parsed.topic ||
      !parsed.title ||
      !parsed.script ||
      !Array.isArray(parsed.scenes) ||
      parsed.scenes.length === 0
    ) {
      throw new Error('Invalid output payload from Gemini API.');
    }

    for (const scene of parsed.scenes) {
      if (
        typeof scene.scene_order !== 'number' ||
        !scene.text ||
        !scene.visual_prompt ||
        typeof scene.duration !== 'number' ||
        scene.duration <= 0
      ) {
        throw new Error('Invalid scene format detected in generated output.');
      }
    }

    const calculatedDuration = Math.round(
      parsed.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)
    ) || durationSec;

    if (isSupabaseMode && supabaseAdmin && video_id) {
      await supabaseAdmin
        .from('videos')
        .update({ progress: 90 })
        .eq('id', video_id);

      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          topic: parsed.topic,
          title: parsed.title,
          script: parsed.script,
          duration: calculatedDuration,
          status: 'draft',
          progress: 100,
          error_message: null,
        })
        .eq('id', video_id);

      if (updateError) throw updateError;

      await supabaseAdmin
        .from('video_scenes')
        .delete()
        .eq('video_id', video_id);

      const sceneRows = parsed.scenes.map((s: any) => ({
        video_id,
        user_id: userId,
        scene_order: s.scene_order,
        text: s.text,
        visual_prompt: s.visual_prompt,
        duration: s.duration,
      }));

      const { error: scenesError } = await supabaseAdmin
        .from('video_scenes')
        .insert(sceneRows);

      if (scenesError) {
        console.error('Error inserting video_scenes:', scenesError);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        video_id: video_id || 'demo-video-id',
        topic: parsed.topic,
        title: parsed.title,
        script: parsed.script,
        scenes: parsed.scenes,
        scenes_count: parsed.scenes.length,
      }),
    };

  } catch (err: any) {
    console.error('Error in generate-video-script Netlify function:', err);

    if (video_id) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
        if (isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          await supabaseAdmin
            .from('videos')
            .update({
              status: 'failed',
              progress: 0,
              error_message: err.message || 'Script generation failed.',
            })
            .eq('id', video_id);
        }
      } catch (_) {}
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'An error occurred during script generation.' }),
    };
  }
};
