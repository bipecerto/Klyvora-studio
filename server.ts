import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { generateAndSaveVideoCaptions } from './server/services/captionGenerator';
import { renderVideoPipeline } from './server/services/renderEngine';
import { convertPcmToWav, generateGeminiSceneImage, buildEnrichedVisualPrompt, sanitizeModelName, isValidSupabaseUrl } from './server/services/apiHelpers';
import { processSceneVisual } from './server/services/visualEngine';
import { buildStockSearchQuery, searchStockImages } from './server/services/stockService';
import { generateLongFormScriptAndChapters } from './server/services/longFormGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Server-side Gemini script generation API endpoint
  app.post('/api/generate-video-script', async (req, res) => {
    const { video_id, auto_topic, series_context, topic: clientTopic } = req.body || {};

    try {
      const authHeader = req.headers.authorization || '';
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
          console.warn('Supabase auth check failed on server:', err);
        }
      }

      // Prepare context parameters
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

      // Initialize Gemini (SERVER-SIDE ONLY)
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

        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on the server.' });
      }

      const rawModel = process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL;
      const modelName = sanitizeModelName(rawModel, 'gemini-3.6-flash');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const videoFormat = req.body?.video_format || videoRecord?.video_format || seriesRecord?.video_format || 'short_form';
      const targetDuration = Number(req.body?.target_duration || videoRecord?.target_duration || seriesRecord?.target_duration || (typeof durationSec === 'number' ? durationSec : 60));

      if (videoFormat === 'long_form' || targetDuration >= 300) {
        console.log(`[Server] Triggering Long Form Generation Pipeline for video ${video_id}...`);
        const longFormResult = await generateLongFormScriptAndChapters({
          videoId: video_id || 'demo-long-form',
          userId,
          seriesRecord,
          videoRecord,
          topic: specifiedTopic,
          autoTopic: Boolean(auto_topic),
          targetDurationSec: targetDuration,
          supabaseAdmin: isSupabaseMode ? supabaseAdmin : null,
          ai,
        });

        return res.status(200).json({
          success: true,
          video_id: video_id || 'demo-long-form',
          video_format: 'long_form',
          topic: longFormResult.topic,
          title: longFormResult.title,
          script: longFormResult.script,
          youtube_title: longFormResult.youtube_title,
          youtube_description: longFormResult.youtube_description,
          youtube_tags: longFormResult.youtube_tags,
          chapters: longFormResult.chapters,
          scenes: longFormResult.scenes,
          scenes_count: longFormResult.scenes.length,
        });
      }

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

      // Validation
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

      // Update Supabase if in Supabase mode
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

      return res.status(200).json({
        success: true,
        video_id: video_id || 'demo-video-id',
        topic: parsed.topic,
        title: parsed.title,
        script: parsed.script,
        scenes: parsed.scenes,
        scenes_count: parsed.scenes.length,
      });

    } catch (err: any) {
      console.error('Error in /api/generate-video-script:', err);

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

      return res.status(500).json({ error: err.message || 'An error occurred during script generation.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/preview-voice
  // =========================================================
  app.post('/api/preview-voice', async (req, res) => {
    try {
      const { voice = 'Charon', language = 'English' } = req.body || {};

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
      }

      const langLower = String(language).toLowerCase();
      let sampleText = 'Some machines are forgotten. Others simply refuse to disappear.';
      if (langLower.includes('portug') || langLower.includes('pt') || langLower.includes('br')) {
        sampleText = 'Algumas máquinas são esquecidas. Outras simplesmente se recusam a desaparecer.';
      } else if (langLower.includes('span') || langLower.includes('es')) {
        sampleText = 'Algunas máquinas son olvidadas. Otras simplemente se niegan a desaparecer.';
      } else if (langLower.includes('germ') || langLower.includes('de')) {
        sampleText = 'Manche Maschinen werden vergessen. Andere weigern sich einfach zu verschwinden.';
      } else if (langLower.includes('fren') || langLower.includes('fr')) {
        sampleText = 'Certaines machines sont oubliées. D\'autres refusent simplement de disparaître.';
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const modelName = sanitizeModelName(process.env.GEMINI_TTS_MODEL, 'gemini-3.1-flash-tts-preview');
      const response = await ai.models.generateContent({
        model: modelName,
        contents: sampleText,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice || 'Charon',
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
        return res.status(500).json({ error: 'Gemini TTS did not return audio data.' });
      }

      // Convert raw PCM to proper WAV buffer
      let sampleRate = 24000;
      const rateMatch = mimeType.match(/rate=(\d+)/i);
      if (rateMatch && rateMatch[1]) {
        sampleRate = parseInt(rateMatch[1], 10);
      }

      const rawBuffer = Buffer.from(audioBase64, 'base64');
      const wavBuffer = convertPcmToWav(rawBuffer, sampleRate, 1, 16);
      const finalBase64 = wavBuffer.toString('base64');
      const dataUrl = `data:audio/wav;base64,${finalBase64}`;

      return res.status(200).json({
        success: true,
        voice,
        mimeType: 'audio/wav',
        audioBase64: finalBase64,
        audioUrl: dataUrl,
      });
    } catch (err: any) {
      console.error('Error in /api/preview-voice:', err);
      return res.status(500).json({ error: err.message || 'Voice preview generation failed.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/generate-narration
  // =========================================================
  app.post('/api/generate-narration', async (req, res) => {
    let targetVideoId = '';
    let supabaseAdminClient: any = null;

    try {
      const { video_id, voice_id, voice_style } = req.body || {};
      targetVideoId = video_id;

      const authHeader = req.headers.authorization;
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
            return res.status(401).json({ error: 'Unauthorized user token.' });
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
            return res.status(404).json({ error: 'Video record not found in database.' });
          }

          if (token && token !== 'guest-token' && vData.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: Video does not belong to user.' });
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

      // Determine script text
      const scriptText = videoRecord?.script || req.body?.script || 'Welcome to Klyvora AI storytelling.';
      const voiceName = voice_id || videoRecord?.narration_voice || seriesRecord?.voice_id || 'Charon';
      const targetStyle = voice_style || seriesRecord?.voice_style || 'Documentary';

      // Build style instruction
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
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
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

      // Convert raw PCM to proper WAV buffer with 44-byte RIFF header
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

      // Upload to Supabase Storage if available
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
            console.warn('Storage upload notice (falling back to data URL):', uploadErr.message);
          }
        } catch (stgErr) {
          console.warn('Storage upload exception (falling back to data URL):', stgErr);
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

      return res.status(200).json({
        success: true,
        video_id: video_id || 'demo-video-id',
        narration_url: narrationUrl,
        narration_voice: voiceName,
        narration_status: 'ready',
        narration_duration: Math.max(5, Math.round(scriptText.split(/\s+/).filter(Boolean).length / 2.5)),
      });

    } catch (err: any) {
      console.error('Error in /api/generate-narration:', err);

      if (targetVideoId && supabaseAdminClient) {
        try {
          await supabaseAdminClient
            .from('videos')
            .update({ narration_status: 'failed' })
            .eq('id', targetVideoId);
        } catch (_) {}
      }

      return res.status(500).json({ error: err.message || 'Narration generation failed.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/generate-scene-image
  // =========================================================
  app.post('/api/generate-scene-image', async (req, res) => {
    const { video_id, scene_id } = req.body || {};

    if (!video_id || !scene_id) {
      return res.status(400).json({ error: 'video_id and scene_id are required' });
    }

    try {
      const authHeader = req.headers.authorization || '';
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
        } else {
          return res.status(401).json({ error: 'Unauthorized user token' });
        }
      }

      let videoRecord: any = null;
      let sceneRecord: any = null;
      let seriesRecord: any = null;

      if (isSupabaseMode && supabaseAdmin) {
        // Fetch video & check ownership
        const { data: videoData, error: videoErr } = await supabaseAdmin
          .from('videos')
          .select('*, series(*)')
          .eq('id', video_id)
          .maybeSingle();

        if (videoErr || !videoData) {
          return res.status(404).json({ error: 'Video not found' });
        }

        if (videoData.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden: You do not own this video' });
        }

        videoRecord = videoData;
        seriesRecord = videoData.series || null;

        // Fetch scene & check ownership
        const { data: sceneData, error: sceneErr } = await supabaseAdmin
          .from('video_scenes')
          .select('*')
          .eq('id', scene_id)
          .maybeSingle();

        if (sceneErr || !sceneData) {
          return res.status(404).json({ error: 'Scene not found' });
        }

        if (sceneData.user_id !== userId || sceneData.video_id !== video_id) {
          return res.status(403).json({ error: 'Forbidden: Scene ownership mismatch' });
        }

        sceneRecord = sceneData;

        // Update scene status to generating
        await supabaseAdmin
          .from('video_scenes')
          .update({ visual_status: 'generating', visual_error: null })
          .eq('id', scene_id);
      } else {
        sceneRecord = {
          id: scene_id,
          video_id,
          user_id: userId,
          scene_order: 1,
          visual_prompt: 'A dramatic Porsche driving through a foggy mountain pass',
        };
      }

      const updatedScene = await processSceneVisual({
        sceneRecord,
        seriesRecord,
        videoRecord,
        supabaseAdmin,
        userId,
        videoId: video_id,
      });

      return res.status(200).json({
        success: true,
        scene: updatedScene,
      });

    } catch (err: any) {
      console.error('Error in /api/generate-scene-image:', err);

      if (req.body?.scene_id) {
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
          if (supabaseUrl && supabaseServiceKey) {
            const admin = createClient(supabaseUrl, supabaseServiceKey);
            await admin
              .from('video_scenes')
              .update({ visual_status: 'failed', visual_error: err.message || 'Image generation failed' })
              .eq('id', req.body.scene_id);
          }
        } catch (_) {}
      }

      return res.status(500).json({ error: err.message || 'Falha ao processar visual da cena.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/generate-video-visuals
  // =========================================================
  app.post('/api/generate-video-visuals', async (req, res) => {
    const { video_id } = req.body || {};

    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    try {
      const authHeader = req.headers.authorization || '';
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
        } else {
          return res.status(401).json({ error: 'Unauthorized user token' });
        }
      }

      let videoRecord: any = null;
      let seriesRecord: any = null;
      let scenes: any[] = [];

      if (isSupabaseMode && supabaseAdmin) {
        const { data: videoData, error: videoErr } = await supabaseAdmin
          .from('videos')
          .select('*, series(*)')
          .eq('id', video_id)
          .maybeSingle();

        if (videoErr || !videoData) {
          return res.status(404).json({ error: 'Video not found' });
        }

        if (videoData.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden: You do not own this video' });
        }

        videoRecord = videoData;
        seriesRecord = videoData.series || null;

        await supabaseAdmin
          .from('videos')
          .update({ status: 'generating', progress: 55 })
          .eq('id', video_id);

        const { data: scenesData } = await supabaseAdmin
          .from('video_scenes')
          .select('*')
          .eq('video_id', video_id)
          .order('scene_order', { ascending: true });

        scenes = scenesData || [];
      } else {
        scenes = [
          { id: 'scene-1', video_id, scene_order: 1, visual_prompt: 'A Porsche 911 on a mountain pass at sunset' },
          { id: 'scene-2', video_id, scene_order: 2, visual_prompt: 'Engine detail shot with gleaming chrome' },
        ];
      }

      const updatedScenes: any[] = [];
      const totalScenes = scenes.length || 1;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        // Requirement 23: Do not regenerate if visual is already ready and present
        if (scene.visual_status === 'ready' && scene.visual_url) {
          updatedScenes.push(scene);
          continue;
        }

        try {
          if (isSupabaseMode && supabaseAdmin) {
            await supabaseAdmin
              .from('video_scenes')
              .update({ visual_status: 'generating', visual_error: null })
              .eq('id', scene.id);
          }

          const processed = await processSceneVisual({
            sceneRecord: scene,
            seriesRecord,
            videoRecord,
            supabaseAdmin,
            userId,
            videoId: video_id,
          });

          updatedScenes.push(processed);

          if (isSupabaseMode && supabaseAdmin) {
            const stepProgress = Math.round(50 + ((i + 1) / totalScenes) * 35);
            await supabaseAdmin
              .from('videos')
              .update({ progress: stepProgress })
              .eq('id', video_id);
          }
        } catch (sceneErr: any) {
          console.error(`Error processing visual for scene ${scene.id}:`, sceneErr);
          updatedScenes.push({ ...scene, visual_status: 'failed', visual_error: sceneErr.message });
        }
      }

      const firstReady = updatedScenes.find((s) => s.visual_url && s.visual_status === 'ready');
      if (isSupabaseMode && supabaseAdmin) {
        if (firstReady?.visual_url && (!videoRecord?.thumbnail_url || videoRecord.thumbnail_url.includes('unsplash'))) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: firstReady.visual_url })
            .eq('id', video_id);
        }

        await supabaseAdmin
          .from('videos')
          .update({ progress: 85, status: 'draft' })
          .eq('id', video_id);
      }

      return res.status(200).json({
        success: true,
        video_id,
        scenes: updatedScenes,
      });

    } catch (err: any) {
      console.error('Error in /api/generate-video-visuals:', err);

      if (req.body?.video_id) {
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
          if (supabaseUrl && supabaseServiceKey) {
            const admin = createClient(supabaseUrl, supabaseServiceKey);
            await admin
              .from('videos')
              .update({ status: 'draft' })
              .eq('id', req.body.video_id);
          }
        } catch (_) {}
      }

      return res.status(500).json({ error: err.message || 'Falha ao gerar imagens do vídeo.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/retry-missing-visuals
  // =========================================================
  app.post('/api/retry-missing-visuals', async (req, res) => {
    const { video_id } = req.body || {};

    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    try {
      const authHeader = req.headers.authorization || '';
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
        } else {
          return res.status(401).json({ error: 'Unauthorized user token' });
        }
      }

      let videoRecord: any = null;
      let seriesRecord: any = null;
      let scenes: any[] = [];

      if (isSupabaseMode && supabaseAdmin) {
        const { data: videoData } = await supabaseAdmin
          .from('videos')
          .select('*, series(*)')
          .eq('id', video_id)
          .maybeSingle();

        videoRecord = videoData;
        seriesRecord = videoData?.series || null;

        const { data: scenesData } = await supabaseAdmin
          .from('video_scenes')
          .select('*')
          .eq('video_id', video_id)
          .order('scene_order', { ascending: true });

        scenes = scenesData || [];
      }

      const updatedScenes: any[] = [];
      for (const scene of scenes) {
        // Requirement 24: Only retry failed / needs_fallback / needs_upload / pending scenes
        if (scene.visual_status === 'ready' && scene.visual_url) {
          updatedScenes.push(scene);
          continue;
        }

        const processed = await processSceneVisual({
          sceneRecord: scene,
          seriesRecord,
          videoRecord,
          supabaseAdmin,
          userId,
          videoId: video_id,
        });
        updatedScenes.push(processed);
      }

      return res.status(200).json({
        success: true,
        scenes: updatedScenes,
      });
    } catch (err: any) {
      console.error('Error in /api/retry-missing-visuals:', err);
      return res.status(500).json({ error: err.message || 'Retry missing visuals failed.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/stock-search
  // =========================================================
  app.post('/api/stock-search', async (req, res) => {
    try {
      const { query, scene_id, niche } = req.body || {};
      let searchTerms = query || '';

      if (!searchTerms && scene_id) {
        searchTerms = buildStockSearchQuery({ visual_prompt: query }, { niche });
      }

      const assets = await searchStockImages(searchTerms || 'cinematic portrait', 12);
      return res.status(200).json({
        success: true,
        query: searchTerms,
        assets,
      });
    } catch (err: any) {
      console.error('Error in /api/stock-search:', err);
      return res.status(500).json({ error: err.message || 'Stock search failed.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/update-scene-visual
  // =========================================================
  app.post('/api/update-scene-visual', async (req, res) => {
    try {
      const {
        scene_id,
        video_id,
        visual_url,
        visual_source_used = 'upload',
        stock_provider,
        stock_asset_id,
        stock_attribution,
      } = req.body || {};

      if (!scene_id || !visual_url) {
        return res.status(400).json({ error: 'scene_id and visual_url are required' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

      if (isValidSupabaseUrl(supabaseUrl) && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: sceneData } = await supabaseAdmin
          .from('video_scenes')
          .select('*')
          .eq('id', scene_id)
          .maybeSingle();

        const { data: updatedScene, error: updateErr } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url,
            visual_status: 'ready',
            visual_source_used,
            stock_provider: stock_provider || null,
            stock_asset_id: stock_asset_id || null,
            stock_attribution: stock_attribution || null,
            visual_error: null,
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', scene_id)
          .select('*')
          .single();

        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        if (video_id && (sceneData?.scene_order === 1 || sceneData?.scene_order === 0)) {
          await supabaseAdmin
            .from('videos')
            .update({ thumbnail_url: visual_url })
            .eq('id', video_id);
        }

        return res.status(200).json({
          success: true,
          scene: updatedScene,
        });
      }

      return res.status(200).json({
        success: true,
        scene: {
          id: scene_id,
          visual_url,
          visual_status: 'ready',
          visual_source_used,
        },
      });
    } catch (err: any) {
      console.error('Error in /api/update-scene-visual:', err);
      return res.status(500).json({ error: err.message || 'Update scene visual failed.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/generate-captions
  // =========================================================
  app.post('/api/generate-captions', async (req, res) => {
    const { video_id } = req.body || {};

    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    try {
      const authHeader = req.headers.authorization || '';
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
          return res.status(401).json({ error: 'Unauthorized user token' });
        }
      }

      if (!supabaseAdmin) {
        return res.status(400).json({ error: 'Supabase configuration required.' });
      }

      const captions = await generateAndSaveVideoCaptions(video_id, userId, supabaseAdmin);

      return res.status(200).json({
        success: true,
        video_id,
        captions,
        count: captions.length,
      });

    } catch (err: any) {
      console.error('Error in /api/generate-captions:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate captions.' });
    }
  });

  // =========================================================
  // ENDPOINT: POST /api/render-video
  // =========================================================
  app.post('/api/render-video', async (req, res) => {
    const { video_id } = req.body || {};

    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    try {
      const authHeader = req.headers.authorization || '';
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
        } else {
          return res.status(401).json({ error: 'Unauthorized user token' });
        }
      }

      if (!isSupabaseMode || !supabaseAdmin) {
        return res.status(400).json({ error: 'Supabase must be configured to render videos.' });
      }

      // Check video ownership
      const { data: video, error: videoErr } = await supabaseAdmin
        .from('videos')
        .select('*, series(*)')
        .eq('id', video_id)
        .maybeSingle();

      if (videoErr || !video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this video' });
      }

      // Check lock: If already rendering
      if (video.render_status === 'processing') {
        return res.status(409).json({ error: 'Video is already rendering.' });
      }

      // Check if narration exists
      if (!video.narration_url) {
        return res.status(400).json({ error: 'Video narration audio is missing. Please generate narration first.' });
      }

      // Check scenes
      const { data: scenes } = await supabaseAdmin
        .from('video_scenes')
        .select('*')
        .eq('video_id', video_id);

      if (!scenes || scenes.length === 0) {
        return res.status(400).json({ error: 'No scenes found for video.' });
      }

      const missingVisuals = scenes.filter((s: any) => !s.visual_url && !s.visual_storage_path);
      if (missingVisuals.length > 0) {
        return res.status(400).json({ error: `Some scene visuals are not ready. (${missingVisuals.length} missing)` });
      }

      // Mark as processing
      await supabaseAdmin
        .from('videos')
        .update({
          render_status: 'processing',
          render_progress: 5,
          render_error: null,
        })
        .eq('id', video_id);

      // Trigger render pipeline in background
      renderVideoPipeline(video_id, userId, supabaseAdmin).catch((err) => {
        console.error('Background render pipeline error:', err);
      });

      return res.status(200).json({
        success: true,
        message: 'Video rendering started.',
        video_id,
        render_status: 'processing',
        render_progress: 5,
      });

    } catch (err: any) {
      console.error('Error in /api/render-video:', err);
      return res.status(500).json({ error: err.message || 'Failed to start video rendering.' });
    }
  });

  // =========================================================
  // ENDPOINT: GET /api/video-status/:id
  // =========================================================
  app.get('/api/video-status/:id', async (req, res) => {
    const videoId = req.params.id;

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

      if (!isValidSupabaseUrl(supabaseUrl) || !supabaseServiceKey) {
        return res.status(400).json({ error: 'Supabase not configured.' });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .select('id, status, progress, render_status, render_progress, render_error, video_url, narration_url, rendered_at')
        .eq('id', videoId)
        .maybeSingle();

      if (error || !video) {
        return res.status(404).json({ error: 'Video not found.' });
      }

      return res.status(200).json({
        success: true,
        video,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch status.' });
    }
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Klyvora server running on port ${PORT}`);
  });
}

startServer();
