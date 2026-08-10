import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

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

      if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
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

      const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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
          if (supabaseUrl && supabaseServiceKey) {
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

  // Helper to attach standard WAV header to raw PCM data
  function convertPcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
    if (pcmBuffer.length >= 12 && pcmBuffer.toString('utf8', 0, 4) === 'RIFF') {
      return pcmBuffer;
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);

    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
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
      const isSupabaseMode = Boolean(supabaseUrl && supabaseServiceKey);

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
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
  // GEMINI IMAGE GENERATION HELPERS
  // =========================================================
  async function generateGeminiSceneImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ['gemini-3.1-flash-image', 'imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Gemini Image] Attempting image generation with model: ${model}`);
        const response = await ai.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '9:16',
          },
        });

        if (response && response.generatedImages && response.generatedImages.length > 0) {
          const genImg = response.generatedImages[0];
          const base64Data = genImg.image?.imageBytes || (genImg.image as any)?.bytesBase64Encoded;
          if (base64Data) {
            return { base64: base64Data, mimeType: 'image/png' };
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini Image] Model ${model} failed:`, err?.message || err);
        lastError = err;
      }
    }

    // Fallback: generateContent with inline image
    try {
      console.log('[Gemini Image] Trying generateContent fallback with gemini-3.1-flash-image...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: prompt,
        config: {
          responseMimeType: 'image/png',
        } as any,
      });
      const candidates = response.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return {
              base64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[Gemini Image] generateContent fallback failed:', err?.message || err);
    }

    throw new Error(`Gemini Image API Error: ${lastError?.message || 'No image data returned.'}`);
  }

  function buildEnrichedVisualPrompt(scenePrompt: string | null, seriesRecord: any): string {
    const basePrompt = scenePrompt || 'A dramatic scene for a vertical video story';
    const visualStyle = (seriesRecord?.visual_style || '').toLowerCase();
    const niche = seriesRecord?.niche || '';
    const description = seriesRecord?.description || '';

    let styleInstruction = 'clean realistic photography, natural lighting, 9:16 vertical composition';
    if (visualStyle.includes('cinematic')) {
      styleInstruction = 'cinematic photography, realistic lighting, natural depth of field, professional documentary composition';
    } else if (visualStyle.includes('realist') || visualStyle.includes('realistic')) {
      styleInstruction = 'hyper-realistic photography, high detail, natural color balance, crisp focus';
    } else if (visualStyle.includes('documentary') || visualStyle.includes('documentário')) {
      styleInstruction = 'documentary style, authentic atmosphere, natural lighting, candid shot';
    } else if (visualStyle.includes('vintage') || visualStyle.includes('retro')) {
      styleInstruction = 'vintage film look, subtle grain, warm nostalgic tones, retro photography';
    } else if (visualStyle.includes('dark') || visualStyle.includes('sombrio')) {
      styleInstruction = 'moody dark aesthetic, dramatic contrast, deep shadows, atmospheric lighting';
    } else if (visualStyle.includes('modern') || visualStyle.includes('moderno')) {
      styleInstruction = 'modern sleek visual style, vibrant clean colors, minimalist vertical framing';
    }

    let automotiveInstruction = '';
    const lowerPrompt = basePrompt.toLowerCase();
    if (
      lowerPrompt.includes('car') ||
      lowerPrompt.includes('carro') ||
      lowerPrompt.includes('automobile') ||
      lowerPrompt.includes('porsche') ||
      lowerPrompt.includes('ferrari') ||
      lowerPrompt.includes('ford') ||
      lowerPrompt.includes('bmw') ||
      lowerPrompt.includes('mercedes') ||
      lowerPrompt.includes('motor') ||
      lowerPrompt.includes('engine')
    ) {
      automotiveInstruction = ' For automotive elements: maintain era-accurate historically plausible vehicle features, no misplaced modern body kits, no modern license plates unless specified.';
    }

    const negativeInstruction = 'No text, No subtitles, No captions, No logos, No watermarks, No UI elements. Keep primary subject away from extreme bottom edge to leave room for captions. Vertical 9:16 portrait composition.';

    return `${basePrompt}. Style: ${styleInstruction}.${automotiveInstruction} Context: ${niche} ${description}. ${negativeInstruction}`;
  }

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

      if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
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

      const finalPrompt = buildEnrichedVisualPrompt(sceneRecord.visual_prompt, seriesRecord);
      const { base64: imageBase64, mimeType } = await generateGeminiSceneImage(finalPrompt);

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      let visualUrl = `data:${mimeType};base64,${imageBase64}`;
      let storagePath = null;

      if (isSupabaseMode && supabaseAdmin) {
        storagePath = `${userId}/videos/${video_id}/scenes/${scene_id}.png`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('media')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from('media')
            .getPublicUrl(storagePath);

          if (urlData?.publicUrl) {
            visualUrl = urlData.publicUrl;
          }
        } else {
          console.warn('Supabase storage scene upload warning:', uploadErr.message);
        }

        const { data: updatedScene, error: updateErr } = await supabaseAdmin
          .from('video_scenes')
          .update({
            visual_url: visualUrl,
            visual_storage_path: storagePath,
            visual_status: 'ready',
            visual_error: null,
            visual_generated_at: new Date().toISOString(),
          })
          .eq('id', scene_id)
          .select('*')
          .single();

        if (updateErr) {
          console.warn('Error updating video_scenes table:', updateErr);
        } else {
          sceneRecord = updatedScene;
        }

        if (videoRecord && (!videoRecord.thumbnail_url || videoRecord.thumbnail_url.includes('unsplash'))) {
          if (sceneRecord.scene_order === 1 || sceneRecord.scene_order === 0) {
            await supabaseAdmin
              .from('videos')
              .update({ thumbnail_url: visualUrl })
              .eq('id', video_id);
          }
        }
      } else {
        sceneRecord = {
          ...sceneRecord,
          visual_url: visualUrl,
          visual_status: 'ready',
          visual_generated_at: new Date().toISOString(),
        };
      }

      return res.status(200).json({
        success: true,
        scene: sceneRecord,
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

      return res.status(500).json({ error: err.message || 'Falha ao gerar imagem da cena com Gemini.' });
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

      if (supabaseUrl && supabaseAnonKey && token && token !== 'guest-token') {
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
        try {
          if (isSupabaseMode && supabaseAdmin) {
            await supabaseAdmin
              .from('video_scenes')
              .update({ visual_status: 'generating', visual_error: null })
              .eq('id', scene.id);
          }

          const prompt = buildEnrichedVisualPrompt(scene.visual_prompt, seriesRecord);
          const { base64: imageBase64, mimeType } = await generateGeminiSceneImage(prompt);

          const imageBuffer = Buffer.from(imageBase64, 'base64');
          let visualUrl = `data:${mimeType};base64,${imageBase64}`;
          let storagePath = null;

          if (isSupabaseMode && supabaseAdmin) {
            storagePath = `${userId}/videos/${video_id}/scenes/${scene.id}.png`;

            const { error: uploadErr } = await supabaseAdmin.storage
              .from('media')
              .upload(storagePath, imageBuffer, {
                contentType: 'image/png',
                upsert: true,
              });

            if (!uploadErr) {
              const { data: urlData } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(storagePath);
              if (urlData?.publicUrl) {
                visualUrl = urlData.publicUrl;
              }
            }

            const { data: savedScene } = await supabaseAdmin
              .from('video_scenes')
              .update({
                visual_url: visualUrl,
                visual_storage_path: storagePath,
                visual_status: 'ready',
                visual_error: null,
                visual_generated_at: new Date().toISOString(),
              })
              .eq('id', scene.id)
              .select('*')
              .single();

            updatedScenes.push(savedScene || { ...scene, visual_url: visualUrl, visual_status: 'ready' });

            const stepProgress = Math.round(50 + ((i + 1) / totalScenes) * 35);
            await supabaseAdmin
              .from('videos')
              .update({ progress: stepProgress })
              .eq('id', video_id);

          } else {
            updatedScenes.push({
              ...scene,
              visual_url: visualUrl,
              visual_status: 'ready',
              visual_generated_at: new Date().toISOString(),
            });
          }
        } catch (sceneErr: any) {
          console.error(`Error generating visual for scene ${scene.id}:`, sceneErr);
          if (isSupabaseMode && supabaseAdmin) {
            await supabaseAdmin
              .from('video_scenes')
              .update({
                visual_status: 'failed',
                visual_error: sceneErr.message || 'Image generation failed',
              })
              .eq('id', scene.id);
          }
          updatedScenes.push({
            ...scene,
            visual_status: 'failed',
            visual_error: sceneErr.message || 'Image generation failed',
          });
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
