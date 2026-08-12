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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

function extractGroqError(payload: any): string {
  return payload?.error?.message || payload?.message || payload?.error?.type || 'sem detalhes';
}

function normalizeDuration(value: unknown, fallback = 60): number {
  const parsed = typeof value === 'string' ? Number(value.replace(/[^0-9.]/g, '')) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function generateStudioScript(input: ScriptGenerationInput): Promise<StudioScriptPayload> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada no servidor.');
  }

  const model = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
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

  // Vídeo longo de YouTube: ritmo de narração ~150 palavras/minuto, e uma
  // imagem nova a cada ~25s (em vez do ritmo de shorts, de poucos segundos).
  const targetWords = Math.max(120, Math.round((durationSec / 60) * 150));
  const targetScenes = Math.max(8, Math.min(80, Math.round(durationSec / 25)));

  const systemInstruction =
    `Você é o motor de roteiros do Klyvora. Crie roteiros naturais, envolventes e fáceis de narrar. ` +
    `Responda APENAS com um objeto JSON válido, sem markdown, sem texto fora do JSON, seguindo exatamente este schema:\n` +
    `${JSON.stringify(RESPONSE_SCHEMA)}\n` +
    `A narração (campo "script" e "text" de cada cena) deve estar no idioma ${language}. ` +
    `Os prompts visuais (campo "visual_prompt") devem ser escritos em inglês, sem texto na imagem, sem logos e sem marcas d'água.`;

  const topicDirective = input.autoTopic || !specifiedTopic
    ? 'Escolha um tema específico, forte e interessante que combine com a série.'
    : `Use este tema como base: "${specifiedTopic}".`;

  const prompt = `SERIES CONTEXT:\n- Name: ${seriesName}\n- Niche: ${niche}\n- Description: ${description}\n- Language: ${language}\n- Target duration: ${durationSec} seconds\n- Platforms: ${platforms}\n- Content style: ${contentStyle}\n- Tone: ${tone}\n- Visual style: ${visualStyle}\n\nTOPIC:\n${topicDirective}\n\nCreate:\n1. topic: specific subject/title idea.\n2. title: compelling video title.\n3. script: voiceover only, approximately ${targetWords} words, with a strong hook, development and payoff. Do not write scene labels or production notes inside the script.\n4. scenes: approximately ${targetScenes} sequential scenes. Each scene must include the exact narration excerpt spoken in that scene, a detailed English visual_prompt, and duration in seconds. Scene durations should approximately total ${durationSec} seconds. Keep visual continuity between scenes.\n\nResponda em JSON.`;

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });
  } catch {
    throw new Error('Não foi possível contatar a API do Groq.');
  }

  const responseText = await response.text().catch(() => '');
  let data: any = null;
  if (responseText) {
    try { data = JSON.parse(responseText); } catch { data = null; }
  }

  if (!response.ok) {
    throw new Error(`Erro na API do Groq (HTTP ${response.status}). Detalhes: ${data ? extractGroqError(data) : responseText || 'sem detalhes'}`);
  }
  if (!data) throw new Error('A API do Groq retornou uma resposta vazia ou inválida.');

  const raw = data?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== 'string') throw new Error('A IA não retornou o texto estruturado do roteiro.');

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
