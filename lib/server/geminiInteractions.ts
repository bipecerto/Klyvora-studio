export interface ScriptScene {
  scene_order: number;
  text: string;
  visual_prompt: string;
  duration: number;
}

export interface StudioScriptPayload {
  topic: string;
  title: string;
  script: string;
  scenes: ScriptScene[];
}

export interface ScriptGenerationInput {
  seriesName?: string;
  niche?: string;
  description?: string;
  language?: string;
  durationSec?: number;
  platforms?: string | string[];
  contentStyle?: string;
  tone?: string;
  visualStyle?: string;
  specifiedTopic?: string;
  autoTopic?: boolean;
}

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    title: { type: 'string' },
    script: { type: 'string' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scene_order: { type: 'integer' },
          text: { type: 'string' },
          visual_prompt: { type: 'string' },
          duration: { type: 'number' },
        },
        required: ['scene_order', 'text', 'visual_prompt', 'duration'],
        additionalProperties: false,
      },
    },
  },
  required: ['topic', 'title', 'script', 'scenes'],
  additionalProperties: false,
};

function extractGeminiError(payload: any): string {
  return payload?.error?.message || payload?.message || payload?.error?.status || payload?.status || 'sem detalhes';
}

function getModelText(data: any): string {
  const modelStep = Array.isArray(data?.steps)
    ? data.steps.find((step: any) => step?.type === 'model_output')
    : null;
  const textContent = Array.isArray(modelStep?.content)
    ? modelStep.content.find((item: any) => item?.type === 'text')
    : null;
  if (typeof textContent?.text === 'string') return textContent.text.trim();

  // Defensive compatibility for older responses.
  if (Array.isArray(data?.outputs)) {
    const output = data.outputs.find((item: any) => item?.type === 'text' && typeof item?.text === 'string');
    if (output?.text) return output.text.trim();
  }

  return '';
}

function normalizeDuration(value: unknown, fallback = 60): number {
  const parsed = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeModelName(val: string | undefined, defaultModel: string): string {
  if (!val || typeof val !== 'string') return defaultModel;
  let trimmed = val.trim();

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (trimmed.startsWith('AIza') || (apiKey && trimmed === apiKey)) {
    return defaultModel;
  }

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

export async function generateStudioScript(input: ScriptGenerationInput): Promise<StudioScriptPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }

  const rawModel = process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL;
  const model = sanitizeModelName(rawModel, 'gemini-3.6-flash');
  const seriesName = input.seriesName || 'Klyvora Series';
  const niche = input.niche || 'General';
  const description = input.description || '';
  const language = input.language || 'Português do Brasil';
  const durationSec = normalizeDuration(input.durationSec, 60);
  const platforms = Array.isArray(input.platforms) ? input.platforms.join(', ') : (input.platforms || 'YouTube, Shorts, Reels');
  const contentStyle = input.contentStyle || 'Documentary';
  const tone = input.tone || 'Informative';
  const visualStyle = input.visualStyle || 'Cinematic';
  const specifiedTopic = (input.specifiedTopic || '').trim();

  const targetWords = Math.max(45, Math.round(durationSec * 2.35));
  const targetScenes = Math.max(5, Math.min(24, Math.round(durationSec / 5)));

  const systemInstruction =
    `Você é o motor de roteiros do Klyvora. Crie roteiros naturais, envolventes e fáceis de narrar. ` +
    `Responda rigorosamente no JSON solicitado. A narração deve estar no idioma ${language}. ` +
    `Os prompts visuais devem ser escritos em inglês, sem texto na imagem, sem logos e sem marcas d'água.`;

  const topicDirective = input.autoTopic || !specifiedTopic
    ? 'Escolha um tema específico, forte e interessante que combine com a série.'
    : `Use este tema como base: "${specifiedTopic}".`;

  const prompt = `SERIES CONTEXT:\n- Name: ${seriesName}\n- Niche: ${niche}\n- Description: ${description}\n- Language: ${language}\n- Target duration: ${durationSec} seconds\n- Platforms: ${platforms}\n- Content style: ${contentStyle}\n- Tone: ${tone}\n- Visual style: ${visualStyle}\n\nTOPIC:\n${topicDirective}\n\nCreate:\n1. topic: specific subject/title idea.\n2. title: compelling video title.\n3. script: voiceover only, approximately ${targetWords} words, with a strong hook, development and payoff. Do not write scene labels or production notes inside the script.\n4. scenes: approximately ${targetScenes} sequential scenes. Each scene must include the exact narration excerpt spoken in that scene, a detailed English visual_prompt, and duration in seconds. Scene durations should approximately total ${durationSec} seconds. Keep visual continuity between scenes.`;

  let response: Response;
  try {
    response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        system_instruction: systemInstruction,
        store: false,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new Error('Não foi possível contatar a API do Gemini.');
  }

  const responseText = await response.text().catch(() => '');
  let data: any = null;
  if (responseText) {
    try { data = JSON.parse(responseText); } catch { data = null; }
  }

  if (!response.ok) {
    throw new Error(`Erro na API do Gemini (HTTP ${response.status}). Detalhes: ${data ? extractGeminiError(data) : responseText || 'sem detalhes'}`);
  }
  if (!data) throw new Error('A API do Gemini retornou uma resposta vazia ou inválida.');
  if (data.status === 'failed') throw new Error(`A geração do roteiro falhou: ${extractGeminiError(data)}`);

  const raw = getModelText(data);
  if (!raw) throw new Error('A IA não retornou o texto estruturado do roteiro.');

  let parsed: StudioScriptPayload;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Falha ao interpretar o JSON do roteiro retornado pela IA.');
  }

  if (!parsed?.topic || !parsed?.title || !parsed?.script || !Array.isArray(parsed?.scenes) || parsed.scenes.length === 0) {
    throw new Error('A IA retornou um roteiro incompleto.');
  }

  parsed.scenes = parsed.scenes.map((scene, index) => ({
    scene_order: Number.isFinite(Number(scene.scene_order)) ? Number(scene.scene_order) : index + 1,
    text: String(scene.text || '').trim(),
    visual_prompt: String(scene.visual_prompt || '').trim(),
    duration: Math.max(1, Number(scene.duration) || durationSec / parsed.scenes.length),
  })).filter((scene) => scene.text && scene.visual_prompt);

  if (!parsed.scenes.length) throw new Error('A IA não retornou cenas válidas.');
  return parsed;
}
