import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';
import { convertPcmToWav, sanitizeModelName } from '../../server/services/apiHelpers';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {}

    const { voice = 'Charon', language = 'English' } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server.' }),
      };
    }

    const langLower = String(language).toLowerCase();
    let sampleText = 'Some machines are forgotten. Others simply refuse to disappear.';
    if (langLower.includes('portug') || langLower.includes('pt') || langLower.includes('br')) {
      sampleText = 'Algumas máquinas são esquecidas. Outras simplesmente se recusam a desaparecer.';
    } else if (langLower.includes('span') || langLower.includes('es')) {
      sampleText = 'Algunas máquinas son olvidadas. Otras simplemente se niegan a desaparecer.';
    } else if (langLower.includes('germ') || langLower.includes('de')) {
      sampleText = 'Manche Maschinen werden vergessen. Andere weigern sich einfach zu verschwinden.';
    } else if (langLower.includes('fren') || langLower.includes('fr')) {
      sampleText = 'Certaines machines sont oubliées. D\'autres refusent simplement de disparaître.';
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const modelName = sanitizeModelName(process.env.GEMINI_TTS_MODEL, 'gemini-3.1-flash-tts-preview');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: sampleText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice || 'Charon',
            },
          },
        },
      },
    });

    let audioBase64 = '';
    let mimeType = 'audio/wav';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }
    }

    if (!audioBase64) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Gemini TTS did not return audio data.' }),
      };
    }

    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    if (rateMatch && rateMatch[1]) {
      sampleRate = parseInt(rateMatch[1], 10);
    }

    const rawBuffer = Buffer.from(audioBase64, 'base64');
    const wavBuffer = convertPcmToWav(rawBuffer, sampleRate, 1, 16);
    const finalBase64 = wavBuffer.toString('base64');
    const dataUrl = `data:audio/wav;base64,${finalBase64}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        voice,
        mimeType: 'audio/wav',
        audioBase64: finalBase64,
        audioUrl: dataUrl,
      }),
    };
  } catch (err: any) {
    console.error('Error in preview-voice Netlify function:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Voice preview generation failed.' }),
    };
  }
};
