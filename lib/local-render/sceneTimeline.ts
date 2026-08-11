import { VideoCaptionRecord } from '../../services/videoService';

export function estimateWordTimings(
  script: string,
  totalDuration: number
): Array<{ id: string; text: string; start_time: number; end_time: number }> {
  if (!script || !script.trim() || totalDuration <= 0) return [];

  const cleanText = script.replace(/\r?\n+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Group into chunks of 3 to 4 words
  const chunks: string[] = [];
  const chunkSize = 4;
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }

  // Weight chunks by character length for better proportioning
  const totalChars = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  let currentTime = 0;

  return chunks.map((chunk, idx) => {
    const ratio = totalChars > 0 ? chunk.length / totalChars : 1 / chunks.length;
    const chunkDuration = ratio * totalDuration;
    const start_time = Number(currentTime.toFixed(2));
    const end_time = Number((currentTime + chunkDuration).toFixed(2));
    currentTime += chunkDuration;

    return {
      id: `fallback-cap-${idx}`,
      text: chunk,
      start_time,
      end_time,
    };
  });
}

export function getCurrentCaption(
  captions: Array<{ start_time: number; end_time: number; text: string }>,
  currentTime: number
): { start_time: number; end_time: number; text: string } | null {
  if (!captions || captions.length === 0) return null;
  return captions.find((c) => currentTime >= c.start_time && currentTime < c.end_time) || null;
}
