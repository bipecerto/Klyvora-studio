import { synthesizeFreeTts, voicePreviewText } from './freeTts';

export interface NarrationInput {
  text: string;
  voice?: string;
  language?: string;
  style?: string;
}

export interface NarrationResult {
  audioBuffer: Buffer;
  mimeType: string;
  durationSec: number;
}

/**
 * Synthesizes narration audio for a video script.
 */
export async function synthesizeNarration(input: NarrationInput): Promise<NarrationResult> {
  const { text, language = 'Português do Brasil' } = input;
  if (!text || typeof text !== 'string') {
    throw new Error('Roteiro ausente para geração de narração.');
  }

  const audioBuffer = await synthesizeFreeTts(text, language);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.max(5, Math.round(wordCount / 2.5));

  return {
    audioBuffer,
    mimeType: 'audio/mpeg',
    durationSec: estimatedDuration,
  };
}

export { voicePreviewText };
