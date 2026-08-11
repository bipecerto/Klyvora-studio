/**
 * Server-side helper utilities for Klyvora Studio
 */

/**
 * Attaches standard 44-byte WAV header to raw PCM audio buffer.
 */
export function convertPcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
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

/**
 * Validates whether a Supabase URL string is configured correctly.
 */
export function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !trimmed.includes('placeholder.supabase.co');
}

/**
 * Sanitizes model name string to ensure it is a valid Gemini/Imagen/Cloudflare model identifier.
 * Prevents API keys (AIza...) or environment variable names from being passed as model names.
 */
export function sanitizeModelName(val: string | undefined, defaultModel = 'gemini-3.6-flash'): string {
  if (!val || typeof val !== 'string') return defaultModel;
  let trimmed = val.trim();

  // Reject API key values accidentally passed in place of model names
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (trimmed.startsWith('AIza') || (apiKey && trimmed === apiKey)) {
    return defaultModel;
  }

  // Extract model name if prepended with environment variable name (e.g. "GEMINI_TEXT_MODEL gemini-3.6-flash")
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    const candidate = parts[parts.length - 1];
    if (candidate.startsWith('gemini-') || candidate.startsWith('imagen-') || candidate.startsWith('veo-') || candidate.startsWith('lyria-') || candidate.startsWith('@cf/')) {
      return candidate;
    }
    return defaultModel;
  }

  if (
    !trimmed.startsWith('gemini-') &&
    !trimmed.startsWith('imagen-') &&
    !trimmed.startsWith('veo-') &&
    !trimmed.startsWith('lyria-') &&
    !trimmed.startsWith('@cf/')
  ) {
    return defaultModel;
  }

  return trimmed;
}
