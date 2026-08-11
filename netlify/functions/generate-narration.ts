import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { convertPcmToWav, sanitizeModelName, isValidSupabaseUrl } from '../../server/services/apiHelpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let targetVideoId = '';
  let supabaseAdminClient: any = null;

  try {
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {}

    const { video_id, voice_id, voice_style } = body;
    targetVideoId = video_id;

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const isSupabaseMode = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey);

    let userId = 'u1';
    let videoRecord: any = null;
    let seriesRecord: any = null;

    if (isSupabaseMode) {
      supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

      if (token && token !== 'guest-token') {
        const { data: { user }, error: authErr } = await supabaseAdminClient.auth.getUser(token);
        if (authErr || !user) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Unauthorized user token.' }),
          };
        }
        userId = user.id;
      }

      if (video_id) {
        const { data: vData, error: vErr } = await supabaseAdminClient
          .from('videos')
          .select('*')
          .eq('id', video_id)
          .single();

        if (vErr || !vData) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Video record not found in database.' }),
          };
        }

        if (token && token !== 'guest-token' && vData.user_id !== userId) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Forbidden: Video does not belong to user.' }),
          };
        }

        videoRecord = vData;

        if (vData.series_id) {
          const { data: sData } = await supabaseAdminClient
            .from('series')
            .select('*')
            .eq('id', vData.series_id)
            .single();
          seriesRecord = sData;
        }

        await supabaseAdminClient
          .from('videos')
          .update({ narration_status: 'generating' })
          .eq('id', video_id);
      }
    }

    const scriptText = videoRecord?.script || body?.script || 'Welcome to Klyvora AI storytelling.';
    const voiceName = voice_id || videoRecord?.narration_voice || seriesRecord?.voice_id || 'Charon';
    const targetStyle = voice_style || seriesRecord?.voice_style || 'Documentary';

    const stylePrompts: Record<string, string> = {
      Documentary: 'Speak like a professional documentary narrator. Controlled pace, authoritative but natural delivery.',
      Deep: 'Use a deeper, deliberate narration style with controlled pacing.',
      Calm: 'Speak calmly, smoothly and clearly.',
      Energetic: 'Use an energetic, engaging delivery without shouting.',
      Natural: 'Speak naturally and clearly.',
      Dramatic: 'Deliver the narration with drama, tension, and emotional depth.',
    };

    const styleInstruction = stylePrompts[targetStyle] || stylePrompts['Documentary'];
    const ttsPrompt = `${styleInstruction}\n\nRecite the following text exactly as written without altering any words or facts:\n"${scriptText}"`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server.' }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const modelName = sanitizeModelName(process.env.GEMINI_TTS_MODEL, 'gemini-3.1-flash-tts-preview');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: ttsPrompt,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    });

    let audioBase64 = '';
    let mimeType = 'audio/wav';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }
    }

    if (!audioBase64) {
      throw new Error('Gemini TTS did not return audio output.');
    }

    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    if (rateMatch && rateMatch[1]) {
      sampleRate = parseInt(rateMatch[1], 10);
    }

    const rawBuffer = Buffer.from(audioBase64, 'base64');
    const wavBuffer = convertPcmToWav(rawBuffer, sampleRate, 1, 16);
    const finalBase64 = wavBuffer.toString('base64');

    let narrationUrl = `data:audio/wav;base64,${finalBase64}`;
    let storagePath = null;

    if (isSupabaseMode && supabaseAdminClient && video_id) {
      try {
        storagePath = `${userId}/videos/${video_id}/narration.wav`;

        const { error: uploadErr } = await supabaseAdminClient.storage
          .from('media')
          .upload(storagePath, wavBuffer, {
            contentType: 'audio/wav',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdminClient.storage
            .from('media')
            .getPublicUrl(storagePath);
          if (urlData?.publicUrl) {
            narrationUrl = urlData.publicUrl;
          }
        } else {
          console.warn('Storage upload notice:', uploadErr.message);
        }
      } catch (stgErr) {
        console.warn('Storage upload exception:', stgErr);
      }

      const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
      const estimatedDuration = Math.max(5, Math.round(wordCount / 2.5));

      await supabaseAdminClient
        .from('videos')
        .update({
          narration_url: narrationUrl,
          narration_storage_path: storagePath,
          narration_voice: voiceName,
          narration_duration: estimatedDuration,
          narration_status: 'ready',
        })
        .eq('id', video_id);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        video_id: video_id || 'demo-video-id',
        narration_url: narrationUrl,
        narration_voice: voiceName,
        narration_status: 'ready',
        narration_duration: Math.max(5, Math.round(scriptText.split(/\s+/).filter(Boolean).length / 2.5)),
      }),
    };

  } catch (err: any) {
    console.error('Error in generate-narration Netlify function:', err);

    if (targetVideoId && supabaseAdminClient) {
      try {
        await supabaseAdminClient
          .from('videos')
          .update({ narration_status: 'failed' })
          .eq('id', targetVideoId);
      } catch (_) {}
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Narration generation failed.' }),
    };
  }
};
