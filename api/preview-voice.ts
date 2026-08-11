import { synthesizeFreeTts, voicePreviewText } from '../server-lib/freeTts';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { voice = 'Charon', language = 'Português do Brasil' } = req.body || {};
    const sampleText = voicePreviewText(language);
    const audioBuffer = await synthesizeFreeTts(sampleText, language);
    const audioBase64 = audioBuffer.toString('base64');

    return res.status(200).json({
      success: true,
      voice,
      provider: 'klyvora-tts',
      mimeType: 'audio/mpeg',
      audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
    });

  } catch (err: any) {
    console.error('Error in /api/preview-voice:', err);
    return res.status(500).json({ error: err.message || 'Falha ao gerar preview de voz.' });
  }
}
