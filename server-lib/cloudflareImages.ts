export interface GeneratedImage {
  base64: string;
  mimeType: string;
  provider: 'cloudflare-workers-ai';
  model: string;
}

const DEFAULT_MODEL = '@cf/black-forest-labs/flux-1-schnell';

export async function generateCloudflareImage(prompt: string): Promise<GeneratedImage> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_MODEL;

  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID não configurado no servidor.');
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN não configurado no servidor.');

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 2048),
      steps: 4,
      seed: Math.floor(Math.random() * 2147483647),
    }),
  });

  const payload: any = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const detail = payload?.errors?.[0]?.message || payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudflare Workers AI: ${detail}`);
  }

  const base64 = payload?.result?.image || payload?.image;
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Cloudflare Workers AI não retornou a imagem esperada.');
  }

  return { base64, mimeType: 'image/jpeg', provider: 'cloudflare-workers-ai', model };
}

export function buildEnrichedVisualPrompt(scenePrompt: string | null | undefined, seriesRecord?: any): string {
  const basePrompt = scenePrompt || 'A dramatic cinematic scene for a vertical faceless video';
  const visualStyle = String(seriesRecord?.visual_style || 'Cinematic').toLowerCase();
  const niche = seriesRecord?.niche || '';
  const description = seriesRecord?.description || '';

  let styleInstruction = 'cinematic realistic photography, natural lighting, strong visual storytelling';
  if (visualStyle.includes('realist')) styleInstruction = 'hyper-realistic photography, high detail, natural color balance, crisp focus';
  else if (visualStyle.includes('document')) styleInstruction = 'documentary photography, authentic atmosphere, natural lighting, candid composition';
  else if (visualStyle.includes('vintage') || visualStyle.includes('retro')) styleInstruction = 'vintage film look, subtle grain, period-correct details, nostalgic tones';
  else if (visualStyle.includes('dark') || visualStyle.includes('sombr')) styleInstruction = 'dark cinematic aesthetic, dramatic contrast, deep shadows, atmospheric lighting';
  else if (visualStyle.includes('modern')) styleInstruction = 'modern cinematic visual style, clean composition, crisp detail';

  const negative = 'No text, no subtitles, no captions, no logos, no watermarks, no UI elements. Keep the main subject centered with safe crop space for 9:16 vertical framing.';
  return `${basePrompt}. Style: ${styleInstruction}. Context: ${niche}. ${description}. ${negative}`.slice(0, 2048);
}
