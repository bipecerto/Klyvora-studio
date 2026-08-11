const CHUNK_MAX_CHARS = 200;

function splitIntoChunks(text: string, maxChars = CHUNK_MAX_CHARS): string[] {
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    const combined = `${current} ${sentence}`.trim();
    if (combined.length > maxChars) {
      if (current) chunks.push(current.trim());
      if (sentence.length > maxChars) {
        let remaining = sentence;
        while (remaining.length > maxChars) {
          let cut = remaining.lastIndexOf(' ', maxChars);
          if (cut <= 0) cut = maxChars;
          chunks.push(remaining.slice(0, cut).trim());
          remaining = remaining.slice(cut).trim();
        }
        current = remaining;
      } else {
        current = sentence;
      }
    } else {
      current = combined;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function languageCode(language?: string): string {
  const value = String(language || '').toLowerCase();
  if (value.includes('portug') || value.includes('pt') || value.includes('br')) return 'pt-BR';
  if (value.includes('span') || value.includes('espa') || value === 'es') return 'es';
  if (value.includes('fren') || value.includes('fran') || value === 'fr') return 'fr';
  if (value.includes('germ') || value.includes('alem') || value === 'de') return 'de';
  return 'en';
}

async function fetchChunkAudio(chunk: string, tl: string): Promise<ArrayBuffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  });
  if (!response.ok) throw new Error(`Falha ao gerar áudio de um trecho (HTTP ${response.status}).`);
  return response.arrayBuffer();
}

export async function synthesizeFreeTts(text: string, language?: string): Promise<Buffer> {
  if (!text || typeof text !== 'string') throw new Error('Texto ausente para narração.');
  const chunks = splitIntoChunks(text);
  if (!chunks.length) throw new Error('Nada para narrar.');
  if (chunks.length > 400) throw new Error('Roteiro longo demais para a narração gratuita desta versão beta.');

  const tl = languageCode(language);
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const audio = await fetchChunkAudio(chunk, tl);
    buffers.push(Buffer.from(audio));
  }
  return Buffer.concat(buffers);
}

export function voicePreviewText(language?: string): string {
  const tl = languageCode(language);
  if (tl === 'pt-BR') return 'Algumas histórias são esquecidas. Outras simplesmente se recusam a desaparecer.';
  if (tl === 'es') return 'Algunas historias son olvidadas. Otras simplemente se niegan a desaparecer.';
  if (tl === 'fr') return "Certaines histoires sont oubliées. D'autres refusent simplement de disparaître.";
  if (tl === 'de') return 'Manche Geschichten werden vergessen. Andere weigern sich einfach zu verschwinden.';
  return 'Some stories are forgotten. Others simply refuse to disappear.';
}
