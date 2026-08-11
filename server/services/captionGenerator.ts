import { createClient } from '@supabase/supabase-js';

export interface CaptionRecord {
  id?: string;
  video_id: string;
  user_id: string;
  caption_order: number;
  start_time: number;
  end_time: number;
  text: string;
}

/**
 * Splits scene narration text into short, natural caption groups (2 to 5 words).
 */
export function splitTextIntoCaptionChunks(text: string): string[] {
  if (!text || !text.trim()) return [];

  const cleanText = text.trim().replace(/\s+/g, ' ');
  // Split on clause punctuation while retaining natural pauses
  const clauses = cleanText.split(/(?<=[.,!?;:-])\s+/);
  const chunks: string[] = [];

  for (const clause of clauses) {
    const words = clause.split(' ').filter(Boolean);
    if (words.length === 0) continue;

    if (words.length <= 5) {
      chunks.push(words.join(' '));
    } else {
      let i = 0;
      while (i < words.length) {
        let chunkSize = 4;
        const remaining = words.length - i;
        if (remaining === 5) chunkSize = 5;
        else if (remaining === 6) chunkSize = 3;
        else if (remaining <= 4) chunkSize = remaining;

        chunks.push(words.slice(i, i + chunkSize).join(' '));
        i += chunkSize;
      }
    }
  }

  return chunks;
}

/**
 * Generates and saves caption records for a video based on scenes and total narration duration.
 */
export async function generateAndSaveVideoCaptions(
  videoId: string,
  userId: string,
  supabaseAdmin: any,
  actualNarrationDuration?: number
): Promise<CaptionRecord[]> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client required for generating captions.');
  }

  // 1. Fetch video record
  const { data: video, error: videoErr } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (videoErr || !video) {
    throw new Error(`Video not found: ${videoErr?.message || videoId}`);
  }

  // 2. Fetch video scenes
  const { data: scenes, error: scenesErr } = await supabaseAdmin
    .from('video_scenes')
    .select('*')
    .eq('video_id', videoId)
    .order('scene_order', { ascending: true });

  if (scenesErr || !scenes || scenes.length === 0) {
    throw new Error('No video scenes found to generate captions.');
  }

  // 3. Determine real narration duration
  let narrationDuration = actualNarrationDuration || Number(video.narration_duration) || 0;
  if (!narrationDuration || narrationDuration <= 0) {
    // Fallback: estimate from script word count
    const wordCount = (video.script || '').split(/\s+/).filter(Boolean).length;
    narrationDuration = Math.max(5, Math.round(wordCount / 2.5)) || Number(video.duration) || 60;
  }

  // 4. Calculate total estimated scenes duration and scale factor
  const totalSceneEstimate = scenes.reduce((sum: number, s: any) => sum + (Number(s.duration) || 4), 0);
  const scaleFactor = totalSceneEstimate > 0 ? narrationDuration / totalSceneEstimate : 1;

  const generatedCaptions: CaptionRecord[] = [];
  let currentTime = 0;
  let captionOrder = 1;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const rawSceneDuration = Number(scene.duration) || 4;
    // Normalized scene duration matching exact narration timeline
    const normalizedSceneDuration = rawSceneDuration * scaleFactor;
    const sceneStartTime = currentTime;
    const sceneEndTime = currentTime + normalizedSceneDuration;

    const sceneText = scene.text || '';
    const chunks = splitTextIntoCaptionChunks(sceneText);

    if (chunks.length === 0) {
      currentTime = sceneEndTime;
      continue;
    }

    // Distribute time proportionally by character weight
    const totalChars = chunks.reduce((acc, c) => acc + c.length, 0) || 1;
    let chunkStartTime = sceneStartTime;

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunkText = chunks[cIdx];
      let chunkDuration = (chunkText.length / totalChars) * normalizedSceneDuration;

      // Ensure last chunk ends exactly at sceneEndTime
      let chunkEndTime = cIdx === chunks.length - 1 ? sceneEndTime : chunkStartTime + chunkDuration;

      // Ensure minimum reading duration of ~0.6s
      if (chunkEndTime - chunkStartTime < 0.6 && cIdx < chunks.length - 1) {
        chunkEndTime = chunkStartTime + 0.6;
      }

      // Format times to 2 decimal places
      const startTimeFormatted = Math.round(chunkStartTime * 100) / 100;
      const endTimeFormatted = Math.round(chunkEndTime * 100) / 100;

      generatedCaptions.push({
        video_id: videoId,
        user_id: userId,
        caption_order: captionOrder++,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        text: chunkText,
      });

      chunkStartTime = chunkEndTime;
    }

    currentTime = sceneEndTime;
  }

  // 5. Save captions to database (Delete existing first)
  await supabaseAdmin
    .from('video_captions')
    .delete()
    .eq('video_id', videoId);

  if (generatedCaptions.length > 0) {
    const { error: insertErr } = await supabaseAdmin
      .from('video_captions')
      .insert(generatedCaptions);

    if (insertErr) {
      console.error('Error inserting video_captions:', insertErr);
    }
  }

  return generatedCaptions;
}
