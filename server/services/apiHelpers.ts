import { GoogleGenAI } from '@google/genai';

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
 * Sanitizes model name string to ensure it is a valid Gemini/Imagen model identifier.
 */
export function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !trimmed.includes('placeholder.supabase.co');
}

/**
 * Sanitizes model name string to ensure it is a valid Gemini/Imagen model identifier.
 */
export function sanitizeModelName(val: string | undefined, defaultModel: string): string {
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
    if (candidate.startsWith('gemini-') || candidate.startsWith('imagen-') || candidate.startsWith('veo-') || candidate.startsWith('lyria-')) {
      return candidate;
    }
    return defaultModel;
  }

  if (
    !trimmed.startsWith('gemini-') &&
    !trimmed.startsWith('imagen-') &&
    !trimmed.startsWith('veo-') &&
    !trimmed.startsWith('lyria-')
  ) {
    return defaultModel;
  }

  return trimmed;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates image using Gemini API with model fallbacks and 429 retry backoff.
 */
export async function generateGeminiSceneImage(
  prompt: string,
  maxRetries = 2,
  aspectRatio: '9:16' | '16:9' = '9:16'
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing on the server.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const rawEnvModel = process.env.GEMINI_IMAGE_MODEL;
  const candidateModels = Array.from(
    new Set(
      [
        rawEnvModel ? sanitizeModelName(rawEnvModel, 'imagen-3.0-generate-002') : null,
        'imagen-3.0-generate-002',
        'imagen-3.0-fast-generate-001',
        'gemini-3.1-flash-image',
      ].filter((m): m is string => Boolean(m))
    )
  );

  let lastError: any = null;

  for (const modelName of candidateModels) {
    console.log(`[Gemini Image] Attempting image generation (${aspectRatio}) with model: ${modelName}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (modelName.startsWith('imagen-')) {
          const response = await ai.models.generateImages({
            model: modelName,
            prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio,
            },
          });

          if (response?.generatedImages && response.generatedImages.length > 0) {
            const genImg = response.generatedImages[0];
            const base64Data = genImg.image?.imageBytes || (genImg.image as any)?.bytesBase64Encoded;
            if (base64Data) {
              return { base64: base64Data, mimeType: 'image/png' };
            }
          }
          throw new Error(`Model ${modelName} returned no image bytes.`);
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            imageConfig: {
              aspectRatio,
              imageSize: '1K',
            },
          },
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

        throw new Error(`No image part returned from model ${modelName}`);
      } catch (err: any) {
        const errStr = typeof err === 'string' ? err : JSON.stringify(err) || err?.message || String(err);
        const errMessage = err?.message || err?.error?.message || 'Image generation unavailable';
        lastError = new Error(errMessage);

        const isQuotaExceeded = errStr.includes('Quota exceeded') || errStr.includes('limit: 0') || errStr.includes('RESOURCE_EXHAUSTED');
        const is429 = errStr.includes('429') || isQuotaExceeded;

        if (isQuotaExceeded) {
          console.log(`[Gemini Image] Model ${modelName} quota limit reached. Trying next candidate model...`);
          break; // Break retry loop for this model and try next model immediately
        }

        if (is429 && attempt < maxRetries) {
          console.log(`[Gemini Image] Rate limit on ${modelName} (attempt ${attempt}). Retrying in 2s...`);
          await delay(2000);
          continue;
        }

        // Other errors or exhausted retries for this model -> try next candidate model
        break;
      }
    }
  }

  throw lastError || new Error('Image generation quota exceeded. Switching to stock media fallback.');
}

/**
 * Builds enriched visual prompt enforcing aspect ratio and visual style.
 */
export function buildEnrichedVisualPrompt(scenePrompt: string | null, seriesRecord: any, isLongForm = false): string {
  const basePrompt = scenePrompt || 'A dramatic scene for a visual story';
  const visualStyle = (seriesRecord?.visual_style || '').toLowerCase();
  const niche = seriesRecord?.niche || '';
  const description = seriesRecord?.description || '';
  const ratioText = isLongForm ? '16:9 horizontal landscape composition' : '9:16 vertical composition';

  let styleInstruction = `clean realistic photography, natural lighting, ${ratioText}`;
  if (visualStyle.includes('cinematic')) {
    styleInstruction = `cinematic photography, realistic lighting, natural depth of field, professional documentary composition, ${ratioText}`;
  } else if (visualStyle.includes('realist') || visualStyle.includes('realistic')) {
    styleInstruction = `hyper-realistic photography, high detail, natural color balance, crisp focus, ${ratioText}`;
  } else if (visualStyle.includes('documentary') || visualStyle.includes('documentário')) {
    styleInstruction = `documentary style, authentic atmosphere, natural lighting, candid shot, ${ratioText}`;
  } else if (visualStyle.includes('vintage') || visualStyle.includes('retro')) {
    styleInstruction = `vintage film look, subtle grain, warm nostalgic tones, retro photography, ${ratioText}`;
  } else if (visualStyle.includes('dark') || visualStyle.includes('sombrio')) {
    styleInstruction = `moody dark aesthetic, dramatic contrast, deep shadows, atmospheric lighting, ${ratioText}`;
  } else if (visualStyle.includes('modern') || visualStyle.includes('moderno')) {
    styleInstruction = `modern sleek visual style, vibrant clean colors, ${ratioText}`;
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

  const negativeInstruction = `No text, No subtitles, No captions, No logos, No watermarks, No UI elements. ${ratioText}.`;

  return `${basePrompt}. Style: ${styleInstruction}.${automotiveInstruction} Context: ${niche} ${description}. ${negativeInstruction}`;
}
