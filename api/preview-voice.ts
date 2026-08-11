import { synthesizeFreeTts, voicePreviewText } from '../server-lib/freeTts';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body: any = await request.json().catch(() => ({}));
    const language = body.language || 'Português do Brasil';
    const audio = await synthesizeFreeTts(voicePreviewText(language), language);
    const audioBase64 = audio.toString('base64');
    return Response.json({
      success: true,
      voice: body.voice || 'beta-free',
      provider: 'google-translate-tts-beta',
      mimeType: 'audio/mpeg',
      audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Falha ao gerar prévia da voz.' }, { status: 500 });
  }
}
