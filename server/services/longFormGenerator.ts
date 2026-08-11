import { GoogleGenAI, Type } from '@google/genai';
import { sanitizeModelName } from './apiHelpers';

export interface LongFormGeneratorParams {
  videoId: string;
  userId: string;
  seriesRecord: any;
  videoRecord: any;
  topic?: string;
  autoTopic?: boolean;
  targetDurationSec: number;
  supabaseAdmin: any;
  ai: GoogleGenAI;
}

export interface ChapterOutlineItem {
  chapter_order: number;
  title: string;
  description: string;
  target_duration: number;
}

export async function generateLongFormScriptAndChapters(
  params: LongFormGeneratorParams
): Promise<{
  topic: string;
  title: string;
  script: string;
  youtube_title: string;
  youtube_description: string;
  youtube_tags: string;
  chapters: any[];
  scenes: any[];
}> {
  const {
    videoId,
    userId,
    seriesRecord,
    videoRecord,
    topic: clientTopic,
    autoTopic,
    targetDurationSec,
    supabaseAdmin,
    ai,
  } = params;

  const seriesName = seriesRecord?.name || 'YouTube Series';
  const niche = seriesRecord?.niche || 'General';
  const description = seriesRecord?.description || '';
  const language = seriesRecord?.language || 'English';
  const contentStyle = seriesRecord?.content_style || 'Documentary';
  const visualStyle = seriesRecord?.visual_style || 'Cinematic';

  const rawModel = process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL;
  const modelName = sanitizeModelName(rawModel, 'gemini-3.6-flash');

  let specifiedTopic = videoRecord?.topic || clientTopic || '';

  // ---------------------------------------------------------
  // STEP 1: OUTLINE GENERATION
  // ---------------------------------------------------------
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('videos')
      .update({ progress: 15, current_step: 'Gerando estrutura de capítulos (Outline)...' })
      .eq('id', videoId);
  }

  // Determine approx chapter count based on duration
  // 5 min (300s): 3-5 chapters
  // 10 min (600s): 5-7 chapters
  // 15 min (900s): 6-9 chapters
  // 20 min (1200s): 8-12 chapters
  let minChapters = 3;
  let maxChapters = 5;
  if (targetDurationSec >= 1200) {
    minChapters = 8;
    maxChapters = 12;
  } else if (targetDurationSec >= 900) {
    minChapters = 6;
    maxChapters = 9;
  } else if (targetDurationSec >= 600) {
    minChapters = 5;
    maxChapters = 7;
  }

  const outlinePrompt = `You are an expert YouTube documentary producer creating long-form content.

SERIES METADATA:
- Series Name: ${seriesName}
- Niche: ${niche}
- Description: ${description}
- Language: ${language}
- Target Total Duration: ${targetDurationSec} seconds (~${Math.round(targetDurationSec / 60)} minutes)
- Content Style: ${contentStyle}

TOPIC DIRECTIVE:
${autoTopic || !specifiedTopic.trim() ? 'Propose an engaging, highly compelling YouTube documentary topic.' : `Topic: "${specifiedTopic}"`}

TASK:
1. Define a main video topic and main video title in ${language}.
2. Create an OUTLINE consisting of between ${minChapters} and ${maxChapters} distinct chapters (including Introduction and Conclusion).
3. Assign a target_duration in seconds to each chapter so that the SUM of all chapter target_durations is close to ${targetDurationSec} seconds.

Return JSON adhering strictly to the schema.`;

  const outlineResponse = await ai.models.generateContent({
    model: modelName,
    contents: outlinePrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          title: { type: Type.STRING },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chapter_order: { type: Type.INTEGER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                target_duration: { type: Type.NUMBER },
              },
              required: ['chapter_order', 'title', 'description', 'target_duration'],
            },
          },
        },
        required: ['topic', 'title', 'chapters'],
      },
    },
  });

  const parsedOutline = JSON.parse(outlineResponse.text || '{}');
  const finalTopic = parsedOutline.topic || specifiedTopic || 'YouTube Documentary';
  const finalTitle = parsedOutline.title || 'YouTube Long Form Video';
  const outlineChapters: ChapterOutlineItem[] = parsedOutline.chapters || [];

  if (outlineChapters.length === 0) {
    throw new Error('Failed to generate chapter outline.');
  }

  // Save chapters structure in database if in Supabase mode
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('video_chapters')
      .delete()
      .eq('video_id', videoId);

    const initialChapterRows = outlineChapters.map((ch) => ({
      video_id: videoId,
      user_id: userId,
      chapter_order: ch.chapter_order,
      title: ch.title,
      description: ch.description,
      target_duration: ch.target_duration,
      status: 'pending',
    }));

    await supabaseAdmin.from('video_chapters').insert(initialChapterRows);
  }

  // ---------------------------------------------------------
  // STEP 2: SCRIPT GENERATION PER CHAPTER
  // ---------------------------------------------------------
  const generatedChapters: any[] = [];
  let fullScriptParts: string[] = [];
  const fullOutlineText = outlineChapters.map((c) => `Chapter ${c.chapter_order}: ${c.title} (${c.target_duration}s) - ${c.description}`).join('\n');

  for (let i = 0; i < outlineChapters.length; i++) {
    const ch = outlineChapters[i];
    const progressPct = 20 + Math.round(((i + 1) / outlineChapters.length) * 35);

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('videos')
        .update({
          progress: progressPct,
          current_step: `Escrevendo capítulo ${i + 1}/${outlineChapters.length}: ${ch.title}...`,
        })
        .eq('id', videoId);
    }

    // Word count target: ~130-150 words per minute
    const targetWords = Math.round((ch.target_duration / 60) * 140);
    const prevScriptsCombined = fullScriptParts.join('\n\n');

    const chapterPrompt = `You are writing Chapter ${ch.chapter_order} of a long-form YouTube documentary script.

DOCUMENTARY CONTEXT:
- Overall Video Title: "${finalTitle}"
- Topic: "${finalTopic}"
- Niche: ${niche}
- Language: ${language}
- Content Style: ${contentStyle}

FULL OUTLINE:
${fullOutlineText}

CURRENT CHAPTER:
- Order: ${ch.chapter_order} of ${outlineChapters.length}
- Chapter Title: "${ch.title}"
- Chapter Summary: "${ch.description}"
- Target Duration: ${ch.target_duration} seconds (~${targetWords} words)

PREVIOUS CHAPTERS SCRIPT (FOR CONTINUITY & AVOIDING REPETITION):
${prevScriptsCombined ? prevScriptsCombined : '(This is Chapter 1 - start with a powerful, gripping 15-30 second hook!)'}

CRITICAL INSTRUCTIONS:
- Write narration text ONLY in language "${language}".
- DO NOT use meta-phrases like "Welcome back", "In this chapter", "Next section", "As I said earlier".
- Make it sound like ONE smooth, uninterrupted, professional documentary.
- Word count MUST be approximately ${targetWords} words (between ${Math.round(targetWords * 0.85)} and ${Math.round(targetWords * 1.15)} words).
- If this is Chapter 1: Include a powerful hook, promise, and curiosity gap in the first 30 seconds.
- If this is the Final Chapter: Include a natural conclusion and a soft YouTube call to action (like & subscribe).
- Strictly NO speaker tags ("Narrator:"), NO formatting markers, NO camera instructions. Just read-ready narration text.`;

    const chapterScriptResponse = await ai.models.generateContent({
      model: modelName,
      contents: chapterPrompt,
    });

    const chapterScriptText = (chapterScriptResponse.text || '').trim();
    fullScriptParts.push(chapterScriptText);

    // Save chapter script to DB
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('video_chapters')
        .update({
          script: chapterScriptText,
          status: 'ready',
        })
        .eq('video_id', videoId)
        .eq('chapter_order', ch.chapter_order);
    }

    generatedChapters.push({
      ...ch,
      script: chapterScriptText,
    });
  }

  const combinedScript = fullScriptParts.join('\n\n');

  // ---------------------------------------------------------
  // STEP 3: SCENES GENERATION PER CHAPTER
  // ---------------------------------------------------------
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('videos')
      .update({ progress: 60, current_step: 'Dividindo capítulos em cenas visuais...' })
      .eq('id', videoId);

    // Fetch saved chapters with IDs
    const { data: dbChapters } = await supabaseAdmin
      .from('video_chapters')
      .select('*')
      .eq('video_id', videoId)
      .order('chapter_order', { ascending: true });

    if (dbChapters) {
      for (let idx = 0; idx < dbChapters.length; idx++) {
        const dbCh = dbChapters[idx];
        generatedChapters[idx].id = dbCh.id;
      }
    }
  }

  const allScenes: any[] = [];
  let globalSceneOrder = 1;

  for (let idx = 0; idx < generatedChapters.length; idx++) {
    const ch = generatedChapters[idx];

    const scenePrompt = `Break this documentary chapter script into visual scenes.

CHAPTER:
- Title: "${ch.title}"
- Script: "${ch.script}"
- Target Chapter Duration: ${ch.target_duration} seconds
- Visual Style: ${visualStyle}

RULES:
- Long Form pacing: visual change approximately every 5 to 10 seconds (scene duration 5.0 to 10.0 seconds).
- "text": The exact narration substring for this scene.
- "visual_prompt": Detailed English description of stock/AI footage in ${visualStyle} style.
- "is_key_visual": boolean. Set to true ONLY for opening scenes, key historical figures/vehicles, or major climax moments.
- "duration": number between 5.0 and 10.0 seconds.

Return JSON schema.`;

    const scenesResponse = await ai.models.generateContent({
      model: modelName,
      contents: scenePrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING },
                  is_key_visual: { type: Type.BOOLEAN },
                  duration: { type: Type.NUMBER },
                },
                required: ['text', 'visual_prompt', 'is_key_visual', 'duration'],
              },
            },
          },
          required: ['scenes'],
        },
      },
    });

    const parsedScenes = JSON.parse(scenesResponse.text || '{}');
    const chScenes = parsedScenes.scenes || [];

    for (const sc of chScenes) {
      allScenes.push({
        chapter_id: ch.id,
        scene_order: globalSceneOrder++,
        text: sc.text,
        visual_prompt: sc.visual_prompt,
        is_key_visual: Boolean(sc.is_key_visual),
        duration: sc.duration || 6,
      });
    }
  }

  // ---------------------------------------------------------
  // STEP 4: YOUTUBE METADATA GENERATION
  // ---------------------------------------------------------
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('videos')
      .update({ progress: 80, current_step: 'Gerando título, descrição e tags para YouTube...' })
      .eq('id', videoId);
  }

  const metaPrompt = `Create YouTube SEO metadata for this video in ${language}.

Topic: ${finalTopic}
Title Idea: ${finalTitle}
Script Summary: ${combinedScript.slice(0, 1000)}

Output JSON:
- "youtube_title": High-CTR, catchy YouTube video title (under 70 chars).
- "youtube_description": Engaging YouTube description with key summary, timestamps placeholder, CTA, and hashtags.
- "youtube_tags": Comma-separated list of 15 relevant SEO tags.`;

  const metaResponse = await ai.models.generateContent({
    model: modelName,
    contents: metaPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          youtube_title: { type: Type.STRING },
          youtube_description: { type: Type.STRING },
          youtube_tags: { type: Type.STRING },
        },
        required: ['youtube_title', 'youtube_description', 'youtube_tags'],
      },
    },
  });

  const parsedMeta = JSON.parse(metaResponse.text || '{}');

  const totalCalculatedDur = Math.round(allScenes.reduce((sum, s) => sum + (s.duration || 6), 0)) || targetDurationSec;

  // Save scenes and video metadata to Supabase
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('video_scenes')
      .delete()
      .eq('video_id', videoId);

    const sceneRows = allScenes.map((s) => ({
      video_id: videoId,
      user_id: userId,
      chapter_id: s.chapter_id,
      scene_order: s.scene_order,
      text: s.text,
      visual_prompt: s.visual_prompt,
      is_key_visual: s.is_key_visual,
      duration: s.duration,
    }));

    await supabaseAdmin.from('video_scenes').insert(sceneRows);

    await supabaseAdmin
      .from('videos')
      .update({
        topic: finalTopic,
        title: finalTitle,
        script: combinedScript,
        duration: totalCalculatedDur,
        video_format: 'long_form',
        aspect_ratio: '16:9',
        target_duration: targetDurationSec,
        youtube_title: parsedMeta.youtube_title || finalTitle,
        youtube_description: parsedMeta.youtube_description || '',
        youtube_tags: parsedMeta.youtube_tags || '',
        long_form_status: 'script_ready',
        status: 'draft',
        progress: 100,
        current_step: 'Roteiro e capítulos gerados com sucesso!',
      })
      .eq('id', videoId);
  }

  return {
    topic: finalTopic,
    title: finalTitle,
    script: combinedScript,
    youtube_title: parsedMeta.youtube_title || finalTitle,
    youtube_description: parsedMeta.youtube_description || '',
    youtube_tags: parsedMeta.youtube_tags || '',
    chapters: generatedChapters,
    scenes: allScenes,
  };
}
